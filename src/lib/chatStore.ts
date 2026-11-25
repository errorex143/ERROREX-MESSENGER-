import { Conversation, ChatMessage, ContactItem, PrivacySettings, UserProfile } from '../types';
import { supabase, isSupabaseConfigured, initSupabaseRuntime } from './supabase';
import {
  generateUUID,
  isLegacyTestAccount,
  isUserCurrentlyOnline,
  upsertSupabaseConversation,
  fetchSupabaseConversations,
  fetchSupabaseConversationById,
  deleteSupabaseConversation,
  upsertSupabaseMessage,
  fetchSupabaseMessages
} from './supabaseSync';

const CONVERSATIONS_STORAGE_KEY = 'errorex_conversations_v5';
const MESSAGES_STORAGE_KEY_PREFIX = 'errorex_messages_v5_';
const CONTACTS_STORAGE_KEY = 'errorex_contacts_v5';
const PRIVACY_STORAGE_KEY = 'errorex_privacy_v5';
const PROFILE_STORAGE_KEY = 'errorex_profile_v5';
const LOCAL_READ_AT_STORAGE_KEY = 'errorex_local_read_at_v5';

// Purge legacy mock data / test users on startup for a 100% fresh app
try {
  const legacyKeys = [
    'errorex_conversations_v4',
    'errorex_contacts_v4',
    'errorex_messages_v4_conv_test_user',
    'errorex_messages_v4_conv_vault',
    'errorex_session'
  ];
  legacyKeys.forEach(k => localStorage.removeItem(k));
} catch {
  // quiet
}

const initialContacts: ContactItem[] = [];
const initialMessages: Record<string, ChatMessage[]> = {};

type Listener = () => void;
const listeners: Listener[] = [];

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch {
      // quiet
    }
  });
}

let chatRealtimeChannel: any = null;
let chatRealtimeUid: string | null = null;
let chatPollTimer: any = null;
let activeHydratePromise: Promise<void> | null = null;

function getLocalReadAtMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_READ_AT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalReadAt(conversationId: string, iso: string) {
  try {
    const map = getLocalReadAtMap();
    map[conversationId] = iso;
    localStorage.setItem(LOCAL_READ_AT_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quiet
  }
}

function computeUnreadCountForUser(messages: ChatMessage[], uid: string, conversationId?: string): number {
  if (!uid) return 0;
  const readAtIso = conversationId ? getLocalReadAtMap()[conversationId] : undefined;
  const readAtMs = readAtIso ? new Date(readAtIso).getTime() : 0;

  return messages.filter(m => {
    if (m.senderId === uid || m.senderId === 'system') return false;
    if (m.isDeleted || m.deletedFor?.includes(uid)) return false;
    if (Array.isArray(m.readBy) && m.readBy.includes(uid)) return false;
    if (readAtMs && new Date(m.createdAt).getTime() <= readAtMs) return false;
    return true;
  }).length;
}

export const chatStore = {
  subscribe(fn: Listener) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  stopRealtime() {
    if (chatRealtimeChannel && supabase) {
      try {
        supabase.removeChannel(chatRealtimeChannel);
      } catch {
        // ignore
      }
    }
    chatRealtimeChannel = null;
    chatRealtimeUid = null;
    if (chatPollTimer) {
      clearInterval(chatPollTimer);
      chatPollTimer = null;
    }
  },

  mergeRemoteMessages(conversationId: string, remoteMsgs: ChatMessage[], currentUid?: string) {
    const localMsgs = this.getMessages(conversationId);
    const msgMap = new Map<string, ChatMessage>();
    localMsgs.forEach(m => msgMap.set(m.id, m));

    const toMarkDelivered: ChatMessage[] = [];
    const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    remoteMsgs.forEach(rm => {
      const prev = msgMap.get(rm.id);
      const mergedMsg: ChatMessage = prev
        ? {
            ...prev,
            ...rm,
            readBy: Array.from(new Set([...(prev.readBy || []), ...(rm.readBy || [])])),
            deliveryStatus:
              rm.deliveryStatus === 'read' || prev.deliveryStatus === 'read'
                ? 'read'
                : rm.deliveryStatus === 'delivered' || prev.deliveryStatus === 'delivered'
                ? 'delivered'
                : rm.deliveryStatus || prev.deliveryStatus || 'sent'
          }
        : rm;

      // If this client is the recipient and online, upgrade 'sent' -> 'delivered' so sender gets double grey ticks
      if (
        currentUid &&
        browserOnline &&
        mergedMsg.senderId !== currentUid &&
        mergedMsg.senderId !== 'system' &&
        mergedMsg.deliveryStatus === 'sent'
      ) {
        mergedMsg.deliveryStatus = 'delivered';
        toMarkDelivered.push(mergedMsg);
      }

      msgMap.set(rm.id, mergedMsg);
    });

    const sorted = Array.from(msgMap.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    this.saveMessages(conversationId, sorted);

    // Update parent conversation summary & unread count for currentUid
    if (sorted.length > 0 && currentUid) {
      const last = sorted[sorted.length - 1];
      const allConvs = this.getAllConversations();
      const idx = allConvs.findIndex(c => c.id === conversationId);
      if (idx !== -1) {
        const conv = allConvs[idx];
        const preview =
          last.isDeleted || last.deletedForEveryone
            ? '🚫 This message was deleted'
            : last.mediaType === 'image'
            ? '📷 Photo'
            : last.mediaType === 'audio'
            ? '🎤 Voice Memo'
            : last.text;
        conv.lastMessageText = preview;
        conv.lastMessageSenderId = last.senderId;
        conv.lastMessageAt = last.createdAt;
        conv.unreadCount = conv.isBlocked ? 0 : computeUnreadCountForUser(sorted, currentUid, conversationId);
        allConvs[idx] = conv;
        this.saveConversations(allConvs);
      }
    }

    if (toMarkDelivered.length > 0) {
      toMarkDelivered.forEach(m => {
        upsertSupabaseMessage(m).catch(() => {});
      });
    }
  },

  mergeRemoteConversations(remoteConvs: Conversation[], currentUid: string) {
    const localConvs = this.getAllConversations();
    const convMap = new Map<string, Conversation>();
    localConvs.forEach(c => convMap.set(c.id, c));

    remoteConvs.forEach(rc => {
      const prev = convMap.get(rc.id);
      const localMsgs = this.getMessages(rc.id);
      const localReadAtIso = getLocalReadAtMap()[rc.id];
      const localReadAtMs = localReadAtIso ? new Date(localReadAtIso).getTime() : 0;
      const lastMsgMs = rc.lastMessageAt ? new Date(rc.lastMessageAt).getTime() : 0;

      const computedUnread = prev?.isBlocked
        ? 0
        : localMsgs.length > 0
        ? computeUnreadCountForUser(localMsgs, currentUid, rc.id)
        : rc.lastMessageSenderId &&
          rc.lastMessageSenderId !== currentUid &&
          rc.lastMessageSenderId !== 'system' &&
          (!localReadAtMs || lastMsgMs > localReadAtMs)
        ? Math.max(prev?.unreadCount || 0, 1)
        : 0;

      convMap.set(rc.id, {
        ...(prev || {}),
        ...rc,
        // Preserve per-device user preferences
        isPinned: prev?.isPinned ?? rc.isPinned,
        isMuted: prev?.isMuted ?? rc.isMuted,
        isArchived: prev?.isArchived ?? rc.isArchived,
        isBlocked: prev?.isBlocked ?? rc.isBlocked,
        unreadCount: computedUnread
      });
    });

    this.saveConversations(Array.from(convMap.values()));
  },

  async pullRemoteChats(uid: string) {
    if (!isSupabaseConfigured || !supabase || !uid) return;
    if (activeHydratePromise) return activeHydratePromise;

    activeHydratePromise = (async () => {
      try {
        const remoteConvs = await fetchSupabaseConversations(uid);
        if (remoteConvs.length > 0) {
          this.mergeRemoteConversations(remoteConvs, uid);

          await Promise.all(
            remoteConvs.map(async rc => {
              const remoteMsgs = await fetchSupabaseMessages(rc.id);
              if (remoteMsgs.length > 0) {
                this.mergeRemoteMessages(rc.id, remoteMsgs, uid);
              }
            })
          );
        }
      } catch (err) {
        console.warn('[ChatStore] Supabase hydrate notice:', err);
      }
    })();

    try {
      await activeHydratePromise;
    } finally {
      activeHydratePromise = null;
    }
  },

  // --- Supabase Cloud Hydration & Realtime Sync ---
  async hydrateFromSupabase(uid: string) {
    if (!uid) return;
    await initSupabaseRuntime();
    if (!isSupabaseConfigured || !supabase) return;

    await this.pullRemoteChats(uid);

    // Subscribe to realtime messages & conversations once per UID
    if (chatRealtimeUid !== uid) {
      if (chatRealtimeChannel) {
        try {
          supabase.removeChannel(chatRealtimeChannel);
        } catch {
          // ignore
        }
      }
      if (chatPollTimer) {
        clearInterval(chatPollTimer);
        chatPollTimer = null;
      }

      chatRealtimeUid = uid;
      try {
        chatRealtimeChannel = supabase
          .channel(`errorex_chat_${uid}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, async payload => {
            if (payload.eventType === 'DELETE') {
              const oldId = (payload.old as any)?.id;
              if (oldId) {
                const filtered = this.getAllConversations().filter(c => c.id !== oldId);
                this.saveConversations(filtered);
              }
              return;
            }
            const remoteConvs = await fetchSupabaseConversations(uid);
            if (remoteConvs.length > 0) {
              this.mergeRemoteConversations(remoteConvs, uid);
              // Pull messages for any conversation that has 0 messages locally
              for (const rc of remoteConvs) {
                if (this.getMessages(rc.id).length === 0) {
                  const remoteMsgs = await fetchSupabaseMessages(rc.id);
                  if (remoteMsgs.length > 0) {
                    this.mergeRemoteMessages(rc.id, remoteMsgs, uid);
                  }
                }
              }
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async payload => {
            const row = (payload.new || payload.old) as any;
            if (!row?.conversation_id) return;

            let myConvs = this.getConversations(uid);
            if (!myConvs.some(c => c.id === row.conversation_id)) {
              // Brand-new conversation might have just been created on another device!
              const newConv = await fetchSupabaseConversationById(row.conversation_id);
              if (!newConv || !Array.isArray(newConv.participants) || !newConv.participants.includes(uid)) {
                return;
              }
              this.mergeRemoteConversations([newConv], uid);
              myConvs = this.getConversations(uid);
            }

            const targetConv = myConvs.find(c => c.id === row.conversation_id);
            if (targetConv?.isBlocked && row.sender_id !== uid) {
              return;
            }

            const remoteMsgs = await fetchSupabaseMessages(row.conversation_id);
            if (remoteMsgs.length > 0) {
              this.mergeRemoteMessages(row.conversation_id, remoteMsgs, uid);
            }
          })
          .subscribe();
      } catch {
        // quiet
      }

      // Gentle 5s fallback refresh while browser is visible & online
      chatPollTimer = setInterval(() => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        this.pullRemoteChats(uid).catch(() => {});
      }, 5000);
    }
  },

  // --- Conversations ---
  getAllConversations(): Conversation[] {
    try {
      const saved = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not read saved conversations:', e);
    }
    return [];
  },

  // STRICT PRIVATE ISOLATION: A user ONLY sees conversations where they are a participant
  getConversations(forUserId?: string): Conversation[] {
    const all = this.getAllConversations();
    if (!forUserId) {
      return all;
    }
    return all.filter(c => Array.isArray(c.participants) && c.participants.includes(forUserId));
  },

  saveConversations(conversations: Conversation[]) {
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
    notifyListeners();
  },

  // --- Messages ---
  getMessages(conversationId: string): ChatMessage[] {
    try {
      const key = MESSAGES_STORAGE_KEY_PREFIX + conversationId;
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not read messages:', e);
    }

    const def = initialMessages[conversationId] || [];
    localStorage.setItem(MESSAGES_STORAGE_KEY_PREFIX + conversationId, JSON.stringify(def));
    return def;
  },

  saveMessages(conversationId: string, messages: ChatMessage[]) {
    localStorage.setItem(MESSAGES_STORAGE_KEY_PREFIX + conversationId, JSON.stringify(messages));
    notifyListeners();
  },

  sendMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    text: string,
    mediaUrl?: string,
    mediaType: 'none' | 'image' | 'video' | 'file' | 'audio' = 'none',
    replyTo?: { id: string; text: string }
  ): ChatMessage {
    const messages = this.getMessages(conversationId);
    const nowIso = new Date().toISOString();

    const convs = this.getAllConversations();
    const targetConv = convs.find(c => c.id === conversationId);

    if (targetConv?.isBlocked && senderId !== 'system') {
      console.warn('Blocked conversation: message cannot be sent or received.');
      return {
        id: generateUUID(),
        conversationId,
        senderId,
        senderName,
        text: '🚫 Message blocked: You have blocked this user.',
        deliveryStatus: 'sent',
        createdAt: nowIso
      };
    }

    const otherParticipantId = targetConv?.participants.find(p => p !== senderId);
    const contacts = this.getContacts();
    const otherUsername = targetConv?.participantDetails?.[otherParticipantId || '']?.username;
    const recipientContact = contacts.find(
      c => c.id === otherParticipantId || (otherUsername && c.username.toLowerCase() === otherUsername.toLowerCase())
    );

    let directoryProfiles: UserProfile[] = [];
    try {
      const rawProfiles = localStorage.getItem('errorex_standalone_db_userProfiles');
      if (rawProfiles) directoryProfiles = JSON.parse(rawProfiles);
    } catch {
      // quiet
    }
    const liveDirectoryUser = directoryProfiles.find(p => p.uid === otherParticipantId);
    const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    const isVaultOrLocalOnly =
      otherParticipantId === 'vault_secure' ||
      conversationId === 'conv_vault' ||
      (!liveDirectoryUser && Boolean(otherParticipantId?.startsWith('user_17')));

    const isRecipientOnline = !browserOnline
      ? false
      : targetConv?.isGroup
      ? true
      : otherParticipantId === 'vault_secure' || conversationId === 'conv_vault'
      ? true
      : liveDirectoryUser
      ? isUserCurrentlyOnline(liveDirectoryUser)
      : recipientContact
      ? recipientContact.isOnline !== false
      : false;

    const initialDeliveryStatus: 'sent' | 'delivered' | 'read' =
      senderId === 'system'
        ? 'read'
        : isRecipientOnline
        ? 'delivered'
        : 'sent';

    const newMsg: ChatMessage = {
      id: generateUUID(),
      conversationId,
      senderId,
      senderName,
      text,
      mediaUrl,
      mediaType,
      createdAt: nowIso,
      readBy: senderId === 'system' ? [] : [senderId],
      deliveryStatus: initialDeliveryStatus,
      ...(replyTo && {
        replyToMessageId: replyTo.id,
        replyToText: replyTo.text
      })
    };

    messages.push(newMsg);
    this.saveMessages(conversationId, messages);

    if (targetConv) {
      targetConv.lastMessageText =
        mediaType === 'image' ? '📷 Photo' : mediaType === 'audio' ? '🎤 Voice Memo' : text;
      targetConv.lastMessageSenderId = senderId;
      targetConv.lastMessageAt = nowIso;
      targetConv.updatedAt = nowIso;
      targetConv.unreadCount = 0;

      // Mirror sender's current display profile, bio & privacy settings inside participantDetails
      if (senderId !== 'system') {
        const myProfile = this.getUserProfile();
        const myPrivacy = this.getPrivacySettings();
        targetConv.participantDetails = {
          ...(targetConv.participantDetails || {}),
          [senderId]: {
            ...(targetConv.participantDetails?.[senderId] || {}),
            displayName: myProfile.displayName || senderName,
            username: myProfile.username || targetConv.participantDetails?.[senderId]?.username || 'user',
            photoURL: myProfile.photoURL ?? targetConv.participantDetails?.[senderId]?.photoURL ?? '',
            bio: myProfile.bio ?? targetConv.participantDetails?.[senderId]?.bio ?? 'Available on ERROREX',
            privacy: myPrivacy
          }
        };
      }

      this.saveConversations([...convs]);

      if (browserOnline) {
        // Sequential sync: upsert parent conversation first, then message!
        upsertSupabaseConversation(targetConv).then(() => {
          upsertSupabaseMessage(newMsg, targetConv);
        });
      }
    } else if (browserOnline) {
      upsertSupabaseMessage(newMsg);
    }

    // Only simulate instant read for Vault / non-cloud local placeholder chats;
    // real cloud members mark 'read' authentically via markAsRead -> Supabase Realtime!
    if (isRecipientOnline && isVaultOrLocalOnly && !isSupabaseConfigured) {
      setTimeout(() => {
        const currentMsgs = this.getMessages(conversationId);
        const targetMsg = currentMsgs.find(m => m.id === newMsg.id);
        if (targetMsg && targetMsg.deliveryStatus === 'delivered') {
          targetMsg.deliveryStatus = 'read';
          if (!targetMsg.readBy) targetMsg.readBy = [];
          if (otherParticipantId && !targetMsg.readBy.includes(otherParticipantId)) {
            targetMsg.readBy.push(otherParticipantId);
          }
          this.saveMessages(conversationId, currentMsgs);
          if (typeof navigator === 'undefined' || navigator.onLine) {
            upsertSupabaseMessage(targetMsg, targetConv);
          }
        }
      }, 1800);
    }

    return newMsg;
  },

  async syncPendingToSupabase(uid: string) {
    await initSupabaseRuntime();
    if (!isSupabaseConfigured || !uid) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const convs = this.getConversations(uid);
    for (const conv of convs) {
      await upsertSupabaseConversation(conv);
      const msgs = this.getMessages(conv.id);
      for (const m of msgs) {
        await upsertSupabaseMessage(m, conv);
      }
    }
  },

  markAsRead(conversationId: string, userId?: string) {
    const convs = this.getAllConversations();
    const conv = convs.find(c => c.id === conversationId);
    let convChanged = false;

    if (conv && (conv.unreadCount || 0) > 0) {
      conv.unreadCount = 0;
      convChanged = true;
    }

    const privacy = this.getPrivacySettings();
    const sendReadReceipt = privacy.readReceipts !== false;

    const messages = this.getMessages(conversationId);
    const latestIncoming = [...messages]
      .reverse()
      .find(m => m.senderId !== userId && m.senderId !== 'system');
    setLocalReadAt(conversationId, latestIncoming?.createdAt || new Date().toISOString());

    if (userId) {
      let msgsChanged = false;
      const toSync: ChatMessage[] = [];
      messages.forEach(m => {
        if (!m.readBy) m.readBy = [];

        if (sendReadReceipt) {
          const needsReadBy = !m.readBy.includes(userId);
          const needsReadStatus =
            m.senderId !== userId &&
            m.senderId !== 'system' &&
            m.deliveryStatus !== 'read';

          if (needsReadBy) {
            m.readBy.push(userId);
            msgsChanged = true;
          }
          if (needsReadStatus) {
            m.deliveryStatus = 'read';
            msgsChanged = true;
          }
          if ((needsReadBy || needsReadStatus) && m.senderId !== userId && m.senderId !== 'system') {
            toSync.push(m);
          }
        } else {
          // Read receipts OFF: never send 'read' or push viewer into readBy; only confirm 'delivered' if online
          const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
          if (
            browserOnline &&
            m.senderId !== userId &&
            m.senderId !== 'system' &&
            m.deliveryStatus === 'sent'
          ) {
            m.deliveryStatus = 'delivered';
            msgsChanged = true;
            toSync.push(m);
          }
        }
      });

      if (msgsChanged) {
        this.saveMessages(conversationId, messages);
      }
      if (toSync.length > 0 && (typeof navigator === 'undefined' || navigator.onLine)) {
        toSync.forEach(m => {
          upsertSupabaseMessage(m, conv).catch(() => {});
        });
      }
    }

    if (convChanged && conv) {
      this.saveConversations([...convs]);
    }
  },

  deleteMessage(conversationId: string, messageId: string) {
    this.deleteMessageForEveryone(conversationId, messageId);
  },

  deleteMessageForEveryone(conversationId: string, messageId: string) {
    const messages = this.getMessages(conversationId);
    const msg = messages.find(m => m.id === messageId);
    const convs = this.getAllConversations();
    const targetConv = convs.find(c => c.id === conversationId);

    if (msg) {
      msg.text = '🚫 This message was deleted';
      msg.isDeleted = true;
      msg.deletedForEveryone = true;
      msg.mediaUrl = undefined;
      msg.mediaType = 'none';
      this.saveMessages(conversationId, messages);
      upsertSupabaseMessage(msg, targetConv);

      if (targetConv && targetConv.lastMessageText) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.id === messageId) {
          targetConv.lastMessageText = '🚫 This message was deleted';
          this.saveConversations([...convs]);
          upsertSupabaseConversation(targetConv);
        }
      }
    }
  },

  deleteMessageForMe(conversationId: string, messageId: string, userId: string) {
    const messages = this.getMessages(conversationId);
    const msg = messages.find(m => m.id === messageId);
    const targetConv = this.getAllConversations().find(c => c.id === conversationId);
    if (msg) {
      if (!msg.deletedFor) msg.deletedFor = [];
      if (!msg.deletedFor.includes(userId)) {
        msg.deletedFor.push(userId);
      }
      this.saveMessages(conversationId, messages);
      upsertSupabaseMessage(msg, targetConv);
    }
  },

  clearMessages(conversationId: string) {
    this.saveMessages(conversationId, []);
    const currentConvs = this.getAllConversations();
    const conv = currentConvs.find(c => c.id === conversationId);
    if (conv) {
      conv.lastMessageText = 'Messages cleared';
      this.saveConversations([...currentConvs]);
      upsertSupabaseConversation(conv);
    }
  },

  editMessage(conversationId: string, messageId: string, newText: string) {
    const messages = this.getMessages(conversationId);
    const msg = messages.find(m => m.id === messageId);
    const targetConv = this.getAllConversations().find(c => c.id === conversationId);
    if (msg) {
      msg.text = newText;
      msg.isEdited = true;
      this.saveMessages(conversationId, messages);
      upsertSupabaseMessage(msg, targetConv);
    }
  },

  reactToMessage(conversationId: string, messageId: string, emoji: string, userId: string) {
    const messages = this.getMessages(conversationId);
    const msg = messages.find(m => m.id === messageId);
    const targetConv = this.getAllConversations().find(c => c.id === conversationId);
    if (msg) {
      msg.reactions = { ...(msg.reactions || {}), [userId]: emoji };
      this.saveMessages(conversationId, messages);
      upsertSupabaseMessage(msg, targetConv);
    }
  },

  createConversation(
    name: string,
    isGroup: boolean = false,
    customUsername?: string,
    customPhoto?: string,
    customBio?: string,
    creatorId?: string,
    creatorDetails?: { displayName: string; username: string; photoURL?: string },
    targetUid?: string
  ): Conversation {
    const allConvs = this.getAllConversations();
    const id = generateUUID();
    const nowIso = new Date().toISOString();
    const uName = customUsername || name.toLowerCase().replace(/\s+/g, '_');

    // Try resolving real targetUid from directoryProfiles if caller didn't pass one
    let resolvedTargetUid = targetUid;
    if (!resolvedTargetUid && uName) {
      try {
        const rawProfiles = localStorage.getItem('errorex_standalone_db_userProfiles');
        if (rawProfiles) {
          const profiles: UserProfile[] = JSON.parse(rawProfiles);
          const matched = profiles.find(
            p => p.uid !== creatorId && p.username?.toLowerCase() === uName.toLowerCase()
          );
          if (matched) resolvedTargetUid = matched.uid;
        }
      } catch {
        // quiet
      }
    }
    const contactUid = resolvedTargetUid || `user_${Date.now()}`;

    const myProfile = this.getUserProfile();
    const myPrivacy = this.getPrivacySettings();
    const myId = creatorId || myProfile.uid || 'current_user';
    const myDisplayName = creatorDetails?.displayName || myProfile.displayName || 'You';
    const myUsername = creatorDetails?.username || myProfile.username || 'user';
    const myPhoto = creatorDetails?.photoURL || myProfile.photoURL || '';
    const myBio = myProfile.bio || 'Available on ERROREX';

    const newConv: Conversation = {
      id,
      participants: [myId, contactUid],
      participantDetails: {
        [contactUid]: {
          displayName: name,
          username: uName,
          photoURL: customPhoto || '',
          bio: customBio || 'Available on ERROREX'
        },
        [myId]: {
          displayName: myDisplayName,
          username: myUsername,
          photoURL: myPhoto,
          bio: myBio,
          privacy: myPrivacy
        }
      },
      isGroup,
      groupName: isGroup ? name : undefined,
      lastMessageText: 'Conversation started',
      lastMessageSenderId: myId,
      lastMessageAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      unreadCount: 0
    };

    allConvs.unshift(newConv);
    this.saveConversations(allConvs);

    // Ensure parent conversation row hits Supabase BEFORE initial system message
    upsertSupabaseConversation(newConv).then(() => {
      this.sendMessage(id, 'system', name, `Private dialogue started with ${name} (@${uName}).`);
    });

    this.addContact({
      name,
      username: uName,
      bio: customBio || 'Encrypted ERROREX Contact',
      photoURL: customPhoto
    });

    return newConv;
  },

  deleteConversation(conversationId: string) {
    const convs = this.getAllConversations().filter(c => c.id !== conversationId);
    this.saveConversations(convs);
    deleteSupabaseConversation(conversationId);
    try {
      localStorage.removeItem(MESSAGES_STORAGE_KEY_PREFIX + conversationId);
    } catch {
      // quiet
    }
  },

  togglePin(conversationId: string): boolean {
    const convs = this.getAllConversations();
    const conv = convs.find(c => c.id === conversationId);
    if (!conv) return false;
    conv.isPinned = !conv.isPinned;
    this.saveConversations([...convs]);
    return Boolean(conv.isPinned);
  },

  toggleMute(conversationId: string): boolean {
    const convs = this.getAllConversations();
    const conv = convs.find(c => c.id === conversationId);
    if (!conv) return false;
    conv.isMuted = !conv.isMuted;
    this.saveConversations([...convs]);
    return Boolean(conv.isMuted);
  },

  toggleArchive(conversationId: string): boolean {
    const convs = this.getAllConversations();
    const conv = convs.find(c => c.id === conversationId);
    if (!conv) return false;
    conv.isArchived = !conv.isArchived;
    this.saveConversations([...convs]);
    return Boolean(conv.isArchived);
  },

  toggleBlock(conversationId: string): boolean {
    const convs = this.getAllConversations();
    const conv = convs.find(c => c.id === conversationId);
    if (!conv) return false;
    conv.isBlocked = !conv.isBlocked;
    this.saveConversations([...convs]);
    return Boolean(conv.isBlocked);
  },

  // --- Contacts Book ---
  getContacts(): ContactItem[] {
    try {
      const saved = localStorage.getItem(CONTACTS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not read contacts:', e);
    }
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(initialContacts));
    return initialContacts;
  },

  saveContacts(contacts: ContactItem[]) {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
    notifyListeners();
  },

  addContact(contact: { name: string; username: string; bio?: string; photoURL?: string }): ContactItem {
    const contacts = this.getContacts();
    const cleanUsername = contact.username.replace(/^@/, '').toLowerCase().trim();

    const existing = contacts.find(c => c.username.toLowerCase() === cleanUsername);
    if (existing) {
      existing.name = contact.name;
      if (contact.bio) existing.bio = contact.bio;
      if (contact.photoURL) existing.photoURL = contact.photoURL;
      this.saveContacts(contacts);
      return existing;
    }

    const newContact: ContactItem = {
      id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: contact.name.trim(),
      username: cleanUsername,
      bio: contact.bio || 'Encrypted contact • Active on ERROREX',
      photoURL: contact.photoURL || '',
      isOnline: true,
      createdAt: new Date().toISOString()
    };

    contacts.unshift(newContact);
    this.saveContacts(contacts);
    return newContact;
  },

  deleteContact(id: string) {
    const contacts = this.getContacts().filter(c => c.id !== id);
    this.saveContacts(contacts);
  },

  toggleContactOnline(contactIdOrUsername: string, forceOnline?: boolean): boolean {
    const contacts = this.getContacts();
    const contact = contacts.find(
      c => c.id === contactIdOrUsername || c.username.toLowerCase() === contactIdOrUsername.toLowerCase()
    );
    if (!contact) return false;

    contact.isOnline = forceOnline !== undefined ? forceOnline : !contact.isOnline;
    this.saveContacts(contacts);
    return contact.isOnline;
  },

  // --- Privacy Settings ---
  getPrivacySettings(): PrivacySettings {
    const defaults: PrivacySettings = {
      profilePhoto: 'everyone',
      bio: 'everyone',
      lastSeen: 'contacts',
      readReceipts: true
    };
    try {
      const saved = localStorage.getItem(PRIVACY_STORAGE_KEY);
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not read privacy settings:', e);
    }
    return defaults;
  },

  savePrivacySettings(settings: PrivacySettings) {
    localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(settings));
    const currentProfile = this.getUserProfile();
    if (currentProfile.uid) {
      const updatedProfile: UserProfile = {
        ...currentProfile,
        privacySettings: settings,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));

      // Mirror privacy into conversation participantDetails so peers reflect changes immediately
      const allConvs = this.getAllConversations();
      let convsDirty = false;
      allConvs.forEach(c => {
        if (c.participants.includes(currentProfile.uid)) {
          c.participantDetails = {
            ...(c.participantDetails || {}),
            [currentProfile.uid]: {
              ...(c.participantDetails?.[currentProfile.uid] || {
                displayName: currentProfile.displayName,
                username: currentProfile.username
              }),
              privacy: settings
            }
          };
          convsDirty = true;
          if (typeof navigator === 'undefined' || navigator.onLine) {
            upsertSupabaseConversation(c).catch(() => {});
          }
        }
      });
      if (convsDirty) {
        localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(allConvs));
      }
    }
    notifyListeners();
  },

  // --- User Profile ---
  getUserProfile(): UserProfile {
    const defaults: UserProfile = {
      uid: '',
      displayName: '',
      username: '',
      bio: 'Encrypted Sovereign Account Active',
      photoURL: '',
      isOnline: true,
      createdAt: new Date().toISOString()
    };
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isLegacyTestAccount(parsed.uid, parsed.username, parsed.displayName)) {
          localStorage.removeItem(PROFILE_STORAGE_KEY);
          return defaults;
        }
        return { ...defaults, ...parsed };
      }
    } catch (e) {
      console.warn('Could not read user profile:', e);
    }
    return defaults;
  },

  saveUserProfile(profileUpdates: Partial<UserProfile>): UserProfile {
    const current = this.getUserProfile();
    const updated: UserProfile = {
      ...current,
      uid: profileUpdates.uid !== undefined ? profileUpdates.uid : current.uid,
      displayName: profileUpdates.displayName !== undefined ? profileUpdates.displayName : current.displayName,
      bio: profileUpdates.bio !== undefined ? profileUpdates.bio : current.bio,
      photoURL: profileUpdates.photoURL !== undefined ? profileUpdates.photoURL : current.photoURL,
      username: profileUpdates.username !== undefined ? profileUpdates.username : current.username,
      privacySettings:
        profileUpdates.privacySettings !== undefined ? profileUpdates.privacySettings : current.privacySettings,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));

    if (updated.uid) {
      const allConvs = this.getAllConversations();
      let convsDirty = false;
      allConvs.forEach(c => {
        if (c.participants.includes(updated.uid)) {
          c.participantDetails = {
            ...(c.participantDetails || {}),
            [updated.uid]: {
              ...(c.participantDetails?.[updated.uid] || {}),
              displayName: updated.displayName,
              username: updated.username,
              photoURL: updated.photoURL || '',
              bio: updated.bio || '',
              privacy: updated.privacySettings || this.getPrivacySettings()
            }
          };
          convsDirty = true;
        }
      });
      if (convsDirty) {
        localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(allConvs));
      }
    }

    notifyListeners();
    return updated;
  }
};
