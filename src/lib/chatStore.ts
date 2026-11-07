import { Conversation, ChatMessage, ContactItem, PrivacySettings, UserProfile } from '../types';

const CONVERSATIONS_STORAGE_KEY = 'errorex_conversations_v3';
const MESSAGES_STORAGE_KEY_PREFIX = 'errorex_messages_v3_';
const CONTACTS_STORAGE_KEY = 'errorex_contacts_v3';
const PRIVACY_STORAGE_KEY = 'errorex_privacy_v3';
const PROFILE_STORAGE_KEY = 'errorex_profile_v3';

const initialConversations: Conversation[] = [
  {
    id: 'conv_elena',
    participants: ['test_user_noor_1434', 'user_elena'],
    participantDetails: {
      user_elena: {
        displayName: 'Elena Rostova',
        username: 'elena_rostova',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      },
      test_user_noor_1434: {
        displayName: 'Noor',
        username: 'noor',
        photoURL: ''
      }
    },
    isGroup: false,
    lastMessageText: 'Attached the vault access key. Let me know when you review it.',
    lastMessageSenderId: 'user_elena',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    unreadCount: 1
  },
  {
    id: 'conv_alexander',
    participants: ['test_user_noor_1434', 'user_alexander'],
    participantDetails: {
      user_alexander: {
        displayName: 'Alexander Vance',
        username: 'alex_vance',
        photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
      },
      test_user_noor_1434: {
        displayName: 'Noor',
        username: 'noor',
        photoURL: ''
      }
    },
    isGroup: false,
    lastMessageText: 'Got it. I will bring the encrypted ledger.',
    lastMessageSenderId: 'user_alexander',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    unreadCount: 0
  },
  {
    id: 'conv_vault',
    participants: ['test_user_noor_1434'],
    participantDetails: {
      test_user_noor_1434: {
        displayName: 'Sovereign Vault (Notes to Self)',
        username: 'vault_secure',
        photoURL: ''
      }
    },
    isGroup: false,
    groupName: 'Sovereign Vault (Notes to Self)',
    lastMessageText: 'Welcome to your private encrypted vault. Save sensitive notes, voice memos, and photos here.',
    lastMessageSenderId: 'system',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    unreadCount: 0
  }
];

const initialContacts: ContactItem[] = [
  {
    id: 'contact_elena',
    name: 'Elena Rostova',
    username: 'elena_rostova',
    bio: 'Zurich diplomatic liaison • Encrypted communications only',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isOnline: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'contact_alexander',
    name: 'Alexander Vance',
    username: 'alex_vance',
    bio: 'Geneva vault custodian • Verified partner',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    isOnline: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'contact_marcus',
    name: 'Marcus Sterling',
    username: 'marcus_sterling',
    bio: 'Swiss portfolio manager • Sovereign wealth desk',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    isOnline: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'contact_sarah',
    name: 'Sarah Connor',
    username: 'sarah_connor',
    bio: 'Strategic protocol operative • Confidential',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    isOnline: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'contact_vault',
    name: 'Sovereign Vault',
    username: 'vault_secure',
    bio: 'Personal encrypted storage & notes to self',
    isOnline: true,
    createdAt: new Date().toISOString()
  }
];

