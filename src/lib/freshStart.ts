const FRESH_START_EPOCH = 'v3_fresh_start_20261127';
const EPOCH_STORAGE_KEY = 'errorex_reset_epoch';

const EXACT_KEYS_TO_CLEAR = new Set([
  'errorex_standalone_user',
  'errorex_registered_users',
  'errorex_session',
  'errorex_last_uid',
  'errorex_saved_credentials',
  'errorex_profile_v5',
  'errorex_privacy_v5',
  'errorex_conversations_v5',
  'errorex_contacts_v5',
  'errorex_local_read_at_v5',
]);

const PREFIXES_TO_CLEAR = [
  'errorex_standalone_db_',
  'errorex_messages_v5_',
  'errorex_pin_cred_',
  'errorex_pin_set_',
  'errorex_unlocked_',
  'errorex_force_pin_setup_',
  'sb-',
];

function shouldClearKey(key: string): boolean {
  if (EXACT_KEYS_TO_CLEAR.has(key)) return true;
  return PREFIXES_TO_CLEAR.some((prefix) => key.startsWith(prefix));
}

export function applyFreshStartEpochReset(): void {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    if (localStorage.getItem(EPOCH_STORAGE_KEY) === FRESH_START_EPOCH) return;

    const localKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && shouldClearKey(key)) {
        localKeysToRemove.push(key);
      }
    }
    localKeysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore storage removal errors
      }
    });

    if (typeof sessionStorage !== 'undefined') {
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const key = sessionStorage.key(i);
        if (key && shouldClearKey(key)) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach((key) => {
        try {
          sessionStorage.removeItem(key);
        } catch {
          // Ignore storage removal errors
        }
      });
    }

    localStorage.setItem(EPOCH_STORAGE_KEY, FRESH_START_EPOCH);
  } catch {
    // Ignore storage access errors in restricted contexts
  }
}

applyFreshStartEpochReset();
