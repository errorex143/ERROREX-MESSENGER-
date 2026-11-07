import React, { useState } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification
} from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { CrownLogo } from '../common/CrownLogo';
import { Lock, Mail, ArrowRight, ShieldCheck, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithTestAccount } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const [email, setEmail] = useState('webdwebd18@gmail.com');
  const [password, setPassword] = useState('noor1434');
  const [confirmPassword, setConfirmPassword] = useState('noor1434');
  const [displayName, setDisplayName] = useState('Noor');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setError(null);
    setInfoMessage(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
  };

  const validatePassword = (pass: string) => {
    return pass.length >= 6;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (isForgotPassword) {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, email);
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

    // If user is testing with requested credentials:
    if (email.toLowerCase().trim() === 'webdwebd18@gmail.com' && password === 'noor1434') {
      loginWithTestAccount();
      onClose();
      return;
    }

    if (isRegister) {
      if (!validatePassword(password)) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      setLoading(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (cred.user) {
          try {
            await sendEmailVerification(cred.user);
          } catch (e) {
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
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Invalid email or password.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl bg-[#0E0E11] border border-[var(--accent-border)] gold-glow shadow-2xl">
        {/* Header with Crown */}
        <div className="flex flex-col items-center text-center mb-6">
          <CrownLogo size="lg" showWordmark={true} />
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#A3A3A3]">
            {isForgotPassword
              ? 'Reset Account Password'
              : isRegister
              ? 'Join The Sovereign Network'
              : 'Authenticate Account'}
          </p>
        </div>

        {/* Tab switch */}
        {!isForgotPassword && (
          <div className="flex rounded-lg bg-black/50 p-1 mb-6 border border-white/5">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
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
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
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
          <div className="mb-4 flex items-start gap-2.5 p-3 text-xs rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 flex items-start gap-2.5 p-3 text-xs rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-500" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vip@errorex.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg bg-neutral-900/80 border border-neutral-700/60 focus:border-[var(--accent-primary)] focus:outline-none text-white placeholder-neutral-500 transition-colors"
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
                      className="text-xs text-[var(--accent-primary)] hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg bg-neutral-900/80 border border-neutral-700/60 focus:border-[var(--accent-primary)] focus:outline-none text-white placeholder-neutral-500 transition-colors"
                  />
                </div>
              </div>

              {isRegister && (
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-500" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg bg-neutral-900/80 border border-neutral-700/60 focus:border-[var(--accent-primary)] focus:outline-none text-white placeholder-neutral-500 transition-colors"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg gold-button-accent flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isForgotPassword ? 'Send Reset Link' : isRegister ? 'Register & Continue' : 'Sign In'}</span>
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
              className="text-xs text-neutral-400 hover:text-[var(--accent-primary)]"
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        {/* Credential Helper Note */}
        <div className="mt-5 p-3 rounded-xl bg-[var(--accent-surface)] border border-[var(--accent-border)] flex flex-col gap-1 text-center">
          <span className="text-[11px] font-bold text-[var(--accent-primary)] uppercase tracking-wider">
            Ready to Test Account
          </span>
          <span className="text-[11px] text-neutral-300 font-mono">
            webdwebd18@gmail.com &bull; Pass: noor1434
          </span>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-900 text-center">
          <p className="text-[11px] text-neutral-500">
            Account password and secret 8-digit PIN are two separate credentials.
          </p>
        </div>
      </div>
    </div>
  );
};
