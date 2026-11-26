import React, { useState, useEffect } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification
} from '../../lib/firebase';
import { standaloneAuth } from '../../lib/standaloneApi';
import { CrownLogo } from '../common/CrownLogo';
import { Mail, ArrowRight, ShieldCheck, KeyRound, AlertCircle, CheckCircle2, User, Check } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'new_password'>('email');
  const [verifiedDisplayName, setVerifiedDisplayName] = useState('');

  // Load saved credentials from localStorage if user previously checked "Save password"
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
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
      if (forgotStep === 'email') {
        setLoading(true);
        try {
          const check = await standaloneAuth.checkRegisteredEmail(cleanEmail);
          if (!check.exists) {
            setError('This Gmail address is not registered yet. Please check your Gmail or Create Account.');
            return;
          }
          setVerifiedDisplayName(check.displayName || cleanEmail.split('@')[0]);
          setNewPassword('');
          setConfirmNewPassword('');
          setForgotStep('new_password');
          setInfoMessage('Gmail verified! Enter your New Password and Confirm Password below.');
        } catch (err: any) {
          setError(err?.message || 'Could not verify Gmail address.');
        } finally {
          setLoading(false);
        }
        return;
      }

      // forgotStep === 'new_password'
      if (!validatePassword(newPassword)) {
        setError('New password must be at least 6 characters.');
        return;
      }
      if (!confirmNewPassword) {
        setError('Please re-enter your new password in Confirm Password.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setError('Both new passwords do not match. Please enter the same password twice.');
        return;
      }

      setLoading(true);
      try {
        await standaloneAuth.recoverPasswordAndStartPinSetup(cleanEmail, newPassword);
        if (rememberMe) {
          localStorage.setItem(
            'errorex_saved_credentials',
            JSON.stringify({ email: cleanEmail, password: newPassword, rememberMe: true })
          );
        }
        setPassword(newPassword);
        setIsForgotPassword(false);
        setForgotStep('email');
        onClose();
      } catch (err: any) {
        setError(err?.message || 'Failed to update password.');
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
  const newPasswordsMatch = Boolean(newPassword && confirmNewPassword && newPassword === confirmNewPassword);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-md p-5 sm:p-8 pb-[max(1.25rem,env(safe-area-inset-bottom))] rounded-t-3xl sm:rounded-3xl bg-[#0E0E12] border-t sm:border border-[var(--accent-border)] gold-glow shadow-2xl max-h-[94dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1 rounded-full bg-neutral-500/40 mx-auto mb-3" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          ✕
        </button>

        {/* Header with Crown */}
        <div className="flex flex-col items-center text-center mb-5">
          <CrownLogo size="lg" showWordmark={true} />
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#A3A3A3]">
            {isForgotPassword
              ? forgotStep === 'email'
                ? 'Forgot Password • Verify Gmail'
                : 'Step 1 of 2 • Set New Password'
              : isRegister
              ? 'Step 1 of 2 • Create Sovereign ID'
              : 'Authenticate Account'}
          </p>
        </div>

        {/* Tab switch: Sign In vs Create Account */}
        {!isForgotPassword && (
          <div className="flex rounded-xl bg-black/50 p-1 mb-5 border border-white/5">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
                setInfoMessage(null);
              }}
              className={`flex-1 min-h-[40px] py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
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
                setInfoMessage(null);
              }}
              className={`flex-1 min-h-[40px] py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
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
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                <input
                  type="text"
                  maxLength={25}
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your Name (visible in Find Members)"
                  className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm rounded-xl bg-neutral-900/80 border border-neutral-700/60 focus:border-[var(--accent-primary)] focus:outline-none text-white placeholder-neutral-500 transition-colors"
                />
              </div>
            </div>
          )}

          {(!isForgotPassword || forgotStep === 'email') && (
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Gmail / Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm rounded-xl bg-neutral-900/80 border border-neutral-700/60 focus:border-[var(--accent-primary)] focus:outline-none text-white placeholder-neutral-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Forgot Password Step 2: New Password + Confirm Password */}
          {isForgotPassword && forgotStep === 'new_password' && (
            <>
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-neutral-900/80 border border-[var(--accent-border)] text-xs">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">
                    Verified Account {verifiedDisplayName ? `(${verifiedDisplayName})` : ''}
                  </span>
                  <span className="font-mono text-[var(--accent-primary)] truncate block">
                    {email.trim().toLowerCase()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForgotStep('email');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="text-[11px] text-neutral-400 hover:text-[var(--accent-primary)] ml-2 shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm rounded-xl bg-neutral-900/80 border border-neutral-700/60 focus:border-[var(--accent-primary)] focus:outline-none text-white placeholder-neutral-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-neutral-300">
                    Confirm Password
                  </label>
                  {confirmNewPassword && (
                    <span
                      className={`text-[10px] font-mono flex items-center gap-1 ${
                        newPasswordsMatch ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {newPasswordsMatch ? <Check className="w-3 h-3" /> : null}
                      {newPasswordsMatch ? 'Matched' : 'Not matched'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm rounded-xl bg-neutral-900/80 border border-neutral-700/60 focus:border-[var(--accent-primary)] focus:outline-none text-white placeholder-neutral-500 transition-colors"
                  />
                </div>
              </div>
            </>
          )}

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
                      onClick={() => {
                        setIsForgotPassword(true);
                        setForgotStep('email');
                        setError(null);
                        setInfoMessage(null);
                        setNewPassword('');
                        setConfirmNewPassword('');
                      }}
                      className="text-xs text-[var(--accent-primary)] hover:underline cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm rounded-xl bg-neutral-900/80 border border-neutral-700/60 focus:border-[var(--accent-primary)] focus:outline-none text-white placeholder-neutral-500 transition-colors"
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
                    <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter same password"
                      className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm rounded-xl bg-neutral-900/80 border border-neutral-700/60 focus:border-[var(--accent-primary)] focus:outline-none text-white placeholder-neutral-500 transition-colors"
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
            className="w-full min-h-[46px] py-3 rounded-xl gold-button-accent flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {isForgotPassword
                    ? forgotStep === 'email'
                      ? 'Next'
                      : 'Confirm & Set Calculator Password'
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
                setForgotStep('email');
                setError(null);
                setInfoMessage(null);
              }}
              className="text-xs text-neutral-400 hover:text-[var(--accent-primary)] cursor-pointer"
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-neutral-800 text-center">
          <p className="text-[11px] text-neutral-500">
            {isForgotPassword
              ? forgotStep === 'email'
                ? 'Step 1: Verify your registered Gmail address to continue.'
                : 'Step 2: Confirm your new password, then select your 8-digit Calculator Password.'
              : isRegister
              ? 'Step 1: Confirm Gmail & Password → Step 2: Set your 8-digit Calculator Unlock PIN.'
              : 'Account password and secret 8-digit Calculator PIN are two separate security layers.'}
          </p>
        </div>
      </div>
    </div>
  );
};
