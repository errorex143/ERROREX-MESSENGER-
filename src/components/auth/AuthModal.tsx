import React, { useState, useEffect } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification
} from '../../lib/firebase';
import { CrownLogo } from '../common/CrownLogo';
import { Mail, ArrowRight, ShieldCheck, KeyRound, AlertCircle, CheckCircle2, User, Check } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { standaloneAuth } from '../../lib/standaloneApi';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Load saved credentials from localStorage if user previously checked "Save password"
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('errorex_saved_credentials');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.password) setPassword(parsed.password);
        if (parsed.rememberMe !== undefined) setRememberMe(Boolean(parsed.rememberMe));
      }
    } catch {
      // quiet read
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validatePassword = (pass: string) => {
    return pass.length >= 6;
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: suErr } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (suErr) throw suErr;
        onClose();
        return;
      }

      // Standalone Google flow
      const userGoogleEmail = (email.includes('@') ? email.trim() : 'google.user@gmail.com').toLowerCase();
      const cleanName = userGoogleEmail.split('@')[0];
      const stableGoogleUid = `google_${userGoogleEmail.replace(/[^a-z0-9]/g, '_')}`;
      const googleUser = {
        uid: stableGoogleUid,
        email: userGoogleEmail,
        displayName: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
        photoURL: '',
        emailVerified: true,
        getIdToken: async () => `token_${stableGoogleUid}`
      };

      if (rememberMe) {
        localStorage.setItem('errorex_saved_credentials', JSON.stringify({ email: userGoogleEmail, password: '', rememberMe: true }));
      }

      // Only pre-unlock if user already configured their Calculator PIN earlier
      if (localStorage.getItem(`errorex_pin_set_${googleUser.uid}`) === 'true') {
        localStorage.setItem(`errorex_unlocked_${googleUser.uid}`, 'true');
      }
      standaloneAuth.setCurrentUser(googleUser);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Google authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid Gmail or email address.');
      return;
    }

    if (isForgotPassword) {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        setInfoMessage('Password reset instructions have been sent to your email.');
        setTimeout(() => {
          setIsForgotPassword(false);
          setInfoMessage(null);
        }, 4000);
      } catch (err: any) {
        setError(err.message || 'Failed to send password reset email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isRegister) {
      if (!validatePassword(password)) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (!confirmPassword) {
        setError('Please re-enter your password in Confirm Password.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Both passwords do not match. Please enter the same password twice.');
        return;
      }

      setLoading(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password, displayName.trim());
        if (rememberMe) {
          localStorage.setItem('errorex_saved_credentials', JSON.stringify({ email: cleanEmail, password, rememberMe: true }));
        } else {
          localStorage.removeItem('errorex_saved_credentials');
        }

        if (cred.user) {
          // IMPORTANT: Do NOT set unlocked or pin_set here so Step 2 (Calculator 8-Digit PIN Setup) opens next!
          localStorage.removeItem(`errorex_unlocked_${cred.user.uid}`);
          try {
            await sendEmailVerification(cred.user);
          } catch {
            // non-fatal
          }
        }
        onClose();
      } catch (err: any) {
        setError(err.message || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        if (cred.user) {
          // If user already has PIN set, keep unlocked during active session until logout
          if (
            localStorage.getItem(`errorex_pin_set_${cred.user.uid}`) === 'true' ||
            localStorage.getItem(`errorex_pin_cred_${cred.user.uid}`)
          ) {
            localStorage.setItem(`errorex_unlocked_${cred.user.uid}`, 'true');
          }
        }
        if (rememberMe) {
          localStorage.setItem('errorex_saved_credentials', JSON.stringify({ email: cleanEmail, password, rememberMe: true }));
        } else {
          localStorage.removeItem('errorex_saved_credentials');
        }
        onClose();
      } catch (err: any) {
        setError(err.message || 'Invalid email or password.');
      } finally {
        setLoading(false);
      }
    }
  };

  const passwordsMatch = Boolean(password && confirmPassword && password === confirmPassword);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#0E0E11] border border-[var(--accent-border)] gold-glow shadow-2xl my-4">
        {/* Header with Crown */}
        <div className="flex flex-col items-center text-center mb-5">
          <CrownLogo size="lg" showWordmark={true} />
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#A3A3A3]">
            {isForgotPassword
              ? 'Reset Account Password'
              : isRegister
              ? 'Step 1 of 2 • Create Sovereign ID'
              : 'Authenticate Account'}
          </p>
        </div>

        {/* Google ID Authentication Button */}
        {!isForgotPassword && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 font-semibold text-xs flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google ID</span>
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-mono">
                or gmail & password
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </div>
        )}

        {/* Tab switch: Sign In vs Create Account */}
        {!isForgotPassword && (
          <div className="flex rounded-xl bg-black/50 p-1 mb-5 border border-white/5">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                !isRegister
                  ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isRegister
                  ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2.5 p-3 text-xs rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 flex items-start gap-2.5 p-3 text-xs rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          {isRegister && !isForgotPassword && (
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Full Name / Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
                <input
                  type="text"
                  maxLength={25}
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your Name (visible in Find Members)"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-neutral-900/80 border border-neutral-700/60 focus:border-[var(--accent-primary)] focus:outline-none text-white placeholder-neutral-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Gmail / Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-neutral-900/80 border border-neutral-700/60 focus:border-[var(--accent-primary)] focus:outline-none text-white placeholder-neutral-500 transition-colors"
              />
            </div>
          </div>

          {!isForgotPassword && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-neutral-300">
                    Account Password
                  </label>
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-xs text-[var(--accent-primary)] hover:underline cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-neutral-900/80 border border-neutral-700/60 focus:border-[var(--accent-primary)] focus:outline-none text-white placeholder-neutral-500 transition-colors"
                  />
                </div>
              </div>

              {isRegister && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-neutral-300">
                      Confirm Password (Enter 2nd Time)
                    </label>
                    {confirmPassword && (
                      <span className={`text-[10px] font-mono flex items-center gap-1 ${passwordsMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {passwordsMatch ? <Check className="w-3 h-3" /> : null}
                        {passwordsMatch ? 'Matched' : 'Not matched'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter same password"
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-neutral-900/80 border border-neutral-700/60 focus:border-[var(--accent-primary)] focus:outline-none text-white placeholder-neutral-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Save Password Checkbox */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-neutral-300 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] focus:ring-offset-0 cursor-pointer"
                  />
                  <span>Save password on this device</span>
                </label>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl gold-button-accent flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {isForgotPassword
                    ? 'Send Reset Link'
                    : isRegister
                    ? 'Next: Set Calculator PIN'
                    : 'Sign In'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {isForgotPassword && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setError(null);
              }}
              className="text-xs text-neutral-400 hover:text-[var(--accent-primary)] cursor-pointer"
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-neutral-800 text-center">
          <p className="text-[11px] text-neutral-500">
            {isRegister
              ? 'Step 1: Confirm Gmail & Password → Step 2: Set your 8-digit Calculator Unlock PIN.'
              : 'Account password and secret 8-digit Calculator PIN are two separate security layers.'}
          </p>
        </div>
      </div>
    </div>
  );
};
