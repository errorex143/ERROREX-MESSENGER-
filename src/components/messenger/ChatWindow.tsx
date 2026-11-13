import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Conversation, PrivacySettings, ThemeName, ColorMode, UserProfile } from '../../types';
import { chatStore } from '../../lib/chatStore';
import { db, collection, onSnapshot } from '../../lib/firebase';
import { getCollectionData } from '../../lib/standaloneApi';
import { isUserCurrentlyOnline } from '../../lib/supabaseSync';
import { useTheme, THEMES } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { EmojiKeyboard, LIVE_STICKERS } from '../common/EmojiKeyboard';
import {
  Send,
  Smile,
  Paperclip,
  Mic,
  CornerUpLeft,
  Trash2,
  Edit2,
  CheckCheck,
  X,
  Play,
  Pause,
  Image as ImageIcon,
  Lock,
  ArrowLeft,
  ShieldCheck,
  Volume2,
  Info,
  User,
  AtSign,
  FileText,
  Settings,
  Palette,
  Eye,
  Sun,
  Moon,
  Laptop,
  Camera,
  Check,
  Bell,
  BellOff,
  Sparkles,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

const HERALDIC_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
];

const WHATSAPP_STATUS_PRESETS = [
  'Available',
  'Busy',
  'At work',
  'In a meeting',
  'Sovereign Protocol Active',
  'Encrypted comms only',
  'Can’t talk, ERROREX only',
  'Vault Secured'
];

interface ChatWindowProps {
  conversation: Conversation;
  currentUserId: string;
  currentUserName: string;
  onCloseMobileChat?: () => void;
}

