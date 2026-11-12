import { Conversation, ChatMessage, ContactItem, PrivacySettings, UserProfile } from '../types';

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
} catch (e) {
  // quiet
}

// 100% Fresh start: No fake users, no test chats
const initialConversations: Conversation[] = [];
const initialContacts: ContactItem[] = [];
const initialMessages: Record<string, ChatMessage[]> = {};

type Listener = () => void;
const listeners: Listener[] = [];

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export const chatStore = {
  subscribe(fn: Listener) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
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

    // Check recipient's net / online status
    const convs = this.getConversations();
    const targetConv = convs.find(c => c.id === conversationId);

    // If conversation is blocked, prevent sending or receiving messages
    if (targetConv?.isBlocked && senderId !== 'system') {
      console.warn('Blocked conversation: message cannot be sent or received.');
      return {
        id: `m_blocked_${Date.now()}`,
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

    // If receiver's internet is OFF (isOnline === false): 1 tick ('sent')
    // If receiver's internet is ON (isOnline === true): 2 ticks black ('delivered')
    const isRecipientOnline = targetConv?.isGroup
      ? true
      : otherParticipantId === 'vault_secure' || conversationId === 'conv_vault'
      ? true
      : recipientContact ? recipientContact.isOnline !== false : true;

    const initialDeliveryStatus: 'sent' | 'delivered' | 'read' = isRecipientOnline ? 'delivered' : 'sent';

    const newMsg: ChatMessage = {
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

    // Update conversation lastMessage & timestamp
    if (targetConv) {
      targetConv.lastMessageText =
        mediaType === 'image' ? '📷 Photo' : mediaType === 'audio' ? '🎤 Voice Memo' : text;
      targetConv.lastMessageSenderId = senderId;
      targetConv.lastMessageAt = nowIso;
      targetConv.updatedAt = nowIso;
      targetConv.unreadCount = 0;
      this.saveConversations([...convs]);
    }

    // If recipient's net is ON, simulate realistic seen/read transition after 1.8s
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
        }
      }, 1800);
    }

    return newMsg;
  },

  markAsRead(conversationId: string, userId?: string) {
    const convs = this.getConversations();
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
        }
      });
      if (msgsChanged) {
        this.saveMessages(conversationId, messages);
      }
    }

    if (changed) {
      this.saveConversations([...convs]);
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

      // Update conversation preview if this was the last message
      const convs = this.getConversations();
      const targetConv = convs.find(c => c.id === conversationId);
      if (targetConv && targetConv.lastMessageText) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.id === messageId) {
          targetConv.lastMessageText = '🚫 This message was deleted';
          this.saveConversations([...convs]);
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
    }
  },

  clearMessages(conversationId: string) {
    this.saveMessages(conversationId, []);
    const currentConvs = this.getConversations();
    const conv = currentConvs.find(c => c.id === conversationId);
    if (conv) {
      conv.lastMessageText = 'Messages cleared';
      this.saveConversations([...currentConvs]);
    }
  },

  editMessage(conversationId: string, messageId: string, newText: string) {
    const messages = this.getMessages(conversationId);
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
      msg.text = newText;
      msg.isEdited = true;
      this.saveMessages(conversationId, messages);
    }
  },

  reactToMessage(conversationId: string, messageId: string, emoji: string, userId: string) {
    const messages = this.getMessages(conversationId);
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
      msg.reactions = { ...(msg.reactions || {}), [userId]: emoji };
      this.saveMessages(conversationId, messages);
    }
  },

  createConversation(
    name: string,
    isGroup: boolean = false,
    customUsername?: string,
    customPhoto?: string,
    customBio?: string,
    creatorId?: string,
    creatorDetails?: { displayName: string; username: string; photoURL?: string }
  ): Conversation {
    const allConvs = this.getAllConversations();
    const id = `conv_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const contactUid = `user_${Date.now()}`;
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

    // Initial greeting message
    this.sendMessage(id, 'system', name, `Private dialogue started with ${name} (@${uName}).`);

    // Also auto-add to contacts if not already present
    this.addContact({
      name,
      username: uName,
      bio: customBio || 'Encrypted ERROREX Contact',
      photoURL: customPhoto
    });

    return newConv;
  },

  deleteConversation(conversationId: string) {
    const convs = this.getConversations().filter(c => c.id !== conversationId);
    this.saveConversations(convs);
    try {
      localStorage.removeItem(MESSAGES_STORAGE_KEY_PREFIX + conversationId);
    } catch (e) {
      // quiet
    }
  },

  togglePin(conversationId: string): boolean {
    const convs = this.getConversations();
    const conv = convs.find(c => c.id === conversationId);
    if (!conv) return false;
    conv.isPinned = !conv.isPinned;
    this.saveConversations([...convs]);
    return Boolean(conv.isPinned);
  },

  toggleMute(conversationId: string): boolean {
    const convs = this.getConversations();
    const conv = convs.find(c => c.id === conversationId);
    if (!conv) return false;
    conv.isMuted = !conv.isMuted;
    this.saveConversations([...convs]);
    return Boolean(conv.isMuted);
  },

  toggleArchive(conversationId: string): boolean {
    const convs = this.getConversations();
    const conv = convs.find(c => c.id === conversationId);
    if (!conv) return false;
    conv.isArchived = !conv.isArchived;
    this.saveConversations([...convs]);
    return Boolean(conv.isArchived);
  },

  toggleBlock(conversationId: string): boolean {
    const convs = this.getConversations();
    const conv = convs.find(c => c.id === conversationId);
    if (!conv) return false;
    conv.isBlocked = !conv.isBlocked;
    this.saveConversations([...convs]);
    return Boolean(conv.isBlocked);
  },

  // --- WhatsApp Contacts Book ---
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

    // Check if already in contacts by username
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

    // If contact net is now active (isOnline === true), transition pending 'sent' (1 tick) messages to 'delivered' (2 ticks black)
    // and then to 'read' (2 ticks blue) when seen!
    if (contact.isOnline) {
      const convs = this.getConversations();
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

            // Realistic simulation of contact reading after 1.5 seconds
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

  // --- WhatsApp Privacy Settings ---
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

  // --- User Profile (DP, Display Name, Bio, Username) ---
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
        if (parsed.uid === 'test_user_noor_1434' || parsed.displayName === 'Noor' || parsed.username === 'noor') {
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
