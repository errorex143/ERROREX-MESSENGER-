import { ContactItem, Friendship, PrivacySettings, UserProfile } from '../types';
import { getCollectionData } from './standaloneApi';

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profilePhoto: 'everyone',
  bio: 'everyone',
  lastSeen: 'contacts',
  readReceipts: true
};

export function normalizePrivacySettings(raw?: Partial<PrivacySettings> | null): PrivacySettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PRIVACY_SETTINGS };
  }
  return {
    profilePhoto:
      raw.profilePhoto === 'contacts' || raw.profilePhoto === 'nobody' || raw.profilePhoto === 'everyone'
        ? raw.profilePhoto
        : DEFAULT_PRIVACY_SETTINGS.profilePhoto,
    bio:
      raw.bio === 'contacts' || raw.bio === 'nobody' || raw.bio === 'everyone'
        ? raw.bio
        : DEFAULT_PRIVACY_SETTINGS.bio,
    lastSeen:
      raw.lastSeen === 'contacts' || raw.lastSeen === 'nobody' || raw.lastSeen === 'everyone'
        ? raw.lastSeen
        : DEFAULT_PRIVACY_SETTINGS.lastSeen,
    readReceipts: raw.readReceipts !== undefined ? Boolean(raw.readReceipts) : DEFAULT_PRIVACY_SETTINGS.readReceipts
  };
}

export function resolveTargetPrivacy(
  targetProfile?: Pick<UserProfile, 'privacySettings'> | null,
  participantDetail?: { privacy?: PrivacySettings } | null
): PrivacySettings {
  return normalizePrivacySettings(targetProfile?.privacySettings || participantDetail?.privacy);
}

export function isUserInContactsOrFriends(
  viewerUid: string,
  targetUid?: string,
  targetUsername?: string,
  savedContacts?: ContactItem[],
  friendships?: Friendship[]
): boolean {
  if (viewerUid && targetUid && viewerUid === targetUid) return true;

  const friendList = friendships ?? getCollectionData<Friendship>('friendships');
  if (
    targetUid &&
    viewerUid &&
    friendList.some(f => {
      const pair = Array.isArray(f.users) ? f.users : [f.user1Id, f.user2Id];
      return pair.includes(viewerUid) && pair.includes(targetUid);
    })
  ) {
    return true;
  }

  let contactsList = savedContacts;
  if (!contactsList) {
    try {
      const raw = localStorage.getItem('errorex_contacts_v5');
      contactsList = raw ? JSON.parse(raw) : [];
    } catch {
      contactsList = [];
    }
  }

  const cleanTargetUser = (targetUsername || '').replace(/^@/, '').toLowerCase().trim();
  return Boolean(
    contactsList?.some(
      c =>
        (targetUid && c.id === targetUid) ||
        (cleanTargetUser && c.username && c.username.toLowerCase().trim() === cleanTargetUser)
    )
  );
}

function checkAudienceRule(
  rule: 'everyone' | 'contacts' | 'nobody',
  viewerUid: string,
  targetUid?: string,
  targetUsername?: string,
  savedContacts?: ContactItem[],
  friendships?: Friendship[]
): boolean {
  if (viewerUid && targetUid && viewerUid === targetUid) return true;
  if (rule === 'everyone') return true;
  if (rule === 'nobody') return false;
  return isUserInContactsOrFriends(viewerUid, targetUid, targetUsername, savedContacts, friendships);
}

export function canViewProfilePhoto(
  viewerUid: string,
  targetUid?: string,
  targetUsername?: string,
  targetProfile?: UserProfile | null,
  participantDetail?: { privacy?: PrivacySettings } | null,
  savedContacts?: ContactItem[],
  friendships?: Friendship[]
): boolean {
  const privacy = resolveTargetPrivacy(targetProfile, participantDetail);
  return checkAudienceRule(
    privacy.profilePhoto,
    viewerUid,
    targetUid,
    targetUsername,
    savedContacts,
    friendships
  );
}

export function canViewBio(
  viewerUid: string,
  targetUid?: string,
  targetUsername?: string,
  targetProfile?: UserProfile | null,
  participantDetail?: { privacy?: PrivacySettings } | null,
  savedContacts?: ContactItem[],
  friendships?: Friendship[]
): boolean {
  const privacy = resolveTargetPrivacy(targetProfile, participantDetail);
  return checkAudienceRule(privacy.bio, viewerUid, targetUid, targetUsername, savedContacts, friendships);
}

export function canViewLastSeen(
  viewerUid: string,
  targetUid?: string,
  targetUsername?: string,
  targetProfile?: UserProfile | null,
  participantDetail?: { privacy?: PrivacySettings } | null,
  savedContacts?: ContactItem[],
  friendships?: Friendship[]
): boolean {
  const privacy = resolveTargetPrivacy(targetProfile, participantDetail);
  return checkAudienceRule(
    privacy.lastSeen,
    viewerUid,
    targetUid,
    targetUsername,
    savedContacts,
    friendships
  );
}

export function canExchangeReadReceipts(
  myPrivacy?: PrivacySettings | null,
  targetPrivacy?: PrivacySettings | null
): boolean {
  const mineEnabled = myPrivacy ? myPrivacy.readReceipts !== false : true;
  const theirsEnabled = targetPrivacy ? targetPrivacy.readReceipts !== false : true;
  return mineEnabled && theirsEnabled;
}