// WhatsApp-style Voice Note Player component
const VoiceNoteBubble: React.FC<{
  mediaUrl?: string;
  duration?: number;
  isOwn: boolean;
}> = ({ mediaUrl, duration = 7, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animIntervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    };
  }, []);

  const togglePlay = () => {
    if (mediaUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(mediaUrl);
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setProgress(0);
        };
        audioRef.current.ontimeupdate = () => {
          if (audioRef.current && audioRef.current.duration) {
            setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
          }
        };
      }

      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(e => {
          console.warn('Audio play error, using simulated playback:', e);
          simulatePlayback();
        });
      }
    } else {
      simulatePlayback();
    }
  };

  const simulatePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    } else {
      setIsPlaying(true);
      const totalSteps = 70;
      let step = 0;
      animIntervalRef.current = setInterval(() => {
        step++;
        setProgress((step / totalSteps) * 100);
        if (step >= totalSteps) {
          clearInterval(animIntervalRef.current);
          setIsPlaying(false);
          setProgress(0);
        }
      }, 100);
    }
  };

  return (
    <div className="flex items-center gap-3 p-2 px-3 rounded-2xl bg-black/25 border border-white/10 min-w-[210px] sm:min-w-[240px]">
      <button
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-[var(--accent-primary)] text-black flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-all shadow-md"
        title={isPlaying ? 'Pause voice memo' : 'Play voice memo'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 ml-0.5 fill-current" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        {/* Animated Waveform Visualizer */}
        <div className="flex items-center gap-0.5 h-6">
          {[40, 70, 30, 90, 60, 100, 45, 80, 55, 95, 35, 85, 65, 45, 75, 90, 50, 70].map((h, i) => {
            const barProgress = (i / 18) * 100;
            const isFilled = progress >= barProgress;
            return (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-[var(--accent-primary)]'
                    : isOwn
                    ? 'bg-amber-400/40'
                    : 'bg-neutral-500/50'
                } ${isPlaying && isFilled ? 'opacity-100 scale-y-110' : 'opacity-75'}`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-[var(--accent-primary)]" />
            <span>Voice Memo</span>
          </span>
          <span>0:{duration < 10 ? `0${duration}` : duration}</span>
        </div>
      </div>
    </div>
  );
};

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  currentUserId,
  currentUserName,
  onCloseMobileChat
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    chatStore.getMessages(conversation.id)
  );
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
  const [chatSettingsTab, setChatSettingsTab] = useState<'profile' | 'privacy' | 'theme' | 'chat'>('profile');

  // Theme & Auth integration
  const { theme, setTheme, mode, setMode } = useTheme();
  const { userProfile, updateUserProfile } = useAuth();

  // Profile fields inside in-chat settings
  const storedProfile = chatStore.getUserProfile();
  const [myDisplayName, setMyDisplayName] = useState(userProfile?.displayName || storedProfile.displayName || currentUserName || 'User');
  const [myUsername, setMyUsername] = useState(userProfile?.username || storedProfile.username || 'user');
  const [myBio, setMyBio] = useState(userProfile?.bio || storedProfile.bio || 'Sovereign Account • Encrypted Vault Active');
  const [myPhotoURL, setMyPhotoURL] = useState(userProfile?.photoURL || storedProfile.photoURL || '');
  const [profileSavedNotice, setProfileSavedNotice] = useState(false);
  const dpUploadRef = useRef<HTMLInputElement>(null);

  // Delete message modal state (Delete for everyone vs Delete for me)
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);

  // WhatsApp Privacy settings inside in-chat settings
  const [privacy, setPrivacy] = useState<PrivacySettings>(() => chatStore.getPrivacySettings());
  const [privacySavedNotice, setPrivacySavedNotice] = useState(false);

  // Chat-specific options
  const [isMuted, setIsMuted] = useState(false);
  const [clearChatConfirm, setClearChatConfirm] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = myUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user';
    chatStore.saveUserProfile({
      displayName: myDisplayName.trim(),
      username: cleanUsername,
      bio: myBio.trim(),
      photoURL: myPhotoURL
    });
    try {
      await updateUserProfile({
        displayName: myDisplayName.trim(),
        username: cleanUsername,
        bio: myBio.trim(),
        photoURL: myPhotoURL
      });
    } catch (err) {
      console.warn('Profile sync:', err);
    }
    setProfileSavedNotice(true);
    setTimeout(() => setProfileSavedNotice(false), 3000);
  };

  const handleDpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setMyPhotoURL(reader.result as string);
    };
  };

  const updatePrivacyField = (key: keyof PrivacySettings, value: any) => {
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    chatStore.savePrivacySettings(updated);
    setPrivacySavedNotice(true);
    setTimeout(() => setPrivacySavedNotice(false), 2500);
  };

  const handleClearChatHistory = () => {
    chatStore.clearMessages(conversation.id);
    setMessages([]);
    setClearChatConfirm(false);
  };

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [directoryProfiles, setDirectoryProfiles] = useState<UserProfile[]>(() =>
    getCollectionData('userProfiles') as UserProfile[]
  );
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [, setPresenceTick] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'userProfiles'), snap => {
      const list: UserProfile[] = [];
      snap.forEach((d: any) => list.push(d.data() as UserProfile));
      setDirectoryProfiles(list);
    });
    const onOnline = () => setIsBrowserOnline(true);
    const onOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const tick = setInterval(() => setPresenceTick(t => t + 1), 20000);
    return () => {
      unsub();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(tick);
    };
  }, []);

  const otherParticipantId =
    conversation.participants.find(p => p !== currentUserId) || conversation.participants[0] || '';

  const chatUsername = conversation.isGroup
    ? 'group'
    : conversation.participantDetails?.[otherParticipantId]?.username || 'contact';

  // Check saved contacts & live directory profiles
  const allContacts = chatStore.getContacts();
  const contactItem = allContacts.find(
    c => (c.username && chatUsername && c.username.toLowerCase() === chatUsername.toLowerCase()) ||
         c.id === otherParticipantId
  );
  const liveProfile = directoryProfiles.find(
    p => p.uid === otherParticipantId || (p.username && chatUsername && p.username.toLowerCase() === chatUsername.toLowerCase())
  );

  const chatTitle = conversation.isGroup
    ? conversation.groupName || 'Group Conversation'
    : contactItem?.name ||
      liveProfile?.displayName ||
      conversation.participantDetails?.[otherParticipantId]?.displayName ||
      conversation.groupName ||
      'Private Contact';

  const isContactOnline = !isBrowserOnline
    ? false
    : conversation.isGroup
    ? true
    : otherParticipantId === 'vault_secure' || conversation.id === 'conv_vault'
    ? true
    : liveProfile
    ? isUserCurrentlyOnline(liveProfile)
    : contactItem
    ? contactItem.isOnline === true
    : false;

  const chatAvatar = conversation.isGroup
    ? conversation.groupPhoto
    : contactItem?.photoURL || liveProfile?.photoURL || conversation.participantDetails?.[otherParticipantId]?.photoURL;

  const chatBio = liveProfile?.bio || contactItem?.bio || 'Encrypted contact • Active on ERROREX Sovereign Network';

  // Subscribe to real-time chat updates & mark conversation as seen/read
  useEffect(() => {
    setMessages(chatStore.getMessages(conversation.id));
    chatStore.markAsRead(conversation.id, currentUserId);

    const unsubscribe = chatStore.subscribe(() => {
      setMessages(chatStore.getMessages(conversation.id));
      chatStore.markAsRead(conversation.id, currentUserId);
    });

    return () => unsubscribe();
  }, [conversation.id, currentUserId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Send Text Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (conversation.isBlocked) return;
    if (!inputText.trim()) return;

    if (editingMessage) {
      chatStore.editMessage(conversation.id, editingMessage.id, inputText.trim());
      setEditingMessage(null);
      setInputText('');
      return;
    }

    const reply = replyingTo
      ? { id: replyingTo.id, text: replyingTo.text.slice(0, 80) }
      : undefined;

    chatStore.sendMessage(
      conversation.id,
      currentUserId,
      currentUserName || 'User',
      inputText.trim(),
      undefined,
      'none',
      reply
    );

    setInputText('');
    setReplyingTo(null);
  };

  // Start Voice Recording
  const startRecording = async () => {
    if (conversation.isBlocked) return;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          chatStore.sendMessage(
            conversation.id,
            currentUserId,
            currentUserName || 'User',
            '🎤 Voice Memo',
            base64Audio,
            'audio'
          );
        };
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone recording notice (simulating voice note):', err);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    }
  };

  // Stop Recording & Send Voice Memo
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      const finalSec = recordingSeconds || 5;
      chatStore.sendMessage(
        conversation.id,
        currentUserId,
        currentUserName || 'User',
        `🎤 Voice Memo (0:${finalSec < 10 ? `0${finalSec}` : finalSec})`,
        undefined,
        'audio'
      );
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  // Cancel Voice Recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  // File Upload (Image / Video / Attachment)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (conversation.isBlocked) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64Media = reader.result as string;
      chatStore.sendMessage(
        conversation.id,
        currentUserId,
        currentUserName || 'User',
        file.name,
        base64Media,
        isImage ? 'image' : isVideo ? 'video' : 'file'
      );
    };
  };

  // Reactions
  const handleReaction = (messageId: string, emoji: string) => {
    chatStore.reactToMessage(conversation.id, messageId, emoji, currentUserId);
  };

  // Delete message
  const handleDeleteMessage = (messageId: string) => {
    chatStore.deleteMessage(conversation.id, messageId);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[var(--bg-window)] text-[var(--text-main)] relative select-none transition-colors">
      {/* Top Header: Contact Details, Live Net Status, and Encrypted Badge */}
      <div className="p-3 px-4 bg-[var(--bg-sidebar)] border-b border-[var(--accent-border)] flex items-center justify-between z-10 shrink-0 shadow-sm">
        <div
          onClick={() => setIsContactInfoOpen(true)}
          className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
          title="Click to view Contact Profile & Info"
        >
          {onCloseMobileChat && (
            <button
              onClick={e => {
                e.stopPropagation();
                onCloseMobileChat();
              }}
              className="md:hidden p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--accent-primary)] hover:border-[var(--accent-primary)] shadow-sm"
              title="Back to conversations"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-900 border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-sm shrink-0 overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
            {chatAvatar ? (
              <img src={chatAvatar} alt={chatTitle} className="w-full h-full object-cover" />
            ) : (
              chatTitle.slice(0, 1).toUpperCase()
            )}
          </div>

          <div className="flex flex-col text-left min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-sm font-bold text-[var(--text-main)] tracking-wide truncate max-w-[150px] sm:max-w-xs group-hover:text-[var(--accent-primary)] transition-colors">
                {chatTitle}
              </h2>
              <span className="text-[10px] font-mono text-[var(--accent-primary)] truncate">
                @{chatUsername}
              </span>
              {conversation.isBlocked && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 uppercase tracking-wider">
                  Blocked 🚫
                </span>
              )}
            </div>
            {/* Live Online / Offline status */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className={`w-2 h-2 rounded-full ${isContactOnline ? 'bg-emerald-500' : 'bg-neutral-500'}`} />
              <span className={isContactOnline ? 'text-emerald-500 dark:text-emerald-400 font-semibold' : 'text-neutral-500 font-medium'}>
                {isContactOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Clean Header: Encrypted Badge */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsContactInfoOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-xs font-mono text-[var(--accent-primary)] hover:border-[var(--accent-primary)] hover:gold-glow-sm transition-all shadow-sm"
            title="Encrypted Conversation"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Encrypted</span>
          </button>
        </div>
      </div>

      {/* Offline Auto-Queue Notice */}
      {!isBrowserOnline && (
        <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-center text-[11px] font-medium text-amber-600 dark:text-amber-300">
          You are offline — messages are saved locally and will sync automatically when online.
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 chat-scroll-area">
        {/* Encryption Safety Banner */}
        <div className="max-w-md mx-auto my-1 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
          <p className="text-[10px] text-amber-500 dark:text-amber-400 flex items-center justify-center gap-1.5 font-mono">
            <Lock className="w-3 h-3 shrink-0" />
            <span>Messages and voice memos are end-to-end encrypted. No one outside of this chat can read or listen to them.</span>
          </p>
        </div>

        {messages
          .filter(msg => !msg.deletedFor?.includes(currentUserId))
          .map(msg => {
            const isOwn = msg.senderId === currentUserId;
            const isMsgDeleted = Boolean(msg.isDeleted || msg.deletedForEveryone);
            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${isOwn ? 'items-end' : 'items-start'}`}
              >
                {/* Quote Reply preview if present */}
                {msg.replyToText && !isMsgDeleted && (
                  <div
                    className={`text-[11px] px-3 py-1 rounded-t-xl max-w-sm truncate italic border-x border-t ${
                      isOwn
                        ? 'bg-amber-900/40 text-amber-200 border-amber-700/50'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                    }`}
                  >
                    ↳ Replying to: {msg.replyToText}
                  </div>
                )}

                {/* Message Bubble with Sender @username and DP identification */}
                <div
                  className={`relative max-w-xs sm:max-w-md p-3 rounded-2xl text-xs leading-relaxed shadow-md ${
                    isMsgDeleted
                      ? 'bg-neutral-900/60 border border-neutral-800 text-neutral-400 italic rounded-2xl'
                      : isOwn
                      ? 'bg-gradient-to-br from-[var(--accent-surface)] to-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--text-main)] rounded-br-xs'
                      : 'bg-[var(--bg-bubble-in)] border border-[var(--border-bubble-in)] text-[var(--text-main)] rounded-bl-xs'
                  }`}
                >
                  {/* Incoming message: Show Sender's username tag */}
                  {!isOwn && !isMsgDeleted && (
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-mono text-[var(--accent-primary)] font-bold">
                      <span>@{chatUsername}</span>
                    </div>
                  )}

                  {/* Deleted message indicator */}
                  {isMsgDeleted ? (
                    <div className="py-0.5 flex items-center gap-2 text-neutral-400 dark:text-neutral-500 italic select-none">
                      <span className="text-sm opacity-70">🚫</span>
                      <span className="text-xs">This message was deleted</span>
                    </div>
                  ) : (
                    <>
                      {/* Media Attachment if present */}
                      {msg.mediaType === 'image' && msg.mediaUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden max-h-64 border border-white/10 shadow-inner">
                          <img
                            src={msg.mediaUrl}
                            alt="Attachment"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {msg.mediaType === 'video' && msg.mediaUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden max-h-64 border border-white/10">
                          <video src={msg.mediaUrl} controls className="w-full h-full" />
                        </div>
                      )}

                      {/* Voice Memo Player */}
                      {msg.mediaType === 'audio' && (
                        <div className="mb-1">
                          <VoiceNoteBubble
                            mediaUrl={msg.mediaUrl}
                            duration={msg.audioDuration || 7}
                            isOwn={isOwn}
                          />
                        </div>
                      )}

                      {/* Text or Live Sticker Content */}
                      {msg.mediaType !== 'audio' && (() => {
                        const trimmed = msg.text.trim();
                        const matchedLiveSticker = LIVE_STICKERS.find(s => s.emoji === trimmed);
                        if (matchedLiveSticker) {
                          return (
                            <div className="py-1 flex items-center gap-2">
                              <span className={`text-4xl sm:text-5xl ${matchedLiveSticker.anim}`}>
                                {matchedLiveSticker.emoji}
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-amber-400 border border-amber-500/20 font-semibold self-end">
                                LIVE
                              </span>
                            </div>
                          );
                        }
                        return <p className="break-words select-text whitespace-pre-wrap">{msg.text}</p>;
                      })()}
                    </>
                  )}

                {/* Footer: Timestamp, Edited badge, Read receipts with 1-tick / 2-tick / blue-tick */}
                <div className="mt-1 flex items-center justify-end gap-1 text-[9px] font-mono text-neutral-500 dark:text-neutral-400">
                  {msg.isEdited && <span className="italic mr-1">edited</span>}
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {isOwn && (() => {
                    const isSeen =
                      msg.deliveryStatus === 'read' ||
                      Boolean(msg.readBy && msg.readBy.some(id => id !== currentUserId));
                    const isDelivered =
                      msg.deliveryStatus === 'delivered' || (!msg.deliveryStatus && isContactOnline);

                    if (isSeen) {
                      return (
                        <span title="Seen / Read (Double Blue Tick)" className="flex items-center ml-0.5">
                          <CheckCheck className="w-3.5 h-3.5 text-sky-400 dark:text-sky-400 stroke-[2.5] drop-shadow-[0_0_3px_rgba(56,189,248,0.5)]" />
                        </span>
                      );
                    }
                    if (isDelivered) {
                      return (
                        <span title="Delivered, not seen yet (Double Black/Grey Tick)" className="flex items-center ml-0.5">
                          <CheckCheck className="w-3.5 h-3.5 text-neutral-800 dark:text-neutral-400 stroke-[2.2]" />
                        </span>
                      );
                    }
                    return (
                      <span title="Sent (Single Tick)" className="flex items-center ml-0.5">
                        <Check className="w-3.5 h-3.5 text-neutral-800 dark:text-neutral-400 stroke-[2.2]" />
                      </span>
                    );
                  })()}
                </div>

                {/* Reactions badge */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="absolute -bottom-2.5 right-2 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--accent-border)] text-[10px] shadow-sm">
                    {Array.from(new Set(Object.values(msg.reactions))).map((emoji, idx) => (
                      <span key={idx}>{emoji}</span>
                    ))}
                    <span className="text-[9px] text-neutral-400 font-mono ml-0.5">
                      {Object.keys(msg.reactions).length}
                    </span>
                  </div>
                )}
              </div>

              {/* Hover Actions: Emoji Reactions & Reply / Edit / Delete with clear button design */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 mt-1 transition-opacity">
                {!isMsgDeleted && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReaction(msg.id, '❤️')}
                      className="p-1 px-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] hover:scale-125 transition-transform text-xs shadow-sm"
                      title="Heart"
                    >
                      ❤️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReaction(msg.id, '👍')}
                      className="p-1 px-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] hover:scale-125 transition-transform text-xs shadow-sm"
                      title="Like"
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReaction(msg.id, '🔥')}
                      className="p-1 px-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] hover:scale-125 transition-transform text-xs shadow-sm"
                      title="Fire"
                    >
                      🔥
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(msg)}
                      className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-border)] text-neutral-400 hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] shadow-sm transition-all"
                      title="Reply"
                    >
                      <CornerUpLeft className="w-3 h-3" />
                    </button>
                    {isOwn && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMessage(msg);
                          setInputText(msg.text);
                        }}
                        className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-border)] text-neutral-400 hover:text-white hover:border-neutral-400 shadow-sm transition-all"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </>
                )}
                {/* Delete button: opens Delete for Everyone vs Delete for Me */}
                <button
                  type="button"
                  onClick={() => setMessageToDelete(msg)}
                  className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-border)] text-neutral-400 hover:text-rose-400 hover:border-rose-400 shadow-sm transition-all cursor-pointer"
                  title="Delete message"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quote reply banner */}
      {replyingTo && (
        <div className="px-4 py-2 bg-[var(--bg-sidebar)] border-t border-[var(--accent-border)] flex items-center justify-between text-xs text-[var(--text-main)]">
          <div className="truncate flex items-center gap-2">
            <CornerUpLeft className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
            <span className="truncate">Replying to: {replyingTo.text}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:text-white text-neutral-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editing message banner */}
      {editingMessage && (
        <div className="px-4 py-2 bg-[var(--bg-sidebar)] border-t border-[var(--accent-border)] flex items-center justify-between text-xs text-[var(--text-main)]">
          <div className="truncate flex items-center gap-2">
            <Edit2 className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
            <span className="truncate">Editing message: {editingMessage.text}</span>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setInputText('');
            }}
            className="p-1 hover:text-white text-neutral-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 100+ Emojis & Cartoons Keyboard */}
      {showEmojiPicker && (
        <EmojiKeyboard
          onSelectEmoji={emoji => setInputText(prev => prev + emoji)}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Input Bar: Text, Voice Note, Emojis, Attachments OR Blocked Notice */}
      {conversation.isBlocked ? (
        <div className="p-4 bg-rose-950/40 border-t border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-lg">
          <div className="flex items-center gap-2.5 text-rose-300 text-xs font-semibold">
            <span className="text-base">🚫</span>
            <span>You have blocked this contact. Unblock to send and receive messages.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              chatStore.toggleBlock(conversation.id);
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer shrink-0"
          >
            Unblock Contact
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-[var(--bg-sidebar)] border-t border-[var(--accent-border)] flex items-center gap-2 shrink-0 shadow-lg"
        >
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,video/*"
            className="hidden"
          />

          {/* Media Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--accent-primary)] hover:border-[var(--accent-primary)] hover:gold-glow-sm shadow-sm transition-all flex items-center justify-center shrink-0"
            title="Send Photo / File"
          >
            <Paperclip className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Emoji Keyboard Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--accent-primary)] hover:border-[var(--accent-primary)] hover:gold-glow-sm shadow-sm transition-all flex items-center justify-center shrink-0"
            title="1000 Live Animated Stickers & Emojis"
          >
            <Smile className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Voice Note Recording Bar or Text Input */}
          {isRecording ? (
            <div className="flex-1 flex items-center justify-between px-4 py-2 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-300">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-mono font-semibold">
                  Recording Voice Note: {Math.floor(recordingSeconds / 60)}:
                  {(recordingSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="text-xs font-semibold text-neutral-300 hover:text-white px-3 py-1.5 rounded-xl border border-neutral-700 bg-neutral-900/60 hover:border-neutral-500 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="text-xs font-bold text-black bg-[var(--accent-primary)] px-4 py-1.5 rounded-xl hover:gold-glow-sm transition-all shadow-md"
                >
                  Send Voice
                </button>
              </div>
            </div>
          ) : (
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Type encrypted message (press Enter to send)..."
              className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none transition-colors shadow-inner"
            />
          )}

          {/* Mic (Voice Note) or Send Button with Clear Design */}
          {inputText.trim() ? (
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl gold-button-accent text-black font-bold hover:gold-glow-sm transition-all shadow-md flex items-center gap-1.5 text-xs uppercase tracking-wider shrink-0"
              title="Send Message"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span>Send</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-3.5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0 text-xs font-semibold ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'gold-button border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-[var(--accent-primary)] hover:gold-glow-sm'
              }`}
              title={isRecording ? 'Click to Send Voice Note' : 'Click to Record Voice Note'}
            >
              <Mic className="w-4 h-4" />
              <span className="hidden sm:inline">Voice</span>
            </button>
          )}
        </form>
      )}

      {/* WhatsApp-Style Contact Info Modal: DP, Username, Bio, Privacy */}
      {isContactInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-[var(--bg-sidebar)] border border-[var(--accent-border)] gold-glow shadow-2xl flex flex-col items-center text-center space-y-4">
            <div className="w-full flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-semibold text-[var(--text-muted)]">Contact Info</span>
              <button
                onClick={() => setIsContactInfoOpen(false)}
                className="text-neutral-400 hover:text-[var(--text-main)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Large DP */}
            <div className="w-24 h-24 rounded-full bg-neutral-200 dark:bg-neutral-900 border-2 border-[var(--accent-border)] gold-glow flex items-center justify-center text-[var(--accent-primary)] font-bold text-3xl overflow-hidden shadow-lg">
              {chatAvatar ? (
                <img src={chatAvatar} alt={chatTitle} className="w-full h-full object-cover" />
              ) : (
                chatTitle.slice(0, 1).toUpperCase()
              )}
            </div>

            {/* Display Name & Username */}
            <div>
              <h2 className="text-base font-bold text-[var(--text-main)]">{chatTitle}</h2>
              <p className="text-xs font-mono text-[var(--accent-primary)] font-semibold mt-0.5">
                @{chatUsername}
              </p>
            </div>

            {/* Bio / About status */}
            <div className="w-full p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-left space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                About / Bio
              </span>
              <p className="text-xs text-[var(--text-main)] font-medium leading-relaxed">
                {chatBio}
              </p>
            </div>

            {/* Security Handshake Details */}
            <div className="w-full p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-300">
                <p className="font-bold">End-to-End Encrypted</p>
                <p className="text-[10px] text-amber-400/80 mt-0.5">
                  Messages and voice memos are protected by Sovereign AES-256 keys. Only you and @{chatUsername} have access.
                </p>
              </div>
            </div>


            <button
              onClick={() => setIsContactInfoOpen(false)}
              className="w-full py-2.5 rounded-xl gold-button text-xs font-bold text-[var(--text-main)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] shadow-sm transition-all"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
      {/* In-Chat Settings Modal (Profile DP/Name/Bio, WhatsApp Privacy, 3 Modes & 8 Colors, Chat Tools) */}
      {isChatSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-[var(--bg-sidebar)] border border-[var(--accent-border)] gold-glow shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-white/5 flex items-center justify-between bg-[var(--bg-card)] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                    <span>Chat & App Settings</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent-surface)] text-[var(--accent-primary)] border border-[var(--accent-border)]">
                      ERROREX
                    </span>
                  </h2>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Profile, Privacy, 3 modes & 14 themes
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChatSettingsOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-200/50 dark:bg-neutral-800/50 hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-Modal Navigation Tabs */}
            <div className="px-4 py-2 border-b border-neutral-200 dark:border-white/5 bg-[var(--bg-sidebar)] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              <button
                type="button"
                onClick={() => setChatSettingsTab('profile')}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  chatSettingsTab === 'profile'
                    ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <User className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Profile & DP</span>
              </button>

              <button
                type="button"
                onClick={() => setChatSettingsTab('privacy')}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  chatSettingsTab === 'privacy'
                    ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Privacy</span>
              </button>

              <button
                type="button"
                onClick={() => setChatSettingsTab('theme')}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  chatSettingsTab === 'theme'
                    ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Themes & 8 Colors</span>
              </button>

              <button
                type="button"
                onClick={() => setChatSettingsTab('chat')}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  chatSettingsTab === 'chat'
                    ? 'bg-[var(--accent-surface)] border border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Chat Tools</span>
              </button>
            </div>

            {/* Modal Body / Tab Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* TAB 1: Profile & DP */}
              {chatSettingsTab === 'profile' && (
                <div className="space-y-4">
                  {profileSavedNotice && (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Profile details updated successfully!</span>
                    </div>
                  )}

                  {/* DP Changer */}
                  <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] flex flex-col sm:flex-row items-center gap-4 shadow-sm">
                    <div className="relative group shrink-0">
                      <div className="w-20 h-20 rounded-full bg-neutral-200 dark:bg-neutral-900 border-2 border-[var(--accent-border)] gold-glow flex items-center justify-center text-[var(--accent-primary)] font-bold text-2xl overflow-hidden shadow-md">
                        {myPhotoURL ? (
                          <img src={myPhotoURL} alt="Profile DP" className="w-full h-full object-cover" />
                        ) : (
                          myDisplayName.slice(0, 1).toUpperCase() || 'N'
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => dpUploadRef.current?.click()}
                        className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] transition-opacity cursor-pointer"
                        title="Upload Profile Picture"
                      >
                        <Camera className="w-5 h-5 mb-0.5 text-[var(--accent-primary)]" />
                        <span>Change</span>
                      </button>
                      <input
                        type="file"
                        ref={dpUploadRef}
                        onChange={handleDpUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-1.5">
                      <div>
                        <h3 className="text-xs font-bold text-[var(--text-main)]">{myDisplayName}</h3>
                        <p className="text-[11px] font-mono text-[var(--accent-primary)]">@{myUsername}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => dpUploadRef.current?.click()}
                          className="py-1 px-2.5 rounded-lg gold-button text-[11px] font-semibold text-[var(--accent-primary)] hover:gold-glow-sm"
                        >
                          Upload DP
                        </button>
                        {myPhotoURL && (
                          <button
                            type="button"
                            onClick={() => setMyPhotoURL('')}
                            className="py-1 px-2 rounded-lg border border-neutral-700 text-[11px] text-neutral-400 hover:text-rose-400 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Preset Avatars */}
                      <div className="pt-1">
                        <span className="text-[10px] text-[var(--text-muted)] block mb-1">Preset Avatars:</span>
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          {HERALDIC_AVATARS.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt="Preset"
                              onClick={() => setMyPhotoURL(url)}
                              className="w-6 h-6 rounded-full object-cover border border-neutral-600 hover:border-[var(--accent-primary)] cursor-pointer hover:scale-110 transition-transform"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile Edit Form */}
                  <form onSubmit={handleSaveProfile} className="space-y-3.5">
                    {/* Display Name */}
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                        Display Name (Changeable)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={25}
                        value={myDisplayName}
                        onChange={e => setMyDisplayName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
                      />
                    </div>

                    {/* PERMANENT IMMUTABLE USERNAME */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                          <span>Username (@handle)</span>
                        </label>
                        <span className="text-[10px] font-mono text-[var(--accent-primary)] flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Customizable</span>
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-mono text-[var(--accent-primary)] font-bold">@</span>
                        <input
                          type="text"
                          required
                          maxLength={20}
                          value={myUsername}
                          onChange={e => setMyUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="your_handle"
                          className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--accent-primary)] focus:outline-none transition-colors"
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                        Your custom ERROREX username <strong>(@{myUsername})</strong> for finding contacts and receiving messages.
                      </p>
                    </div>

                    {/* Bio / About */}
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                        About / Bio Status (Changeable)
                      </label>
                      <textarea
                        rows={2}
                        value={myBio}
                        onChange={e => setMyBio(e.target.value)}
                        placeholder="Tell contacts about yourself..."
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
                      />

                      {/* Status presets */}
                      <div className="mt-1.5 space-y-1">
                        <span className="text-[10px] text-[var(--text-muted)] block">Status Presets:</span>
                        <div className="flex flex-wrap gap-1">
                          {WHATSAPP_STATUS_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setMyBio(preset)}
                              className={`py-0.5 px-2 rounded-lg text-[10px] border transition-colors ${
                                myBio === preset
                                  ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-semibold'
                                  : 'border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl gold-button-accent text-xs font-bold text-black uppercase tracking-wider hover:gold-glow-sm transition-all"
                    >
                      Save Profile Changes
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: WhatsApp Privacy Rules */}
              {chatSettingsTab === 'privacy' && (
                <div className="space-y-3.5">
                  {privacySavedNotice && (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Privacy settings saved successfully!</span>
                    </div>
                  )}

                  {/* 1. Profile Photo Privacy */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-2 shadow-sm">
                    <div>
                      <h3 className="text-xs font-bold text-[var(--text-main)]">Profile Photo (DP) Privacy</h3>
                      <p className="text-[10px] text-[var(--text-muted)]">Who can see your profile photo</p>
                    </div>
                    <div className="flex gap-1.5">
                      {(['everyone', 'contacts', 'nobody'] as const).map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updatePrivacyField('profilePhoto', option)}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-xl border capitalize transition-colors ${
                            privacy.profilePhoto === option
                              ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                              : 'border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          {option === 'contacts' ? 'My Contacts' : option}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Bio / About Privacy */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-2 shadow-sm">
                    <div>
                      <h3 className="text-xs font-bold text-[var(--text-main)]">About / Bio Privacy</h3>
                      <p className="text-[10px] text-[var(--text-muted)]">Who can view your status and bio information</p>
                    </div>
                    <div className="flex gap-1.5">
                      {(['everyone', 'contacts', 'nobody'] as const).map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updatePrivacyField('bio', option)}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-xl border capitalize transition-colors ${
                            privacy.bio === option
                              ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                              : 'border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          {option === 'contacts' ? 'My Contacts' : option}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Last Seen & Online Presence */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-2 shadow-sm">
                    <div>
                      <h3 className="text-xs font-bold text-[var(--text-main)]">Last Seen & Online Presence</h3>
                      <p className="text-[10px] text-[var(--text-muted)]">Control visibility of your active status</p>
                    </div>
                    <div className="flex gap-1.5">
                      {(['everyone', 'contacts', 'nobody'] as const).map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updatePrivacyField('lastSeen', option)}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-xl border capitalize transition-colors ${
                            privacy.lastSeen === option
                              ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold'
                              : 'border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          {option === 'contacts' ? 'My Contacts' : option}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Read Receipts */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] flex items-center justify-between shadow-sm">
                    <div>
                      <h3 className="text-xs font-bold text-[var(--text-main)]">Read Receipts (Blue Ticks)</h3>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Show double checkmarks when messages are read
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updatePrivacyField('readReceipts', !privacy.readReceipts)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        privacy.readReceipts ? 'bg-[var(--accent-primary)]' : 'bg-neutral-300 dark:bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          privacy.readReceipts ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: Themes & 8 Colors */}
              {chatSettingsTab === 'theme' && (
                <div className="space-y-4">
                  {/* Mode Selector: 3 Options (Dark, Light, System) */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-2 shadow-sm">
                    <div>
                      <h3 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span>Theme Mode (3 Options)</span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setMode('dark')}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                          mode === 'dark'
                            ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                            : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span>Dark Mode</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode('light')}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                          mode === 'light'
                            ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                            : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span>Light Mode</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode('system')}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                          mode === 'system'
                            ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--text-main)] shadow-sm'
                            : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        <Laptop className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span>System Auto</span>
                      </button>
                    </div>
                  </div>

                  {/* 14 Unique Colors */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span>14 Luxury Colors</span>
                      </h3>
                      <span className="text-[10px] font-mono text-[var(--accent-primary)] font-bold">
                        {THEMES.find(t => t.id === theme)?.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {THEMES.map(th => {
                        const isSelected = theme === th.id;
                        const colorNames: Record<string, string> = {
                          gold: 'Imperial Gold',
                          white: 'Platinum White',
                          black: 'Obsidian Black',
                          crimson: 'Blood Crimson',
                          midnight: 'Midnight Indigo',
                          forest: 'Dark Forest',
                          bronze: 'Dark Bronze',
                          emerald: 'Emerald Green',
                          ocean: 'Sapphire Blue',
                          purple: 'Royal Purple',
                          rose: 'Ruby Red',
                          sunset: 'Amber Orange',
                          electric: 'Cyan Blue',
                          teal: 'Midnight Teal'
                        };
                        const displayName = colorNames[th.id] || th.name;

                        return (
                          <div
                            key={th.id}
                            onClick={() => setTheme(th.id)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between shadow-sm ${
                              isSelected
                                ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] shadow-md'
                                : 'bg-[var(--bg-card)] border-neutral-200 dark:border-neutral-800 hover:border-[var(--accent-border)]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-6 h-6 rounded-full border border-white/20 shadow-sm shrink-0"
                                style={{ backgroundColor: th.primaryHex }}
                              />
                              <div className="truncate">
                                <h4 className="text-[11px] font-bold text-[var(--text-main)] truncate">{displayName}</h4>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-[var(--accent-primary)] text-black flex items-center justify-center shrink-0 ml-1">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Chat Tools */}
              {chatSettingsTab === 'chat' && (
                <div className="space-y-4">
                  {/* Mute Chat Toggle */}
                  <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-neutral-200 dark:bg-neutral-900 border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)]">
                        {isMuted ? <BellOff className="w-4 h-4 text-rose-400" /> : <Bell className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-main)]">Mute Notifications</h4>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {isMuted ? 'Muted for this private conversation' : 'Receive alerts for incoming messages'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMuted(!isMuted)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        isMuted ? 'bg-rose-600' : 'bg-neutral-300 dark:bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          isMuted ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Clear Chat History */}
                  <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-rose-950/40 space-y-2.5 shadow-sm">
                    <div className="flex items-center gap-2 text-rose-500">
                      <Trash2 className="w-4 h-4" />
                      <h4 className="text-xs font-bold">Clear Chat History</h4>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Permanently wipe all messages and voice memos in this conversation with <strong>{chatTitle}</strong>.
                    </p>

                    {clearChatConfirm ? (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 space-y-2">
                        <p className="text-xs text-rose-300 flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>Are you sure? This cannot be undone.</span>
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleClearChatHistory}
                            className="py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
                          >
                            Yes, Clear All Messages
                          </button>
                          <button
                            type="button"
                            onClick={() => setClearChatConfirm(false)}
                            className="py-1.5 px-3 rounded-lg border border-neutral-700 text-xs text-neutral-400 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setClearChatConfirm(true)}
                        className="py-2 px-3 rounded-xl border border-rose-800/60 hover:bg-rose-950/30 text-rose-400 text-xs font-semibold transition-colors"
                      >
                        Clear All Messages
                      </button>
                    )}
                  </div>

                  {/* Partner Information */}
                  <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-2">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                      Chat Security Handshake
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-900 border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-sm shrink-0 overflow-hidden">
                        {chatAvatar ? (
                          <img src={chatAvatar} alt={chatTitle} className="w-full h-full object-cover" />
                        ) : (
                          chatTitle.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--text-main)] truncate">{chatTitle}</p>
                        <p className="text-[10px] font-mono text-[var(--accent-primary)]">@{chatUsername}</p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">{chatBio}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 px-5 border-t border-neutral-200 dark:border-white/5 bg-[var(--bg-card)] flex items-center justify-between shrink-0">
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                ERROREX Sovereign Messenger
              </span>
              <button
                type="button"
                onClick={() => setIsChatSettingsOpen(false)}
                className="py-1.5 px-4 rounded-xl gold-button text-xs font-semibold text-[var(--text-main)] hover:gold-glow-sm"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp-Style Delete Message Dialog: Delete for Everyone vs Delete for Me */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--bg-card)] border border-[var(--accent-border)] p-5 sm:p-6 gold-glow shadow-2xl space-y-4 text-[var(--text-main)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-main)]">Delete Message?</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Choose how you wish to delete this message:</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {/* Option 1: Delete for Everyone (Available if own message) */}
              {messageToDelete.senderId === currentUserId && (
                <button
                  type="button"
                  onClick={() => {
                    chatStore.deleteMessageForEveryone(conversation.id, messageToDelete.id);
                    setMessageToDelete(null);
                  }}
                  className="w-full p-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-between transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <div className="text-left">
                      <p className="leading-none">Delete for Everyone</p>
                      <p className="text-[10px] text-white/80 font-normal mt-1">Deletes for both sender and receiver</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono">👥</span>
                </button>
              )}

              {/* Option 2: Delete for Me */}
              <button
                type="button"
                onClick={() => {
                  chatStore.deleteMessageForMe(conversation.id, messageToDelete.id, currentUserId);
                  setMessageToDelete(null);
                }}
                className="w-full p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 font-semibold text-xs flex items-center justify-between transition-all active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 shrink-0 text-neutral-400" />
                  <div className="text-left">
                    <p className="leading-none">Delete for Me</p>
                    <p className="text-[10px] text-neutral-400 font-normal mt-1">Deletes only from your chat screen</p>
                  </div>
                </div>
                <span className="text-xs font-mono">👤</span>
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="w-full py-2.5 rounded-xl border border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
