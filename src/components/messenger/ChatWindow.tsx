import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Conversation, FriendRequest, Friendship, PrivacySettings, ThemeName, ColorMode, UserProfile } from '../../types';
import { chatStore } from '../../lib/chatStore';
import { db, collection, onSnapshot, addDoc, updateDoc, doc } from '../../lib/firebase';
import { getCollectionData } from '../../lib/standaloneApi';
import { isUserCurrentlyOnline } from '../../lib/supabaseSync';
import {
  canViewProfilePhoto,
  canViewBio,
  canViewLastSeen,
  canExchangeReadReceipts,
  resolveTargetPrivacy
} from '../../lib/privacyUtils';
import { useTheme, THEMES } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { EmojiKeyboard, LIVE_STICKERS } from '../common/EmojiKeyboard';
import { parseStickerToken, StickerIllustration, toStickerToken } from '../common/CustomStickers';
import { parseCustomStickerMessage, encodeCustomStickerMessage } from '../../lib/customStickerStore';
import { CreatedStickerView } from '../common/CreatedStickerView';
import { StickerSaveModal, ChatStickerTapTarget } from '../common/StickerSaveModal';
import { StickerCreatorModal, StickerCreatorDraft } from '../common/StickerCreatorModal';
import { AvatarPreviewModal, AvatarPreviewTarget } from '../common/AvatarPreviewModal';
import { AvatarCropModal } from '../common/AvatarCropModal';
import {
  WALLPAPER_PRESETS,
  ChatWallpaperConfig,
  getChatWallpaper,
  setChatWallpaper,
  setGlobalChatWallpaper,
  clearChatWallpaper,
  clearGlobalChatWallpaper,
  compressWallpaperImage,
  isImageWallpaper
} from '../../lib/chatWallpaper';
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
  AlertTriangle,
  UserPlus,
  Clock,
  Crop,
  MoreVertical,
  Ban,
  Upload,
  RotateCcw
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
    <div className="flex items-center gap-2.5 sm:gap-3 p-2 px-2.5 sm:px-3 rounded-2xl bg-black/25 border border-white/10 min-w-[185px] sm:min-w-[235px]">
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
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [profileSavedNotice, setProfileSavedNotice] = useState(false);
  const dpUploadRef = useRef<HTMLInputElement>(null);

  // Delete message modal state (Delete for everyone vs Delete for me)
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);
  const [dpPreviewTarget, setDpPreviewTarget] = useState<AvatarPreviewTarget | null>(null);
  const [stickerTapTarget, setStickerTapTarget] = useState<ChatStickerTapTarget | null>(null);
  const [remixStickerDraft, setRemixStickerDraft] = useState<StickerCreatorDraft | null>(null);

  // WhatsApp Privacy settings inside in-chat settings
  const [privacy, setPrivacy] = useState<PrivacySettings>(() => chatStore.getPrivacySettings());
  const [privacySavedNotice, setPrivacySavedNotice] = useState(false);

  // Chat-specific options & in-chat 3-dot menu + Wallpaper modal state
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
  const [isClearChatModalOpen, setIsClearChatModalOpen] = useState(false);
  const [clearChatConfirm, setClearChatConfirm] = useState(false);
  const [wallpaperConfig, setWallpaperConfig] = useState<ChatWallpaperConfig | null>(() =>
    getChatWallpaper(conversation.id)
  );
  const [wallpaperDraft, setWallpaperDraft] = useState<ChatWallpaperConfig>(() =>
    getChatWallpaper(conversation.id) || {
      url: WALLPAPER_PRESETS[0].value,
      dimOpacity: WALLPAPER_PRESETS[0].dimOpacity
    }
  );
  const [wallpaperError, setWallpaperError] = useState<string | null>(null);
  const [isProcessingWallpaper, setIsProcessingWallpaper] = useState(false);
  const [wallpaperCropSrc, setWallpaperCropSrc] = useState<string | null>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const wallpaperFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = getChatWallpaper(conversation.id);
    setWallpaperConfig(saved);
    setWallpaperDraft(
      saved || {
        url: WALLPAPER_PRESETS[0].value,
        dimOpacity: WALLPAPER_PRESETS[0].dimOpacity
      }
    );
    setIsChatMenuOpen(false);
  }, [conversation.id]);

  useEffect(() => {
    if (!isChatMenuOpen) return;
    const handleOutside = (e: PointerEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setIsChatMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsChatMenuOpen(false);
    };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isChatMenuOpen]);

  const handleOpenWallpaperModal = () => {
    const current = getChatWallpaper(conversation.id);
    setWallpaperDraft(
      current || {
        url: WALLPAPER_PRESETS[0].value,
        dimOpacity: WALLPAPER_PRESETS[0].dimOpacity
      }
    );
    setWallpaperError(null);
    setIsChatMenuOpen(false);
    setIsWallpaperModalOpen(true);
  };

  const handleWallpaperFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setWallpaperError(null);
    setIsProcessingWallpaper(true);
    try {
      const compressed = await compressWallpaperImage(file);
      setWallpaperCropSrc(compressed);
    } catch {
      setWallpaperError('Could not load that image. Please try another photo.');
    } finally {
      setIsProcessingWallpaper(false);
    }
  };

  const handleApplyWallpaper = (scope: 'chat' | 'all') => {
    try {
      setWallpaperError(null);
      if (scope === 'all') {
        setGlobalChatWallpaper(wallpaperDraft);
      } else {
        setChatWallpaper(conversation.id, wallpaperDraft);
      }
      setWallpaperConfig({ ...wallpaperDraft });
      setIsWallpaperModalOpen(false);
    } catch {
      setWallpaperError('Storage limit reached for large photos. Try a smaller photo or a preset wallpaper.');
    }
  };

  const handleResetWallpaper = () => {
    clearChatWallpaper(conversation.id);
    clearGlobalChatWallpaper();
    setWallpaperConfig(null);
    setWallpaperError(null);
    setIsWallpaperModalOpen(false);
  };

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
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setCropSourceUrl(reader.result as string);
    };
  };

  const updatePrivacyField = (key: keyof PrivacySettings, value: any) => {
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    chatStore.savePrivacySettings(updated);
    updateUserProfile({ privacySettings: updated }).catch(() => {});
    setPrivacySavedNotice(true);
    setTimeout(() => setPrivacySavedNotice(false), 2500);
  };

  const handleClearChatHistory = () => {
    chatStore.clearMessages(conversation.id);
    setMessages([]);
    setClearChatConfirm(false);
    setIsClearChatModalOpen(false);
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
  const [friendshipsList, setFriendshipsList] = useState<Friendship[]>(() =>
    getCollectionData<Friendship>('friendships')
  );
  const [friendRequestsList, setFriendRequestsList] = useState<FriendRequest[]>(() =>
    getCollectionData<FriendRequest>('friendRequests')
  );
  const [requestSending, setRequestSending] = useState(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [, setPresenceTick] = useState(0);

  useEffect(() => {
    const unsubProfiles = onSnapshot(collection(db, 'userProfiles'), snap => {
      const list: UserProfile[] = [];
      snap.forEach((d: any) => list.push(d.data() as UserProfile));
      setDirectoryProfiles(list);
    });
    const unsubFriendships = onSnapshot(collection(db, 'friendships'), snap => {
      const list: Friendship[] = [];
      snap.forEach((d: any) => list.push({ id: d.id, ...(d.data() as Omit<Friendship, 'id'>) }));
      setFriendshipsList(list);
    });
    const unsubRequests = onSnapshot(collection(db, 'friendRequests'), snap => {
      const list: FriendRequest[] = [];
      snap.forEach((d: any) => list.push({ id: d.id, ...(d.data() as Omit<FriendRequest, 'id'>) }));
      setFriendRequestsList(list);
    });
    const onOnline = () => setIsBrowserOnline(true);
    const onOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const tick = setInterval(() => setPresenceTick(t => t + 1), 20000);
    return () => {
      unsubProfiles();
      unsubFriendships();
      unsubRequests();
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

  const friendships = friendshipsList;
  const otherDetail = otherParticipantId ? conversation.participantDetails?.[otherParticipantId] : undefined;

  const resolvedOtherUid =
    otherParticipantId &&
    otherParticipantId !== currentUserId &&
    !otherParticipantId.startsWith('contact_')
      ? otherParticipantId
      : liveProfile?.uid || '';

  const isVaultOrGroup =
    Boolean(conversation.isGroup) ||
    conversation.id === 'conv_vault' ||
    otherParticipantId === 'vault_secure';

  const isAcceptedFriend =
    isVaultOrGroup ||
    Boolean(
      resolvedOtherUid &&
        friendshipsList.some(
          f =>
            Array.isArray(f.users) &&
            f.users.includes(currentUserId) &&
            f.users.includes(resolvedOtherUid)
        )
    );

  const pendingIncomingReq =
    !isAcceptedFriend && resolvedOtherUid
      ? friendRequestsList.find(
          r =>
            r.senderId === resolvedOtherUid &&
            r.receiverId === currentUserId &&
            r.status === 'pending'
        )
      : undefined;

  const pendingOutgoingReq =
    !isAcceptedFriend && resolvedOtherUid
      ? friendRequestsList.find(
          r =>
            r.senderId === currentUserId &&
            r.receiverId === resolvedOtherUid &&
            r.status === 'pending'
        )
      : undefined;

  const allowPhoto =
    conversation.isGroup ||
    canViewProfilePhoto(currentUserId, otherParticipantId, chatUsername, liveProfile, otherDetail, allContacts, friendships);
  const allowBio =
    conversation.isGroup ||
    canViewBio(currentUserId, otherParticipantId, chatUsername, liveProfile, otherDetail, allContacts, friendships);
  const allowOnline =
    conversation.isGroup ||
    canViewLastSeen(currentUserId, otherParticipantId, chatUsername, liveProfile, otherDetail, allContacts, friendships);
  const targetPrivacy = resolveTargetPrivacy(liveProfile, otherDetail);
  const allowReadReceipts = conversation.isGroup
    ? privacy.readReceipts !== false
    : canExchangeReadReceipts(privacy, targetPrivacy);

  const isContactOnlineRaw = !isBrowserOnline
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

  const isContactOnline = allowOnline ? isContactOnlineRaw : false;

  const rawAvatar = conversation.isGroup
    ? conversation.groupPhoto
    : liveProfile?.photoURL || contactItem?.photoURL || otherDetail?.photoURL;
  const chatAvatar = allowPhoto ? rawAvatar : undefined;

  const rawBio =
    liveProfile?.bio ||
    otherDetail?.bio ||
    contactItem?.bio ||
    'Encrypted contact • Active on ERROREX Sovereign Network';
  const visibleBio = allowBio ? rawBio : null;
  const chatBio = allowBio ? rawBio : 'Bio hidden by privacy settings';

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
    if (conversation.isBlocked || !isAcceptedFriend) return;
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
    if (conversation.isBlocked || !isAcceptedFriend) return;
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
    if (conversation.isBlocked || !isAcceptedFriend) {
      cancelRecording();
      return;
    }
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
    if (conversation.isBlocked || !isAcceptedFriend) return;
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

  const handleSendInChatFriendRequest = async () => {
    if (!resolvedOtherUid || requestSending) return;
    setRequestSending(true);
    try {
      await addDoc(collection(db, 'friendRequests'), {
        senderId: currentUserId,
        senderName: userProfile?.displayName || currentUserName || 'User',
        senderUsername: userProfile?.username || storedProfile.username || 'member',
        senderPhoto: userProfile?.photoURL || storedProfile.photoURL || '',
        receiverId: resolvedOtherUid,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Friend request send notice:', err);
    } finally {
      setRequestSending(false);
    }
  };

  const handleAcceptInChatFriendRequest = async () => {
    if (!pendingIncomingReq || !resolvedOtherUid || requestSending) return;
    setRequestSending(true);
    try {
      await updateDoc(doc(db, 'friendRequests', pendingIncomingReq.id), {
        status: 'accepted'
      });
      await addDoc(collection(db, 'friendships'), {
        user1Id: pendingIncomingReq.senderId,
        user2Id: pendingIncomingReq.receiverId,
        users: [pendingIncomingReq.senderId, pendingIncomingReq.receiverId],
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Friend request accept notice:', err);
    } finally {
      setRequestSending(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-[var(--bg-window)] text-[var(--text-main)] relative select-none transition-colors">
      {/* Top Header: Contact Details, Live Net Status, and Encrypted Badge */}
      <div className="py-2.5 px-3 sm:px-4 bg-[var(--bg-sidebar)] border-b border-[var(--accent-border)] flex items-center justify-between gap-2 relative z-30 shrink-0 shadow-sm">
        <div
          onClick={() => setIsContactInfoOpen(true)}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group flex-1 min-w-0"
          title="Click to view Contact Profile & Info"
        >
          {onCloseMobileChat && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onCloseMobileChat();
              }}
              aria-label="Back to conversations"
              className="md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--accent-primary)] hover:border-[var(--accent-primary)] shadow-sm shrink-0"
              title="Back to conversations"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setDpPreviewTarget({
                displayName: chatTitle,
                username: chatUsername,
                photoURL: chatAvatar || null,
                bio: visibleBio,
                isOnline: isContactOnline,
                showOnlineStatus: allowOnline,
                photoHiddenByPrivacy: !allowPhoto,
                bioHiddenByPrivacy: !allowBio
              });
            }}
            className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-900 border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-sm shrink-0 overflow-hidden shadow-sm hover:scale-105 hover:border-[var(--accent-primary)] transition-all cursor-pointer"
            title="View Profile Photo & Bio"
          >
            {chatAvatar ? (
              <img src={chatAvatar} alt={chatTitle} className="w-full h-full object-cover" />
            ) : (
              chatTitle.slice(0, 1).toUpperCase()
            )}
          </button>

          <div className="flex flex-col text-left min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-sm font-bold text-[var(--text-main)] tracking-wide truncate group-hover:text-[var(--accent-primary)] transition-colors">
                {chatTitle}
              </h2>
              <span className="text-[10px] font-mono text-[var(--accent-primary)] truncate shrink-0 max-w-[90px] sm:max-w-[140px]">
                @{chatUsername}
              </span>
              {conversation.isBlocked && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 uppercase tracking-wider shrink-0">
                  Blocked
                </span>
              )}
            </div>
            {/* Live Online / Offline status & Bio snippet */}
            <div className="flex items-center gap-1.5 text-[10px] min-w-0">
              {allowOnline && (
                <span className="flex items-center gap-1 font-mono shrink-0">
                  <span className={`w-2 h-2 rounded-full ${isContactOnline ? 'bg-emerald-500' : 'bg-neutral-500'}`} />
                  <span className={isContactOnline ? 'text-emerald-500 dark:text-emerald-400 font-semibold' : 'text-neutral-500 font-medium'}>
                    {isContactOnline ? 'Online' : 'Offline'}
                  </span>
                </span>
              )}
              {allowOnline && visibleBio && <span className="text-neutral-500 shrink-0">·</span>}
              {visibleBio ? (
                <span className="text-[var(--text-muted)] truncate">{visibleBio}</span>
              ) : !allowOnline ? (
                <span className="text-neutral-500 font-mono truncate">Privacy active</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Header Right: Encrypted Badge + In-Chat 3-Dot Menu (Wallpaper, Clear Chat, Block, Mute, Info) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsContactInfoOpen(true)}
            aria-label="Contact info & encryption"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center gap-1.5 px-2.5 sm:px-3 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-xs font-mono text-[var(--accent-primary)] hover:border-[var(--accent-primary)] hover:gold-glow-sm transition-all shadow-sm cursor-pointer"
            title="Encrypted Conversation"
          >
            <ShieldCheck className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Encrypted</span>
          </button>

          <div className="relative" ref={chatMenuRef}>
            <button
              type="button"
              onClick={() => setIsChatMenuOpen(prev => !prev)}
              aria-label="Chat options menu"
              aria-expanded={isChatMenuOpen}
              className={`min-w-[40px] min-h-[40px] rounded-xl border flex items-center justify-center transition-all shadow-sm cursor-pointer ${
                isChatMenuOpen
                  ? 'bg-[var(--accent-surface)] border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'bg-[var(--bg-card)] border-[var(--accent-border)] text-[var(--text-main)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]'
              }`}
              title="Chat Options (Wallpaper, Clear Chat, Block)"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isChatMenuOpen && (
              <div
                onClick={e => e.stopPropagation()}
                className="absolute right-0 top-12 w-52 max-w-[calc(100vw-2rem)] rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--accent-border)] gold-glow shadow-2xl py-1.5 z-50 text-[var(--text-main)]"
              >
                <button
                  type="button"
                  onClick={handleOpenWallpaperModal}
                  className="w-full px-3.5 py-2.5 text-xs flex items-center gap-2.5 hover:bg-[var(--accent-surface)] hover:text-[var(--accent-primary)] text-left transition-colors cursor-pointer font-medium"
                >
                  <ImageIcon className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                  <span>Chat Wallpaper</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsChatMenuOpen(false);
                    setIsClearChatModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2.5 text-xs flex items-center gap-2.5 hover:bg-[var(--accent-surface)] hover:text-[var(--accent-primary)] text-left transition-colors cursor-pointer font-medium"
                >
                  <Trash2 className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                  <span>Clear Chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    chatStore.toggleMute(conversation.id);
                    setIsChatMenuOpen(false);
                  }}
                  className="w-full px-3.5 py-2.5 text-xs flex items-center gap-2.5 hover:bg-[var(--accent-surface)] hover:text-[var(--accent-primary)] text-left transition-colors cursor-pointer"
                >
                  {conversation.isMuted ? (
                    <>
                      <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Unmute Notifications</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Mute Notifications</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsChatMenuOpen(false);
                    setIsContactInfoOpen(true);
                  }}
                  className="w-full px-3.5 py-2.5 text-xs flex items-center gap-2.5 hover:bg-[var(--accent-surface)] hover:text-[var(--accent-primary)] text-left transition-colors cursor-pointer"
                >
                  <Info className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                  <span>Contact Info</span>
                </button>

                {!isVaultOrGroup && (
                  <>
                    <div className="h-px bg-neutral-200 dark:bg-white/10 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        chatStore.toggleBlock(conversation.id);
                        setIsChatMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2.5 text-xs flex items-center gap-2.5 hover:bg-rose-500/15 text-rose-500 dark:text-rose-400 text-left transition-colors cursor-pointer font-semibold"
                    >
                      <Ban className="w-4 h-4 shrink-0" />
                      <span>{conversation.isBlocked ? 'Unblock User' : 'Block User'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Offline Auto-Queue Notice */}
      {!isBrowserOnline && (
        <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-center text-[11px] font-medium text-amber-600 dark:text-amber-300">
          You are offline — messages are saved locally and will sync automatically when online.
        </div>
      )}

      {/* Messages Wrapper with Optional Custom Photo / Gradient Wallpaper */}
      <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
        {wallpaperConfig && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center transition-all duration-300"
              style={
                isImageWallpaper(wallpaperConfig.url)
                  ? { backgroundImage: `url("${wallpaperConfig.url}")` }
                  : { background: wallpaperConfig.url }
              }
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-200"
              style={{ backgroundColor: `rgba(0, 0, 0, ${wallpaperConfig.dimOpacity})` }}
            />
          </>
        )}

        {/* Messages Scroll Area */}
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 chat-scroll-area">
          {/* Encryption Safety Banner */}
          <div className="max-w-md mx-auto my-1 p-2.5 rounded-xl bg-amber-500/15 backdrop-blur-sm border border-amber-500/25 text-center">
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
            const trimmedText = (msg.text || '').trim();
            const parsedCustomSticker = !isMsgDeleted ? parseStickerToken(trimmedText) : null;
            const parsedCreatedSticker = !isMsgDeleted ? parseCustomStickerMessage(trimmedText) : null;
            const isFloatingSticker = Boolean(
              !isMsgDeleted &&
                (parsedCustomSticker || (parsedCreatedSticker && msg.mediaUrl))
            );
            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${isOwn ? 'items-end' : 'items-start'}`}
              >
                {/* Quote Reply preview if present */}
                {msg.replyToText && !isMsgDeleted && (
                  <div
                    className={`text-[11px] px-3 py-1 rounded-t-xl max-w-[85%] sm:max-w-sm truncate italic border-x border-t ${
                      isOwn
                        ? 'bg-[var(--accent-surface)] text-[var(--accent-primary)] border-[var(--accent-border)]'
                        : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--accent-border)]'
                    }`}
                  >
                    ↳ Replying to: {msg.replyToText}
                  </div>
                )}

                {/* Message Bubble (transparent/borderless for pure stickers) */}
                <div
                  className={`relative max-w-[88%] sm:max-w-md lg:max-w-lg xl:max-w-xl text-[13px] leading-relaxed ${
                    isFloatingSticker
                      ? 'p-1 bg-transparent'
                      : `p-3 rounded-2xl shadow-md ${
                          isMsgDeleted
                            ? 'bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--text-muted)] italic rounded-2xl'
                            : isOwn
                            ? 'bg-gradient-to-br from-[var(--accent-surface)] to-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--text-main)] rounded-br-xs'
                            : 'bg-[var(--bg-bubble-in)] border border-[var(--border-bubble-in)] text-[var(--text-main)] rounded-bl-xs'
                        }`
                  }`}
                >
                  {/* Incoming message: Show Sender's username tag */}
                  {!isOwn && !isMsgDeleted && !isFloatingSticker && (
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
                  ) : parsedCreatedSticker && msg.mediaUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        setStickerTapTarget({
                          type: 'media',
                          kind: parsedCreatedSticker.kind,
                          mediaUrl: msg.mediaUrl!,
                          meta: parsedCreatedSticker.meta,
                          senderLabel: isOwn ? 'You' : `@${chatUsername}`
                        })
                      }
                      className="py-1 flex flex-col items-center cursor-pointer hover:scale-[1.03] active:scale-95 transition-transform focus:outline-none"
                      title="Tap to save sticker to keyboard"
                    >
                      <CreatedStickerView
                        kind={parsedCreatedSticker.kind}
                        mediaUrl={msg.mediaUrl}
                        meta={parsedCreatedSticker.meta}
                        size="md"
                      />
                    </button>
                  ) : parsedCustomSticker ? (
                    <button
                      type="button"
                      onClick={() =>
                        setStickerTapTarget({
                          type: 'builtin',
                          sticker: parsedCustomSticker,
                          senderLabel: isOwn ? 'You' : `@${chatUsername}`
                        })
                      }
                      className="py-1 flex flex-col items-center cursor-pointer hover:scale-[1.03] active:scale-95 transition-transform focus:outline-none"
                      title="Tap to save sticker to keyboard"
                    >
                      <StickerIllustration sticker={parsedCustomSticker} size="lg" />
                    </button>
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

                      {/* Text or Live Emoji Content */}
                      {msg.mediaType !== 'audio' && (() => {
                        const matchedLiveSticker = LIVE_STICKERS.find(s => s.emoji === trimmedText);
                        if (matchedLiveSticker) {
                          return (
                            <div className="py-1 flex items-center gap-2">
                              <span className="text-4xl sm:text-5xl">
                                {matchedLiveSticker.emoji}
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
                      allowReadReceipts &&
                      (msg.deliveryStatus === 'read' ||
                        Boolean(msg.readBy && msg.readBy.some(id => id !== currentUserId)));
                    const isDelivered =
                      !isSeen &&
                      (msg.deliveryStatus === 'delivered' ||
                        msg.deliveryStatus === 'read' ||
                        (!msg.deliveryStatus && isContactOnline));

                    if (isSeen) {
                      return (
                        <span title="Seen / Read (Double Blue Tick)" className="flex items-center ml-0.5">
                          <CheckCheck className="w-3.5 h-3.5 text-sky-400 dark:text-sky-400 stroke-[2.5] drop-shadow-[0_0_3px_rgba(56,189,248,0.5)]" />
                        </span>
                      );
                    }
                    if (isDelivered) {
                      return (
                        <span title="Delivered, not seen yet (Double Grey Tick)" className="flex items-center ml-0.5">
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

              {/* Message Actions: Always accessible on touchscreens, hover-reveal on desktop */}
              <div className="opacity-90 md:opacity-0 md:group-hover:opacity-100 flex items-center gap-1.5 mt-1.5 transition-opacity">
                {!isMsgDeleted && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReaction(msg.id, '❤️')}
                      className="min-w-[32px] min-h-[32px] px-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] hover:scale-110 transition-transform text-xs shadow-sm flex items-center justify-center"
                      title="Heart"
                    >
                      ❤️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReaction(msg.id, '👍')}
                      className="min-w-[32px] min-h-[32px] px-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] hover:scale-110 transition-transform text-xs shadow-sm flex items-center justify-center"
                      title="Like"
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReaction(msg.id, '🔥')}
                      className="min-w-[32px] min-h-[32px] px-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] hover:scale-110 transition-transform text-xs shadow-sm flex items-center justify-center"
                      title="Fire"
                    >
                      🔥
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(msg)}
                      className="min-w-[32px] min-h-[32px] p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] shadow-sm transition-all flex items-center justify-center"
                      title="Reply"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>
                    {isOwn && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMessage(msg);
                          setInputText(msg.text);
                        }}
                        className="min-w-[32px] min-h-[32px] p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-primary)] shadow-sm transition-all flex items-center justify-center"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
                {/* Delete button: opens Delete for Everyone vs Delete for Me */}
                <button
                  type="button"
                  onClick={() => setMessageToDelete(msg)}
                  className="min-w-[32px] min-h-[32px] p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--text-muted)] hover:text-rose-400 hover:border-rose-400 shadow-sm transition-all cursor-pointer flex items-center justify-center"
                  title="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quote reply banner */}
      {replyingTo && (
        <div className="px-4 py-2 bg-[var(--bg-sidebar)] border-t border-[var(--accent-border)] flex items-center justify-between text-xs text-[var(--text-main)]">
          <div className="truncate flex items-center gap-2">
            <CornerUpLeft className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
            <span className="truncate">Replying to: {replyingTo.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:text-[var(--text-main)] text-[var(--text-muted)]"
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
            type="button"
            onClick={() => {
              setEditingMessage(null);
              setInputText('');
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:text-[var(--text-main)] text-[var(--text-muted)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Emojis & Stickers Keyboard */}
      {showEmojiPicker && (
        <EmojiKeyboard
          onSelectEmoji={emoji => setInputText(prev => prev + emoji)}
          onSelectSticker={stickerToken => {
            if (conversation.isBlocked || !isAcceptedFriend) return;
            const reply = replyingTo
              ? { id: replyingTo.id, text: replyingTo.text.slice(0, 80) }
              : undefined;
            chatStore.sendMessage(
              conversation.id,
              currentUserId,
              currentUserName || 'User',
              stickerToken,
              undefined,
              'none',
              reply
            );
            setReplyingTo(null);
            setShowEmojiPicker(false);
          }}
          onSendMediaSticker={({ text, mediaUrl, mediaType }) => {
            if (conversation.isBlocked || !isAcceptedFriend) return;
            const reply = replyingTo
              ? { id: replyingTo.id, text: replyingTo.text.slice(0, 80) }
              : undefined;
            chatStore.sendMessage(
              conversation.id,
              currentUserId,
              currentUserName || 'User',
              text,
              mediaUrl,
              mediaType,
              reply
            );
            setReplyingTo(null);
            setShowEmojiPicker(false);
          }}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Input Bar: Text, Voice Note, Emojis, Attachments OR Blocked / Friend-Request Lock Notice */}
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
      ) : !isAcceptedFriend ? (
        <div className="px-3.5 sm:px-4 py-3.5 pb-[max(0.9rem,env(safe-area-inset-bottom))] bg-[var(--bg-card)] text-[var(--text-main)] border-t border-[var(--accent-border)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-lg">
          {pendingIncomingReq ? (
            <>
              <div className="flex items-center gap-2.5 text-xs font-medium text-[var(--text-main)]">
                <UserPlus className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  <strong className="font-bold">@{chatUsername}</strong> sent you a friend request. Accept to start messaging.
                </span>
              </div>
              <button
                type="button"
                disabled={requestSending}
                onClick={handleAcceptInChatFriendRequest}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer shrink-0 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Accept Request</span>
              </button>
            </>
          ) : pendingOutgoingReq ? (
            <div className="w-full flex items-center justify-center sm:justify-start gap-2.5 text-xs font-medium text-amber-600 dark:text-amber-300">
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                Friend request sent to <strong>@{chatUsername}</strong>. You can message once they accept your request.
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 text-xs font-medium text-[var(--text-muted)]">
                <Lock className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                <span>
                  You cannot message <strong className="text-[var(--text-main)]">@{chatUsername}</strong> yet. Send a friend request and wait for acceptance first.
                </span>
              </div>
              {resolvedOtherUid && (
                <button
                  type="button"
                  disabled={requestSending}
                  onClick={handleSendInChatFriendRequest}
                  className="min-h-[40px] px-4 py-2 rounded-xl gold-button-accent text-black font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Send Friend Request</span>
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleSendMessage}
          className="px-2.5 sm:px-3 pt-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] bg-[var(--bg-sidebar)] border-t border-[var(--accent-border)] flex items-center gap-1.5 sm:gap-2 shrink-0 shadow-lg"
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
            className="min-w-[40px] min-h-[40px] p-2 sm:p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--accent-primary)] hover:border-[var(--accent-primary)] hover:gold-glow-sm shadow-sm transition-all flex items-center justify-center shrink-0 cursor-pointer"
            title="Send Photo / File"
          >
            <Paperclip className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Emoji & Stickers Keyboard Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="min-w-[40px] min-h-[40px] p-2 sm:p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--accent-primary)] hover:border-[var(--accent-primary)] hover:gold-glow-sm shadow-sm transition-all flex items-center justify-center shrink-0 cursor-pointer"
            title="Emojis & Stickers"
          >
            <Smile className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Voice Note Recording Bar or Text Input */}
          {isRecording ? (
            <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-300">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="text-xs font-mono font-semibold truncate">
                  {Math.floor(recordingSeconds / 60)}:
                  {(recordingSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="min-h-[34px] text-xs font-semibold text-neutral-300 hover:text-white px-2.5 py-1 rounded-xl border border-neutral-700 bg-neutral-900/60 hover:border-neutral-500 transition-colors shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="min-h-[34px] text-xs font-bold text-black bg-[var(--accent-primary)] px-3 py-1 rounded-xl hover:gold-glow-sm transition-all shadow-md cursor-pointer"
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
              placeholder="Type encrypted message..."
              className="flex-1 min-w-0 min-h-[40px] px-3 sm:px-4 py-2 sm:py-2.5 text-base sm:text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] placeholder-neutral-500 focus:outline-none transition-colors shadow-inner"
            />
          )}

          {/* Mic (Voice Note) or Send Button with Clear Design */}
          {inputText.trim() ? (
            <button
              type="submit"
              className="min-w-[40px] min-h-[40px] px-3 sm:px-4 py-2.5 rounded-xl gold-button-accent text-black font-bold hover:gold-glow-sm transition-all shadow-md flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider shrink-0 cursor-pointer"
              title="Send Message"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Send</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`min-w-[40px] min-h-[40px] px-3 sm:px-3.5 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 text-xs font-semibold cursor-pointer ${
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

      {/* Contact Info Modal: DP, Username, Bio, Privacy */}
      {isContactInfoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
          onClick={() => setIsContactInfoOpen(false)}
        >
          <div
            className="w-full sm:max-w-sm p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] rounded-t-3xl sm:rounded-3xl bg-[var(--bg-sidebar)] border-t sm:border border-[var(--accent-border)] gold-glow shadow-2xl flex flex-col items-center text-center space-y-4 max-h-[92dvh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sm:hidden w-10 h-1 rounded-full bg-neutral-400/40 mx-auto -mt-1" />

            <div className="w-full flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-white/5">
              <span className="text-xs font-semibold text-[var(--text-muted)]">Contact Info</span>
              <button
                type="button"
                onClick={() => setIsContactInfoOpen(false)}
                aria-label="Close contact info"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-neutral-200/50 dark:hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Large Clickable DP */}
            <button
              type="button"
              onClick={() =>
                setDpPreviewTarget({
                  displayName: chatTitle,
                  username: chatUsername,
                  photoURL: chatAvatar || null,
                  bio: visibleBio,
                  isOnline: isContactOnline,
                  showOnlineStatus: allowOnline,
                  photoHiddenByPrivacy: !allowPhoto,
                  bioHiddenByPrivacy: !allowBio
                })
              }
              className="w-24 h-24 rounded-full bg-neutral-200 dark:bg-neutral-900 border-2 border-[var(--accent-border)] hover:border-[var(--accent-primary)] gold-glow flex items-center justify-center text-[var(--accent-primary)] font-bold text-3xl overflow-hidden shadow-lg hover:scale-105 transition-transform cursor-pointer"
              title="Tap to view full-size DP"
            >
              {chatAvatar ? (
                <img src={chatAvatar} alt={chatTitle} className="w-full h-full object-cover" />
              ) : (
                chatTitle.slice(0, 1).toUpperCase()
              )}
            </button>

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
              <p className={`text-xs font-medium leading-relaxed ${allowBio ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] italic'}`}>
                {chatBio}
              </p>
            </div>

            {/* Security Handshake Details */}
            <div className="w-full p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-700 dark:text-amber-300">
                <p className="font-bold">End-to-End Encrypted</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400/80 mt-0.5">
                  Messages and voice memos are protected by Sovereign AES-256 keys. Only you and @{chatUsername} have access.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsContactInfoOpen(false)}
              className="w-full min-h-[44px] py-2.5 rounded-xl gold-button text-xs font-bold text-[var(--text-main)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] shadow-sm transition-all"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
      {/* In-Chat Settings Modal */}
      {isChatSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full sm:max-w-xl max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[var(--bg-sidebar)] border-t sm:border border-[var(--accent-border)] gold-glow shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-white/5 flex items-center justify-between bg-[var(--bg-card)] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-main)]">
                    Chat & App Settings
                  </h2>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Profile, Privacy, Modes & Theme Colors
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChatSettingsOpen(false)}
                aria-label="Close settings"
                className="w-9 h-9 rounded-full bg-neutral-200/50 dark:bg-neutral-800/50 hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
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
                <span>Theme Colors</span>
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
                          <>
                            <button
                              type="button"
                              onClick={() => setCropSourceUrl(myPhotoURL)}
                              className="py-1 px-2.5 rounded-lg border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-[11px] font-semibold text-[var(--text-main)] flex items-center gap-1 cursor-pointer"
                            >
                              <Crop className="w-3 h-3 text-[var(--accent-primary)]" />
                              <span>Crop DP</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setMyPhotoURL('')}
                              className="py-1 px-2 rounded-lg border border-neutral-700 text-[11px] text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>

                      {/* Preset Avatars */}
                      <div className="pt-1">
                        <span className="text-[10px] text-[var(--text-muted)] block mb-1.5">Preset Avatars:</span>
                        <div className="flex items-center justify-center sm:justify-start gap-2.5">
                          {HERALDIC_AVATARS.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt="Preset"
                              onClick={() => setMyPhotoURL(url)}
                              className="w-9 h-9 rounded-full object-cover border border-neutral-400 dark:border-neutral-600 hover:border-[var(--accent-primary)] cursor-pointer hover:scale-110 transition-transform"
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
                        className="w-full px-3.5 py-2.5 sm:py-2 text-base sm:text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
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
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm sm:text-xs font-mono text-[var(--accent-primary)] font-bold">@</span>
                        <input
                          type="text"
                          required
                          maxLength={20}
                          value={myUsername}
                          onChange={e => setMyUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="your_handle"
                          className="w-full pl-8 pr-3 py-2.5 sm:py-2 text-base sm:text-xs font-mono rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--accent-primary)] focus:outline-none transition-colors"
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                        Your custom ERROREX username <strong>(@{myUsername})</strong> for finding contacts and receiving messages.
                      </p>
                    </div>

                    {/* Bio / About */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-[var(--text-main)]">
                          About / Bio Status (Changeable)
                        </label>
                        <span className="text-[10px] text-neutral-500 font-mono tabular-nums">
                          {myBio.length}/80
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        maxLength={80}
                        value={myBio}
                        onChange={e => setMyBio(e.target.value.slice(0, 80))}
                        placeholder="Tell contacts about yourself (max 80 chars)..."
                        className="w-full px-3.5 py-2.5 sm:py-2 text-base sm:text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--accent-primary)] text-[var(--text-main)] focus:outline-none"
                      />

                      {/* Status presets */}
                      <div className="mt-1.5 space-y-1">
                        <span className="text-[10px] text-[var(--text-muted)] block">Status Presets:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {WHATSAPP_STATUS_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setMyBio(preset.slice(0, 80))}
                              className={`py-1 px-2.5 rounded-lg text-[11px] sm:text-[10px] border transition-colors ${
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
                      className="w-full min-h-[44px] py-2.5 rounded-xl gold-button-accent text-xs font-bold text-black uppercase tracking-wider hover:gold-glow-sm transition-all"
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

                  {/* Theme Colors (Swatches only, no written color names) */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span>Theme Colors</span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {THEMES.map(th => {
                        const isSelected = theme === th.id;
                        const swatchBg =
                          th.isRainbow || th.id === 'rainbow'
                            ? 'linear-gradient(135deg, #FF0055 0%, #FF7700 25%, #FFDD00 50%, #00CC66 75%, #0099FF 100%)'
                            : `linear-gradient(135deg, ${th.primaryHex} 0%, ${th.secondaryHex} 100%)`;

                        return (
                          <button
                            key={th.id}
                            type="button"
                            onClick={() => setTheme(th.id)}
                            aria-label={`Select color ${th.id}`}
                            aria-pressed={isSelected}
                            className={`aspect-square min-h-[44px] rounded-xl border cursor-pointer transition-all flex items-center justify-center shadow-sm ${
                              isSelected
                                ? 'bg-[var(--accent-surface)] border-2 border-[var(--accent-primary)] scale-105 shadow-md'
                                : 'bg-[var(--bg-card)] border-neutral-200 dark:border-neutral-800 hover:border-[var(--accent-border)] hover:scale-105'
                            }`}
                          >
                            <div
                              className="w-7 h-7 rounded-full border border-white/30 shadow-inner flex items-center justify-center"
                              style={{ background: swatchBg }}
                            >
                              {isSelected && (
                                <Check
                                  className={`w-3.5 h-3.5 stroke-[3] ${
                                    th.checkColor === 'light' ? 'text-white' : 'text-black'
                                  }`}
                                />
                              )}
                            </div>
                          </button>
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
                        {conversation.isMuted ? <BellOff className="w-4 h-4 text-rose-400" /> : <Bell className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-main)]">Mute Notifications</h4>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {conversation.isMuted ? 'Muted for this private conversation' : 'Receive alerts for incoming messages'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => chatStore.toggleMute(conversation.id)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        conversation.isMuted ? 'bg-rose-600' : 'bg-neutral-300 dark:bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          conversation.isMuted ? 'right-1' : 'left-1'
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
                      <button
                        type="button"
                        onClick={() =>
                          setDpPreviewTarget({
                            displayName: chatTitle,
                            username: chatUsername,
                            photoURL: chatAvatar || null,
                            bio: visibleBio,
                            isOnline: isContactOnline,
                            showOnlineStatus: allowOnline,
                            photoHiddenByPrivacy: !allowPhoto,
                            bioHiddenByPrivacy: !allowBio
                          })
                        }
                        className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-900 border border-[var(--accent-border)] hover:border-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-primary)] font-bold text-sm shrink-0 overflow-hidden cursor-pointer"
                        title="View full-size DP"
                      >
                        {chatAvatar ? (
                          <img src={chatAvatar} alt={chatTitle} className="w-full h-full object-cover" />
                        ) : (
                          chatTitle.slice(0, 1).toUpperCase()
                        )}
                      </button>
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

      {/* Delete Message Dialog: Delete for Everyone vs Delete for Me */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[var(--bg-card)] border-t sm:border border-[var(--accent-border)] p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] gold-glow shadow-2xl space-y-4 text-[var(--text-main)]">
            <div className="sm:hidden w-10 h-1 rounded-full bg-neutral-400/40 mx-auto -mt-1" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-main)]">Delete Message?</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Choose how you wish to delete this message:</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Option 1: Delete for Everyone (Available if own message) */}
              {messageToDelete.senderId === currentUserId && (
                <button
                  type="button"
                  onClick={() => {
                    chatStore.deleteMessageForEveryone(conversation.id, messageToDelete.id);
                    setMessageToDelete(null);
                  }}
                  className="w-full min-h-[48px] p-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-between transition-all shadow-md active:scale-98 cursor-pointer"
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
                className="w-full min-h-[48px] p-3 rounded-xl bg-[var(--bg-sidebar)] hover:bg-[var(--accent-surface)] text-[var(--text-main)] border border-[var(--accent-border)] font-semibold text-xs flex items-center justify-between transition-all active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
                  <div className="text-left">
                    <p className="leading-none">Delete for Me</p>
                    <p className="text-[10px] text-[var(--text-muted)] font-normal mt-1">Deletes only from your chat screen</p>
                  </div>
                </div>
                <span className="text-xs font-mono">👤</span>
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="w-full min-h-[44px] py-2.5 rounded-xl border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Clear Chat Confirmation Modal (from in-chat 3-dot menu) */}
      {isClearChatModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsClearChatModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-[var(--bg-sidebar)] border-t sm:border border-[var(--accent-border)] p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] gold-glow shadow-2xl space-y-4 text-[var(--text-main)]"
          >
            <div className="sm:hidden w-10 h-1 rounded-full bg-neutral-400/40 mx-auto -mt-1" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-main)]">Clear Chat History?</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Wipe all messages and voice memos in this chat with <strong>{chatTitle}</strong>?
                </p>
              </div>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsClearChatModalOpen(false)}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-[var(--accent-border)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearChatHistory}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Photo & Preset Chat Wallpaper Modal */}
      {isWallpaperModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setIsWallpaperModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full sm:max-w-md max-h-[92dvh] rounded-t-3xl sm:rounded-3xl bg-[var(--bg-sidebar)] border-t sm:border border-[var(--accent-border)] gold-glow shadow-2xl flex flex-col overflow-hidden text-[var(--text-main)]"
          >
            <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-white/5 flex items-center justify-between bg-[var(--bg-card)] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-primary)]">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-main)]">Chat Wallpaper</h2>
                  <p className="text-[11px] text-[var(--text-muted)]">Upload your own photo or pick a style</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWallpaperModalOpen(false)}
                aria-label="Close wallpaper picker"
                className="w-9 h-9 rounded-full bg-neutral-200/50 dark:bg-neutral-800/50 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {wallpaperError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs">
                  {wallpaperError}
                </div>
              )}

              {/* Live Preview */}
              <div className="relative h-40 rounded-2xl overflow-hidden border border-[var(--accent-border)] shadow-inner flex flex-col justify-end p-3 gap-2">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={
                    isImageWallpaper(wallpaperDraft.url)
                      ? { backgroundImage: `url("${wallpaperDraft.url}")` }
                      : { background: wallpaperDraft.url }
                  }
                />
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: `rgba(0, 0, 0, ${wallpaperDraft.dimOpacity})` }}
                />
                <div className="relative z-10 self-start max-w-[75%] px-3 py-1.5 rounded-2xl rounded-bl-xs bg-[var(--bg-bubble-in)] border border-[var(--border-bubble-in)] text-[11px] text-[var(--text-main)] shadow">
                  Hey! How does this wallpaper look?
                </div>
                <div className="relative z-10 self-end max-w-[75%] px-3 py-1.5 rounded-2xl rounded-br-xs bg-gradient-to-br from-[var(--accent-surface)] to-[var(--bg-card)] border border-[var(--accent-border)] text-[11px] text-[var(--text-main)] shadow">
                  Looks crisp and easy to read ✨
                </div>
              </div>

              {/* Upload Custom Photo from Gallery + Re-Crop */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={wallpaperFileRef}
                  onChange={handleWallpaperFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isProcessingWallpaper}
                  onClick={() => wallpaperFileRef.current?.click()}
                  className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl gold-button border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-xs font-bold text-[var(--accent-primary)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isProcessingWallpaper ? 'Preparing photo...' : 'Choose Custom Photo from Gallery'}</span>
                </button>
                {isImageWallpaper(wallpaperDraft.url) && (
                  <button
                    type="button"
                    onClick={() => setWallpaperCropSrc(wallpaperDraft.url)}
                    className="min-h-[44px] py-2.5 px-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-xs font-bold text-[var(--text-main)] flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                    title="Crop Wallpaper Photo"
                  >
                    <Crop className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span>Crop</span>
                  </button>
                )}
              </div>

              {/* Dim Scrim Slider */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--accent-border)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-main)]">Backdrop Darkness</span>
                  <span className="font-mono text-[var(--accent-primary)] tabular-nums">
                    {Math.round(wallpaperDraft.dimOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={85}
                  value={Math.round(wallpaperDraft.dimOpacity * 100)}
                  onChange={e =>
                    setWallpaperDraft(prev => ({
                      ...prev,
                      dimOpacity: Number(e.target.value) / 100
                    }))
                  }
                  className="w-full accent-[var(--accent-primary)] cursor-pointer"
                />
              </div>

              {/* Preset Wallpapers */}
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Curated Styles</p>
                <div className="grid grid-cols-4 gap-2">
                  {WALLPAPER_PRESETS.map(preset => {
                    const isPicked = wallpaperDraft.url === preset.value;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          setWallpaperDraft({
                            url: preset.value,
                            dimOpacity: preset.dimOpacity
                          })
                        }
                        title={preset.label}
                        className={`h-14 rounded-xl overflow-hidden border relative cursor-pointer transition-all ${
                          isPicked
                            ? 'border-2 border-[var(--accent-primary)] scale-105 shadow-md'
                            : 'border-[var(--accent-border)] hover:border-[var(--accent-primary)]'
                        }`}
                        style={{ background: preset.value }}
                      >
                        {isPicked && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <Check className="w-4 h-4 text-white stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Apply Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleApplyWallpaper('chat')}
                  className="min-h-[44px] py-2.5 px-3 rounded-xl gold-button-accent text-xs font-bold uppercase tracking-wide cursor-pointer"
                >
                  Apply to This Chat
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyWallpaper('all')}
                  className="min-h-[44px] py-2.5 px-3 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] text-xs font-bold text-[var(--text-main)] cursor-pointer"
                >
                  Apply to All Chats
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetWallpaper}
                className="w-full min-h-[40px] py-2 rounded-xl border border-neutral-300 dark:border-white/10 text-xs font-semibold text-[var(--text-muted)] hover:text-rose-400 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default Background</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <AvatarPreviewModal target={dpPreviewTarget} onClose={() => setDpPreviewTarget(null)} />
      <AvatarCropModal
        imageSrc={cropSourceUrl}
        onConfirm={cropped => {
          setMyPhotoURL(cropped);
          setCropSourceUrl(null);
        }}
        onCancel={() => setCropSourceUrl(null)}
      />
      <AvatarCropModal
        imageSrc={wallpaperCropSrc}
        title="Crop Chat Wallpaper"
        subtitle="Drag, zoom or rotate to frame your chat background"
        confirmLabel="Use Wallpaper"
        shape="rect"
        aspectRatio={9 / 16}
        outputWidth={720}
        outputHeight={1280}
        onConfirm={cropped => {
          setWallpaperDraft(prev => ({
            url: cropped,
            dimOpacity: prev.dimOpacity < 0.35 ? 0.45 : prev.dimOpacity
          }));
          setWallpaperCropSrc(null);
        }}
        onCancel={() => setWallpaperCropSrc(null)}
      />
      <StickerSaveModal
        target={stickerTapTarget}
        onClose={() => setStickerTapTarget(null)}
        onEditMediaSticker={draft => setRemixStickerDraft(draft)}
        onSendSticker={target => {
          if (conversation.isBlocked || !isAcceptedFriend) return;
          if (target.type === 'builtin') {
            chatStore.sendMessage(
              conversation.id,
              currentUserId,
              currentUserName || 'User',
              toStickerToken(target.sticker.id),
              undefined,
              'none'
            );
          } else {
            chatStore.sendMessage(
              conversation.id,
              currentUserId,
              currentUserName || 'User',
              encodeCustomStickerMessage(target.kind, target.meta),
              target.mediaUrl,
              target.kind
            );
          }
        }}
      />
      <StickerCreatorModal
        isOpen={Boolean(remixStickerDraft)}
        initialDraft={remixStickerDraft}
        onClose={() => setRemixStickerDraft(null)}
        onCreated={(created, sendImmediately) => {
          setRemixStickerDraft(null);
          if (sendImmediately && !conversation.isBlocked && isAcceptedFriend && created.kind !== 'builtin') {
            chatStore.sendMessage(
              conversation.id,
              currentUserId,
              currentUserName || 'User',
              encodeCustomStickerMessage(created.kind === 'video' ? 'video' : 'image', {
                caption: created.caption,
                captionColor: created.captionColor,
                captionPos: created.captionPos,
                captionX: created.captionX,
                captionY: created.captionY,
                captionSize: created.captionSize,
                captionRotate: created.captionRotate,
                captionStyle: created.captionStyle,
                captionFont: created.captionFont,
                shape: created.shape,
                borderStyle: created.borderStyle
              }),
              created.mediaUrl,
              created.kind === 'video' ? 'video' : 'image'
            );
          }
        }}
      />
    </div>
  );
};