const initialMessages: Record<string, ChatMessage[]> = {
  conv_elena: [
    {
      id: 'm_elena_1',
      conversationId: 'conv_elena',
      senderId: 'user_elena',
      senderName: 'Elena Rostova',
      text: 'The contracts for Zurich are finalized. All communications will remain through the ERROREX vault.',
      mediaType: 'none',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      readBy: ['test_user_noor_1434']
    },
    {
      id: 'm_elena_2',
      conversationId: 'conv_elena',
      senderId: 'test_user_noor_1434',
      senderName: 'Noor',
      text: 'Understood. Ensure all files remain encrypted with AES-256.',
      mediaType: 'none',
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      readBy: ['user_elena'],
      reactions: { user_elena: '👍' }
    },
    {
      id: 'm_elena_3',
      conversationId: 'conv_elena',
      senderId: 'user_elena',
      senderName: 'Elena Rostova',
      text: 'Attached the vault access key. Let me know when you review it.',
      mediaType: 'none',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      readBy: []
    }
  ],
  conv_alexander: [
    {
      id: 'm_alex_1',
      conversationId: 'conv_alexander',
      senderId: 'user_alexander',
      senderName: 'Alexander Vance',
      text: 'Are we meeting at the private gallery tonight?',
      mediaType: 'none',
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      readBy: ['test_user_noor_1434']
    },
    {
      id: 'm_alex_2',
      conversationId: 'conv_alexander',
      senderId: 'test_user_noor_1434',
      senderName: 'Noor',
      text: 'Yes, 9:00 PM. Use the secret entrance and enter your PIN.',
      mediaType: 'none',
      createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      readBy: ['user_alexander'],
      reactions: { user_alexander: '🔥' }
    },
    {
      id: 'm_alex_3',
      conversationId: 'conv_alexander',
      senderId: 'user_alexander',
      senderName: 'Alexander Vance',
      text: 'Got it. I will bring the encrypted ledger.',
      mediaType: 'none',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      readBy: ['test_user_noor_1434']
    }
  ],
  conv_vault: [
    {
      id: 'm_vault_1',
      conversationId: 'conv_vault',
      senderId: 'system',
      senderName: 'ERROREX Security',
      text: 'Welcome to your private encrypted vault. Save sensitive notes, voice memos, and photos here.',
      mediaType: 'none',
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      readBy: ['test_user_noor_1434']
    }
  ]
};

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
  getConversations(): Conversation[] {
    try {
      const saved = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not read saved conversations:', e);
    }
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(initialConversations));
    return initialConversations;
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

    // Realistic WhatsApp Partner Auto-Reply
    if (conversationId === 'conv_elena' && senderId !== 'user_elena') {
      setTimeout(() => {
        const partnerReply: ChatMessage = {
          id: `m_reply_${Date.now()}`,
          conversationId,
          senderId: 'user_elena',
          senderName: 'Elena Rostova',
          text: getRandomReply('elena', text),
          mediaType: 'none',
          createdAt: new Date().toISOString(),
          readBy: []
        };
        const currentMsgs = this.getMessages(conversationId);
        // Mark all user messages as seen (blue tick) when partner replies
        currentMsgs.forEach(m => {
          if (m.senderId === senderId) {
            m.deliveryStatus = 'read';
            if (!m.readBy) m.readBy = [];
            if (!m.readBy.includes('user_elena')) m.readBy.push('user_elena');
          }
        });
        currentMsgs.push(partnerReply);
        this.saveMessages(conversationId, currentMsgs);

        const currentConvs = this.getConversations();
        const conv = currentConvs.find(c => c.id === conversationId);
        if (conv) {
          conv.lastMessageText = partnerReply.text;
          conv.lastMessageSenderId = 'user_elena';
          conv.lastMessageAt = partnerReply.createdAt;
          conv.updatedAt = partnerReply.createdAt;
          conv.unreadCount = 1;
          this.saveConversations([...currentConvs]);
        }
      }, 1400);
    } else if (conversationId === 'conv_alexander' && senderId !== 'user_alexander') {
      setTimeout(() => {
        const partnerReply: ChatMessage = {
          id: `m_reply_${Date.now()}`,
          conversationId,
          senderId: 'user_alexander',
          senderName: 'Alexander Vance',
          text: getRandomReply('alexander', text),
          mediaType: 'none',
          createdAt: new Date().toISOString(),
          readBy: []
        };
        const currentMsgs = this.getMessages(conversationId);
        // Mark all user messages as seen (blue tick) when partner replies
        currentMsgs.forEach(m => {
          if (m.senderId === senderId) {
            m.deliveryStatus = 'read';
            if (!m.readBy) m.readBy = [];
            if (!m.readBy.includes('user_alexander')) m.readBy.push('user_alexander');
          }
        });
        currentMsgs.push(partnerReply);
        this.saveMessages(conversationId, currentMsgs);

        const currentConvs = this.getConversations();
        const conv = currentConvs.find(c => c.id === conversationId);
        if (conv) {
          conv.lastMessageText = partnerReply.text;
          conv.lastMessageSenderId = 'user_alexander';
          conv.lastMessageAt = partnerReply.createdAt;
          conv.updatedAt = partnerReply.createdAt;
          conv.unreadCount = 1;
          this.saveConversations([...currentConvs]);
        }
      }, 1600);
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
    const messages = this.getMessages(conversationId).filter(m => m.id !== messageId);
    this.saveMessages(conversationId, messages);
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
    customBio?: string
  ): Conversation {
    const convs = this.getConversations();
    const id = `conv_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const contactUid = `user_${Date.now()}`;
    const uName = customUsername || name.toLowerCase().replace(/\s+/g, '_');

    const newConv: Conversation = {
      id,
      participants: ['test_user_noor_1434', contactUid],
      participantDetails: {
        [contactUid]: {
          displayName: name,
          username: uName,
          photoURL: customPhoto || ''
        },
        test_user_noor_1434: {
          displayName: 'Noor',
          username: 'noor',
          photoURL: ''
        }
      },
      isGroup,
      groupName: isGroup ? name : undefined,
      lastMessageText: 'Conversation started',
      lastMessageSenderId: 'test_user_noor_1434',
      lastMessageAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      unreadCount: 0
    };

    convs.unshift(newConv);
    this.saveConversations(convs);

    // Initial greeting message
    this.sendMessage(id, 'system', name, `Private encrypted dialogue initiated with ${name} (@${uName}).`);

    // Also auto-add to contacts if not already present
    this.addContact({
      name,
      username: uName,
      bio: customBio || 'Encrypted ERROREX Contact',
      photoURL: customPhoto
    });

    return newConv;
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

  // --- User Profile (DP, Display Name, Bio, Permanent Username) ---
  getUserProfile(): UserProfile {
    const defaults: UserProfile = {
      uid: 'test_user_noor_1434',
      displayName: 'Noor',
      username: 'noor', // LOCKED & PERMANENT
      bio: 'Sovereign Account • Encrypted Vault Active',
      photoURL: '',
      isOnline: true,
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not read user profile:', e);
    }
    return defaults;
  },

  saveUserProfile(profileUpdates: Partial<UserProfile>): UserProfile {
    const current = this.getUserProfile();
    // PERMANENT USERNAME: Keep current username immutable
    const updated: UserProfile = {
      ...current,
      displayName: profileUpdates.displayName !== undefined ? profileUpdates.displayName : current.displayName,
      bio: profileUpdates.bio !== undefined ? profileUpdates.bio : current.bio,
      photoURL: profileUpdates.photoURL !== undefined ? profileUpdates.photoURL : current.photoURL,
      username: current.username, // NEVER change username
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
    notifyListeners();
    return updated;
  }
};

function getRandomReply(character: 'elena' | 'alexander', userText: string): string {
  const elenaReplies = [
    'Message received and verified. The security handshake is complete.',
    'Understood. I will prepare the documents and update the ledger.',
    'Acknowledged. Everything is moving according to the sovereign protocol.',
    'Confirmed. I will keep this channel open for further instructions.',
    'Clear. The vault encryption keys have been rotated successfully.'
  ];

  const alexanderReplies = [
    'Received. I am on my way to the designated coordinates.',
    'Perfect. The private council has been notified.',
    'Understood, Noor. We will proceed with the operation as agreed.',
    'Confirmed. The transmission is fully secure.',
    'Got your message. Everything is in place on my side.'
  ];

  const list = character === 'elena' ? elenaReplies : alexanderReplies;
  return list[Math.floor(Math.random() * list.length)];
}
