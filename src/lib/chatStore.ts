import { Conversation, ChatMessage, ContactItem, PrivacySettings, UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  generateUUID,
  isLegacyTestAccount,
  isUserCurrentlyOnline,
  upsertSupabaseConversation,
  fetchSupabaseConversations,
  deleteSupabaseConversation,
  upsertSupabaseMessage,
  fetchSupabaseMessages
} from './supabaseSync';

const CONVERSATIONS_STORAGE_KEY = 'errorex_conversations_v5';
const MESSAGES_STORAGE_KEY_PREFIX = 'errorex_messages_v5_';
const CONTACTS_STORAGE_KEY = 'errorex_contacts_v5';
const PRIVACY_STORAGE_KEY = 'errorex_privacy_v5';
const PROFILE_STORAGE_KEY = 'errorex_profile_v5';

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

export const chatStore = {
  subscribe(fn: Listener) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  // --- Supabase Cloud Hydration & Realtime Sync ---
  async hydrateFromSupabase(uid: string) {
    if (!isSupabaseConfigured || !supabase || !uid) return;

    try {
      const remoteConvs = await fetchSupabaseConversations(uid);
      if (remoteConvs.length > 0) {
        const localConvs = this.getAllConversations();
        const convMap = new Map<string, Conversation>();
        localConvs.forEach(c => convMap.set(c.id, c));
        remoteConvs.forEach(rc => {
          const prev = convMap.get(rc.id);
          convMap.set(rc.id, prev ? { ...prev, ...rc } : rc);
        });
        this.saveConversations(Array.from(convMap.values()));

        // Fetch messages for each conversation
        await Promise.all(
          remoteConvs.map(async rc => {
            const remoteMsgs = await fetchSupabaseMessages(rc.id);
            if (remoteMsgs.length > 0) {
              const localMsgs = this.getMessages(rc.id);
              const msgMap = new Map<string, ChatMessage>();
              localMsgs.forEach(m => msgMap.set(m.id, m));
              remoteMsgs.forEach(rm => {
                const prev = msgMap.get(rm.id);
                msgMap.set(rm.id, prev ? { ...prev, ...rm } : rm);
              });
              const merged = Array.from(msgMap.values()).sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
              this.saveMessages(rc.id, merged);
            }
          })
        );
      }
    } catch (err) {
      console.warn('[ChatStore] Supabase hydrate notice:', err);
    }

    // Subscribe to realtime messages & conversations
    if (chatRealtimeUid !== uid) {
      if (chatRealtimeChannel) {
        try {
          supabase.removeChannel(chatRealtimeChannel);
        } catch {
          // ignore
        }
      }
      chatRealtimeUid = uid;
      try {
        chatRealtimeChannel = supabase
          .channel(`errorex_chat_${uid}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, async () => {
            const remoteConvs = await fetchSupabaseConversations(uid);
            if (remoteConvs.length > 0) {
              const localConvs = this.getAllConversations();
              const convMap = new Map<string, Conversation>();
              localConvs.forEach(c => convMap.set(c.id, c));
              remoteConvs.forEach(rc => {
                const prev = convMap.get(rc.id);
                convMap.set(rc.id, prev ? { ...prev, ...rc } : rc);
              });
              this.saveConversations(Array.from(convMap.values()));
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async payload => {
            const row = (payload.new || payload.old) as any;
            if (!row?.conversation_id) return;
            const myConvs = this.getConversations(uid);
            if (!myConvs.some(c => c.id === row.conversation_id)) return;
            const remoteMsgs = await fetchSupabaseMessages(row.conversation_id);
            if (remoteMsgs.length > 0) {
              const localMsgs = this.getMessages(row.conversation_id);
              const msgMap = new Map<string, ChatMessage>();
              localMsgs.forEach(m => msgMap.set(m.id, m));
              remoteMsgs.forEach(rm => {
                const prev = msgMap.get(rm.id);
                msgMap.set(rm.id, prev ? { ...prev, ...rm } : rm);
              });
              const merged = Array.from(msgMap.values()).sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
              this.saveMessages(row.conversation_id, merged);
            }
          })
          .subscribe();
      } catch {
        // quiet
      }
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

    const initialDeliveryStatus: 'sent' | 'delivered' | 'read' = isRecipientOnline ? 'delivered' : 'sent';

    const newMsg: ChatMessage = {
      id: generateUUID(),
      conversationId,
      senderId,
      senderName,
      text,
      mediaUrl,
      mediaType,
      createdAt: nowIso,
      readBy: [senderId],
      deliveryStatus: initialDeliveryStatus,
      ...(replyTo && {
        replyToMessageId: replyTo.id,
        replyToText: replyTo.text
      })
    };

    messages.push(newMsg);
    this.saveMessages(conversationId, messages);
    if (browserOnline) {
      upsertSupabaseMessage(newMsg);
    }

    if (targetConv) {
      targetConv.lastMessageText =
        mediaType === 'image' ? '📷 Photo' : mediaType === 'audio' ? '🎤 Voice Memo' : text;
      targetConv.lastMessageSenderId = senderId;
      targetConv.lastMessageAt = nowIso;
      targetConv.updatedAt = nowIso;
      targetConv.unreadCount = 0;
      this.saveConversations([...convs]);
      if (browserOnline) {
        upsertSupabaseConversation(targetConv);
      }
    }

    if (isRecipientOnline) {
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
            upsertSupabaseMessage(targetMsg);
          }
        }
      }, 1800);
    }

    return newMsg;
  },

  async syncPendingToSupabase(uid: string) {
    if (!isSupabaseConfigured || !uid) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const convs = this.getConversations(uid);
    for (const conv of convs) {
      await upsertSupabaseConversation(conv);
      const msgs = this.getMessages(conv.id);
      for (const m of msgs) {
        await upsertSupabaseMessage(m);
      }
    }
  },

  markAsRead(conversationId: string, userId?: string) {
    const convs = this.getAllConversations();
    const conv = convs.find(c => c.id === conversationId);
    let changed = false;

    if (conv && (conv.unreadCount || 0) > 0) {
      conv.unreadCount = 0;
      changed = true;
    }

    const messages = this.getMessages(conversationId);
    if (userId) {
      let msgsChanged = false;
      messages.forEach(m => {
        if (!m.readBy) m.readBy = [];
        if (!m.readBy.includes(userId)) {
          m.readBy.push(userId);
          msgsChanged = true;
          upsertSupabaseMessage(m);
        }
      });
      if (msgsChanged) {
        this.saveMessages(conversationId, messages);
      }
    }

    if (changed && conv) {
      this.saveConversations([...convs]);
      upsertSupabaseConversation(conv);
    }
  },

  deleteMessage(conversationId: string, messageId: string) {
    this.deleteMessageForEveryone(conversationId, messageId);
  },

  deleteMessageForEveryone(conversationId: string, messageId: string) {
    const messages = this.getMessages(conversationId);
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
      msg.text = '🚫 This message was deleted';
      msg.isDeleted = true;
      msg.deletedForEveryone = true;
      msg.mediaUrl = undefined;
      msg.mediaType = 'none';
      this.saveMessages(conversationId, messages);
      upsertSupabaseMessage(msg);

      const convs = this.getAllConversations();
      const targetConv = convs.find(c => c.id === conversationId);
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
    if (msg) {
      if (!msg.deletedFor) msg.deletedFor = [];
      if (!msg.deletedFor.includes(userId)) {
        msg.deletedFor.push(userId);
      }
      this.saveMessages(conversationId, messages);
      upsertSupabaseMessage(msg);
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
    if (msg) {
      msg.text = newText;
      msg.isEdited = true;
      this.saveMessages(conversationId, messages);
      upsertSupabaseMessage(msg);
    }
  },

  reactToMessage(conversationId: string, messageId: string, emoji: string, userId: string) {
    const messages = this.getMessages(conversationId);
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
      msg.reactions = { ...(msg.reactions || {}), [userId]: emoji };
      this.saveMessages(conversationId, messages);
      upsertSupabaseMessage(msg);
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
    const contactUid = targetUid || `user_${Date.now()}`;
    const uName = customUsername || name.toLowerCase().replace(/\s+/g, '_');

    const myProfile = this.getUserProfile();
    const myId = creatorId || myProfile.uid || 'current_user';
    const myDisplayName = creatorDetails?.displayName || myProfile.displayName || 'You';
    const myUsername = creatorDetails?.username || myProfile.username || 'user';
    const myPhoto = creatorDetails?.photoURL || myProfile.photoURL || '';

    const newConv: Conversation = {
      id,
      participants: [myId, contactUid],
      participantDetails: {
        [contactUid]: {
          displayName: name,
          username: uName,
          photoURL: customPhoto || ''
        },
        [myId]: {
          displayName: myDisplayName,
          username: myUsername,
          photoURL: myPhoto
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
    upsertSupabaseConversation(newConv);

    this.sendMessage(id, 'system', name, `Private dialogue started with ${name} (@${uName}).`);

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

    if (contact.isOnline) {
      const convs = this.getAllConversations();
      convs.forEach(conv => {
        const isTarget =
          conv.participants.includes(contact.id) ||
          (conv.participantDetails &&
            Object.values(conv.participantDetails).some(
              p => p.username.toLowerCase() === contact.username.toLowerCase()
            ));

        if (isTarget) {
          const msgs = this.getMessages(conv.id);
          let changed = false;
          msgs.forEach(m => {
            if (m.deliveryStatus === 'sent') {
              m.deliveryStatus = 'delivered';
              changed = true;
            }
          });

          if (changed) {
            this.saveMessages(conv.id, msgs);
            setTimeout(() => {
              const freshMsgs = this.getMessages(conv.id);
              let readChanged = false;
              freshMsgs.forEach(m => {
                if (m.deliveryStatus === 'delivered') {
                  m.deliveryStatus = 'read';
                  if (!m.readBy) m.readBy = [];
                  if (!m.readBy.includes(contact.id)) m.readBy.push(contact.id);
                  readChanged = true;
                }
              });
              if (readChanged) {
                this.saveMessages(conv.id, freshMsgs);
              }
            }, 1600);
          }
        }
      });
    }

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
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
    notifyListeners();
    return updated;
  }
};
