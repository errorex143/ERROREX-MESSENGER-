import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CrownLogo } from '../common/CrownLogo';
import { User, LogIn, LogOut, Delete, Sparkles, Moon, Sun, Lock, Palette } from 'lucide-react';
import { useTheme, THEMES } from '../../context/ThemeContext';

interface CalculatorProps {
  onOpenAuth: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ onOpenAuth }) => {
  const { user, userProfile, verifyPin, logout } = useAuth();
  const { mode, toggleMode, theme, setTheme, resolvedMode, autoCycleEnabled, formattedCountdown } = useTheme();

  const [displayValue, setDisplayValue] = useState<string>('0');
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [historyExpression, setHistoryExpression] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);

  // Clear All (AC)
  const clearAll = useCallback(() => {
    setDisplayValue('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setHistoryExpression('');
  }, []);

  // Backspace (⌫)
  const handleBackspace = useCallback(() => {
    if (waitingForOperand) return;
    setDisplayValue(prev => {
      if (prev.length <= 1 || (prev.length === 2 && prev.startsWith('-'))) {
        return '0';
      }
      return prev.slice(0, -1);
    });
  }, [waitingForOperand]);

  // Input Digit
  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplayValue(digit);
      setWaitingForOperand(false);
    } else {
      setDisplayValue(prev => (prev === '0' ? digit : prev + digit));
    }
  }, [waitingForOperand]);

  // Input Decimal
  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplayValue('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!displayValue.includes('.')) {
      setDisplayValue(prev => prev + '.');
    }
  }, [displayValue, waitingForOperand]);

  // Toggle Sign (+/-)
  const toggleSign = useCallback(() => {
    setDisplayValue(prev => {
      const val = parseFloat(prev);
      if (val === 0) return prev;
      return String(-val);
    });
  }, []);

  // Percentage (%)
  const inputPercent = useCallback(() => {
    const current = parseFloat(displayValue);
    if (isNaN(current)) return;
    const result = current / 100;
    setDisplayValue(String(result));
    setWaitingForOperand(true);
  }, [displayValue]);

  // Execute Math Operation
  const performCalculation = useCallback((op1: number, op2: number, op: string): number => {
    switch (op) {
      case '+':
        return op1 + op2;
      case '-':
        return op1 - op2;
      case '×':
      case '*':
        return op1 * op2;
      case '÷':
      case '/':
        if (op2 === 0) return NaN;
        return op1 / op2;
      default:
        return op2;
    }
  }, []);

  // Set Operator (+, -, ×, ÷)
  const setOperator = useCallback((nextOperator: string) => {
    const inputValue = parseFloat(displayValue);

    if (previousValue === null) {
      setPreviousValue(displayValue);
      setHistoryExpression(`${displayValue} ${nextOperator}`);
    } else if (operation && !waitingForOperand) {
      const prev = parseFloat(previousValue);
      const result = performCalculation(prev, inputValue, operation);
      const formattedResult = isNaN(result) ? 'Error' : String(Number(result.toFixed(10)));
      setDisplayValue(formattedResult);
      setPreviousValue(formattedResult);
      setHistoryExpression(`${formattedResult} ${nextOperator}`);
    } else {
      setHistoryExpression(`${previousValue} ${nextOperator}`);
    }

    setWaitingForOperand(true);
    setOperation(nextOperator);
  }, [displayValue, operation, performCalculation, previousValue, waitingForOperand]);

  // Equals (=) Button: Performs calculation AND secretly checks 8-digit PIN if candidate
  const handleEquals = useCallback(async () => {
    const rawNumberStr = displayValue.trim();

    // Check if the current display is an exact 8-digit sequence (e.g., '12345678' or leading zeros '00123456')
    const is8DigitCandidate = /^\d{8}$/.test(rawNumberStr);

    if (is8DigitCandidate) {
      setIsVerifying(true);
      try {
        const verifyResult = await verifyPin(rawNumberStr);
        if (verifyResult.unlocked) {
          // Messenger will automatically open via AuthContext state change!
          setIsVerifying(false);
          return;
        }
      } catch (err) {
        // quiet fail to preserve camouflage
      } finally {
        setIsVerifying(false);
      }
    }

    // Normal Calculator Behavior (if not unlocked or not an 8-digit PIN)
    if (operation === null || previousValue === null) {
      // Just keep current display
      return;
    }

    const prev = parseFloat(previousValue);
    const current = parseFloat(displayValue);
    const result = performCalculation(prev, current, operation);

    const formatted = isNaN(result) ? 'Error' : String(Number(result.toFixed(10)));
    setHistoryExpression(`${previousValue} ${operation} ${displayValue} =`);
    setDisplayValue(formatted);
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  }, [displayValue, operation, performCalculation, previousValue, verifyPin]);

  // Keyboard Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field (e.g. auth modal)
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        inputDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        inputDecimal();
      } else if (e.key === '+' || e.key === '-') {
        e.preventDefault();
        setOperator(e.key);
      } else if (e.key === '*') {
        e.preventDefault();
        setOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        setOperator('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clearAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearAll, handleBackspace, handleEquals, inputDecimal, inputDigit, setOperator]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-start sm:justify-center py-4 sm:py-6 md:py-8 px-3 sm:px-4 pb-12 bg-marble-surface select-none relative overflow-y-auto">
      {/* Subtle Luxury Golden Ambient Glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-[var(--accent-glow)] blur-[120px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-[var(--accent-glow)] blur-[120px] opacity-20 pointer-events-none" />

      {/* Top ERROREX Sovereign Header: ERROREX alone on top, followed cleanly by Function Name & Google ID option */}
      <header className="w-full max-w-sm sm:max-w-md flex flex-col gap-2.5 mb-4 sm:mb-5 z-10 shrink-0">
        {/* Brand row: ERROREX wordmark alone with crown */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <CrownLogo size="md" showWordmark={true} className="hover:scale-105 transition-transform" />
          </div>

          <div className="flex items-center gap-2">
            {/* Auto Theme Indicator if active */}
            {autoCycleEnabled && (
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-xl bg-[var(--accent-surface)] text-[var(--accent-primary)] border border-[var(--accent-border)] font-bold flex items-center gap-1.5 shadow-sm animate-pulse">
                <span>🔄</span>
                <span>Auto: {formattedCountdown}</span>
              </span>
            )}

            {/* Google ID & Save Password Option on Start */}
            {!user ? (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-white hover:bg-neutral-100 dark:bg-neutral-900/90 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 hover:border-[var(--accent-primary)] transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Sign in with Google ID or Saved Password"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="truncate max-w-[120px] sm:max-w-none">Google ID / Pass</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-xl bg-[var(--accent-surface)] text-[var(--accent-primary)] border border-[var(--accent-border)] font-semibold truncate max-w-[130px]">
                  {user.displayName || user.email?.split('@')[0] || 'User'}
                </span>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:text-rose-400 hover:border-rose-400 text-xs transition-colors"
                  title="Sign Out / Switch ID"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Function Name ALONE and clearly separated */}
        <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[var(--bg-card)]/90 border border-[var(--accent-border)] backdrop-blur-md shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--accent-primary)] font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
            <span>FUNCTION: KING VAULT 👑</span>
          </span>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            Sovereign Calculator
          </span>
        </div>
      </header>

      {/* Main Calculator Body */}
      <main className="w-full max-w-sm sm:max-w-md rounded-3xl p-5 sm:p-7 bg-marble-card border border-[var(--accent-border)] gold-glow shadow-2xl relative z-10 transition-all">
        {/* Calculator Display Screen Sub-Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-white/5">
          <span className="text-xs tracking-[0.2em] uppercase font-display font-bold gold-gradient-text">
            PRECISION INTERFACE
          </span>
        </div>

        {/* Display Screen */}
        <div className="w-full rounded-2xl p-4 sm:p-5 mb-5 bg-[var(--calc-display-bg)] border border-[var(--calc-btn-border)] flex flex-col justify-end min-h-[110px] text-right shadow-inner transition-colors">
          {/* History Formula */}
          <div className="h-6 text-xs sm:text-sm font-mono-calc text-neutral-500 dark:text-neutral-400 truncate mb-1">
            {historyExpression || '\u00A0'}
          </div>

          {/* Active Operand Display */}
          <div className="w-full overflow-x-auto overflow-y-hidden scrollbar-none">
            <span className="text-3xl sm:text-4xl font-mono-calc font-semibold text-[var(--calc-display-text)] tracking-tight inline-block min-w-full">
              {displayValue}
            </span>
          </div>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {/* Row 1 */}
          <button
            type="button"
            onClick={clearAll}
            className="h-12 sm:h-14 md:h-15 rounded-2xl bg-neutral-200/90 dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-800 hover:border-rose-400 text-sm font-bold text-rose-500 active:scale-95 transition-all shadow-sm"
          >
            AC
          </button>
          <button
            type="button"
            onClick={toggleSign}
            className="h-12 sm:h-14 md:h-15 rounded-2xl bg-neutral-200/90 dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-800 text-sm font-bold text-neutral-800 dark:text-neutral-300 active:scale-95 transition-all shadow-sm"
          >
            ±
          </button>
          <button
            type="button"
            onClick={inputPercent}
            className="h-12 sm:h-14 md:h-15 rounded-2xl bg-neutral-200/90 dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-800 text-sm font-bold text-neutral-800 dark:text-neutral-300 active:scale-95 transition-all shadow-sm"
          >
            %
          </button>
          <button
            type="button"
            onClick={() => setOperator('÷')}
            className={`h-12 sm:h-14 md:h-15 rounded-2xl border text-base font-bold active:scale-95 transition-all shadow-sm ${
              operation === '÷'
                ? 'bg-[var(--accent-primary)] text-black border-white'
                : 'bg-[var(--accent-surface)] border-[var(--accent-border)] text-[var(--accent-primary)] hover:border-[var(--accent-primary)]'
            }`}
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => inputDigit('7')}
            className="h-12 sm:h-14 md:h-15 rounded-2xl gold-button text-lg font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => inputDigit('8')}
            className="h-12 sm:h-14 md:h-15 rounded-2xl gold-button text-lg font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => inputDigit('9')}
            className="h-12 sm:h-14 md:h-15 rounded-2xl gold-button text-lg font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm"
          >
            9
          </button>
          <button
            type="button"
            onClick={() => setOperator('×')}
            className={`h-12 sm:h-14 md:h-15 rounded-2xl border text-base font-bold active:scale-95 transition-all shadow-sm ${
              operation === '×'
                ? 'bg-[var(--accent-primary)] text-black border-white'
                : 'bg-[var(--accent-surface)] border-[var(--accent-border)] text-[var(--accent-primary)] hover:border-[var(--accent-primary)]'
            }`}
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onClick={() => inputDigit('4')}
            className="h-12 sm:h-14 md:h-15 rounded-2xl gold-button text-lg font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => inputDigit('5')}
            className="h-12 sm:h-14 md:h-15 rounded-2xl gold-button text-lg font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => inputDigit('6')}
            className="h-12 sm:h-14 md:h-15 rounded-2xl gold-button text-lg font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm"
          >
            6
          </button>
          <button
            type="button"
            onClick={() => setOperator('-')}
            className={`h-12 sm:h-14 md:h-15 rounded-2xl border text-base font-bold active:scale-95 transition-all shadow-sm ${
              operation === '-'
                ? 'bg-[var(--accent-primary)] text-black border-white'
                : 'bg-[var(--accent-surface)] border-[var(--accent-border)] text-[var(--accent-primary)] hover:border-[var(--accent-primary)]'
            }`}
          >
            −
          </button>

          {/* Row 4 */}
          <button
            type="button"
            onClick={() => inputDigit('1')}
            className="h-12 sm:h-14 md:h-15 rounded-2xl gold-button text-lg font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => inputDigit('2')}
            className="h-12 sm:h-14 md:h-15 rounded-2xl gold-button text-lg font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => inputDigit('3')}
            className="h-12 sm:h-14 md:h-15 rounded-2xl gold-button text-lg font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm"
          >
            3
          </button>
          <button
            type="button"
            onClick={() => setOperator('+')}
            className={`h-12 sm:h-14 md:h-15 rounded-2xl border text-base font-bold active:scale-95 transition-all shadow-sm ${
              operation === '+'
                ? 'bg-[var(--accent-primary)] text-black border-white'
                : 'bg-[var(--accent-surface)] border-[var(--accent-border)] text-[var(--accent-primary)] hover:border-[var(--accent-primary)]'
            }`}
          >
            +
          </button>

          {/* Row 5 */}
          <button
            type="button"
            onClick={handleBackspace}
            title="Backspace"
            className="h-12 sm:h-14 md:h-15 rounded-2xl bg-neutral-200/90 dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 text-sm font-bold text-neutral-700 dark:text-neutral-400 active:scale-95 transition-all shadow-sm flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => inputDigit('0')}
            className="h-12 sm:h-14 md:h-15 rounded-2xl gold-button text-lg font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={inputDecimal}
            className="h-12 sm:h-14 md:h-15 rounded-2xl gold-button text-lg font-mono-calc font-bold text-[var(--text-main)] active:scale-95 transition-all shadow-sm"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleEquals}
            className="h-12 sm:h-14 md:h-15 rounded-2xl gold-button-accent text-lg font-bold active:scale-95 transition-all shadow-md flex items-center justify-center"
          >
            {isVerifying ? (
              <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              '='
            )}
          </button>
        </div>
      </main>
    </div>
  );
};
