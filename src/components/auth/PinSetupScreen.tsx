import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CrownLogo } from '../common/CrownLogo';
import { Shield, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

export const PinSetupScreen: React.FC = () => {
  const { setupPin, user } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDigit = useCallback((digit: string) => {
    setError(null);
    if (step === 1) {
      setPin(prev => (prev.length < 8 ? prev + digit : prev));
    } else {
      setConfirmPin(prev => (prev.length < 8 ? prev + digit : prev));
    }
  }, [step]);

  const handleBackspace = useCallback(() => {
    setError(null);
    if (step === 1) {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  }, [step]);

  const handleClear = useCallback(() => {
    setError(null);
    if (step === 1) {
      setPin('');
    } else {
      setConfirmPin('');
    }
  }, [step]);

  const handleNextStep = useCallback(() => {
    if (pin.length !== 8) {
      setError('Calculator password must be exactly 8 digits.');
      return;
    }
    setError(null);
    setStep(2);
  }, [pin]);

  const handleSubmit = useCallback(async () => {
    if (confirmPin.length !== 8) {
      setError('Please enter all 8 digits to confirm.');
      return;
    }
    if (pin !== confirmPin) {
      setError('The 8-digit PINs do not match. Please re-enter.');
      setConfirmPin('');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await setupPin(pin);
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Failed to save secret PIN. Please try again.');
      setLoading(false);
    }
  }, [confirmPin, pin, setupPin]);

  // Support physical keyboard digits, Backspace, Enter, Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (loading) return;
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === 'Enter') {
        if (step === 1 && pin.length === 8) handleNextStep();
        else if (step === 2 && confirmPin.length === 8) handleSubmit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loading, step, pin.length, confirmPin.length, handleDigit, handleBackspace, handleClear, handleNextStep, handleSubmit]);

  const currentInput = step === 1 ? pin : confirmPin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050507] overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.08)_0%,transparent_60%)] pointer-events-none" />

      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#0E0E12] border border-[var(--accent-border)] gold-glow shadow-2xl flex flex-col items-center text-center my-4">
        <CrownLogo size="lg" showWordmark={true} className="mb-4" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-surface)] border border-[var(--accent-border)] mb-3">
          <Shield className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
            Step 2 of 2 • Calculator Password
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-display font-bold gold-gradient-text">
          {step === 1 ? 'SET CALCULATOR PASSWORD' : 'CONFIRM CALCULATOR PASSWORD'}
        </h1>

        <p className="mt-2 text-xs text-neutral-400 max-w-xs leading-relaxed">
          {step === 1
            ? 'Set your private 8-digit numeric code. Typing this 8-digit password inside the Calculator and pressing = will open your ERROREX Messenger.'
            : 'Re-enter the same 8-digit Calculator Password to confirm. Once saved, it will not ask again unless you change it in Settings.'}
        </p>

        {error && (
          <div className="mt-4 w-full flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 w-full flex items-center gap-2 p-3 text-xs rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Calculator password saved! Opening ERROREX Messenger...</span>
          </div>
        )}

        {/* 8-Digit Slot Indicators */}
        <div className="my-6 flex items-center justify-center gap-2 sm:gap-2.5">
          {Array.from({ length: 8 }).map((_, index) => {
            const isFilled = index < currentInput.length;
            const isCurrent = index === currentInput.length;
            return (
              <div
                key={index}
                className={`w-9 h-11 sm:w-10 sm:h-12 rounded-xl flex items-center justify-center transition-all ${
                  isFilled
                    ? 'bg-[var(--accent-surface)] border-2 border-[var(--accent-primary)] gold-glow-sm shadow-md'
                    : isCurrent
                    ? 'bg-neutral-900 border border-[var(--accent-primary)] animate-pulse'
                    : 'bg-neutral-950 border border-neutral-800'
                }`}
              >
                {isFilled ? (
                  <div className="w-3 h-3 rounded-full bg-[var(--accent-primary)] shadow-sm" />
                ) : (
                  <span className="text-[10px] text-neutral-600 font-mono">
                    {index + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Number Pad */}
        <div className="w-full grid grid-cols-3 gap-2.5 max-w-[280px] mb-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(String(num))}
              className="h-12 rounded-xl gold-button flex items-center justify-center text-lg font-mono font-medium text-white hover:text-[var(--accent-primary)] active:scale-95 transition-all cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 text-xs font-semibold text-neutral-400 active:scale-95 transition-all cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 rounded-xl gold-button flex items-center justify-center text-lg font-mono font-medium text-white hover:text-[var(--accent-primary)] active:scale-95 transition-all cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 text-xs font-semibold text-neutral-400 active:scale-95 transition-all cursor-pointer"
          >
            ⌫
          </button>
        </div>

        {/* Action Button */}
        <div className="w-full max-w-[280px]">
          {step === 1 ? (
            <button
              type="button"
              disabled={pin.length !== 8}
              onClick={handleNextStep}
              className="w-full py-3 rounded-xl gold-button-accent flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-40 transition-all cursor-pointer"
            >
              <span>Continue to Confirm</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setConfirmPin('');
                  setError(null);
                }}
                className="py-3 px-4 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-neutral-300 hover:text-white cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={confirmPin.length !== 8 || loading}
                onClick={handleSubmit}
                className="flex-1 py-3 rounded-xl gold-button-accent flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-40 transition-all cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirm & Open Messenger</span>
                    <Shield className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 text-[10px] text-neutral-500 max-w-xs">
          Secured for account: {user?.email || 'Member'} • Saved to Cloud & Device
        </p>
      </div>
    </div>
  );
};
