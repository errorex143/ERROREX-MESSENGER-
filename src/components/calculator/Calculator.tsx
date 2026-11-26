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
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center py-3 sm:py-6 px-3.5 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] bg-marble-surface select-none relative overflow-x-hidden overflow-y-auto">
      {/* Subtle Luxury Golden Ambient Glow */}
      <div className="absolute top-1/4 -left-32 w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-[var(--accent-glow)] blur-[120px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-[var(--accent-glow)] blur-[120px] opacity-20 pointer-events-none" />

      {/* Clean Single-Row ERROREX Header */}
      <header className="w-full max-w-[390px] sm:max-w-[420px] lg:max-w-[440px] flex items-center justify-between gap-2 mb-3 sm:mb-4 z-10 shrink-0">
        <div className="flex items-center min-w-0">
          <CrownLogo size="md" showWordmark={true} className="hover:scale-105 transition-transform" />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {autoCycleEnabled && (
            <span className="text-[11px] font-mono tabular-nums text-[var(--accent-primary)] font-semibold whitespace-nowrap">
              {formattedCountdown}
            </span>
          )}

          {!user ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 min-h-[42px] py-2 px-3.5 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-main)] border border-[var(--accent-border)] hover:border-[var(--accent-primary)] transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
              title="Sign in or Create Account"
            >
              <LogIn className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
              <span>Sign In / ID</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-[var(--accent-primary)] truncate max-w-[115px] sm:max-w-[150px]">
                @{userProfile?.username || user.displayName || user.email?.split('@')[0] || 'member'}
              </span>
              <button
                type="button"
                onClick={logout}
                className="min-w-[40px] min-h-[40px] rounded-xl bg-[var(--bg-card)] border border-[var(--accent-border)] text-[var(--text-muted)] hover:text-rose-400 hover:border-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                title="Sign Out / Switch ID"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Calculator Body */}
      <main className="w-full max-w-[390px] sm:max-w-[420px] lg:max-w-[440px] rounded-3xl p-4 sm:p-6 bg-marble-card border border-[var(--accent-border)] gold-glow shadow-2xl relative z-10 transition-all">
        {/* Clean Display Meta Strip */}
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-neutral-200/80 dark:border-white/5">
          <span className="text-[11px] sm:text-xs tracking-[0.18em] uppercase font-display font-bold gold-gradient-text truncate">
            King Vault Calculator
          </span>
          <span className="text-[11px] text-[var(--text-muted)] shrink-0 whitespace-nowrap">
            Precision Mode
          </span>
        </div>

        {/* Display Screen */}
        <div className="w-full rounded-2xl p-3.5 sm:p-5 mb-4 sm:mb-5 bg-[var(--calc-display-bg)] border border-[var(--calc-btn-border)] flex flex-col justify-end min-h-[92px] sm:min-h-[112px] text-right shadow-inner transition-colors">
          {/* History Formula */}
          <div className="h-5 sm:h-6 text-xs sm:text-sm font-mono-calc text-neutral-500 dark:text-neutral-400 truncate mb-1">
            {historyExpression || '\u00A0'}
          </div>

          {/* Active Operand Display */}
          <div className="w-full overflow-x-auto overflow-y-hidden scrollbar-none">
            <span className="text-3xl sm:text-4xl font-mono-calc font-semibold text-[var(--calc-display-text)] tracking-tight inline-block min-w-full">
              {displayValue}
            </span>
          </div>
        </div>

        {/* Keypad Grid (>=52px mobile tap targets for comfortable one-hand thumb entry) */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {/* Row 1 */}
          <button
            type="button"
            onClick={clearAll}
            className="h-[52px] sm:h-14 rounded-2xl bg-neutral-200/90 dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-800 hover:border-rose-400 text-sm sm:text-base font-bold text-rose-500 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            AC
          </button>
          <button
            type="button"
            onClick={toggleSign}
            className="h-[52px] sm:h-14 rounded-2xl bg-neutral-200/90 dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-800 text-base font-bold text-neutral-800 dark:text-neutral-300 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            ±
          </button>
          <button
            type="button"
            onClick={inputPercent}
            className="h-[52px] sm:h-14 rounded-2xl bg-neutral-200/90 dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-800 text-base font-bold text-neutral-800 dark:text-neutral-300 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            %
          </button>
          <button
            type="button"
            onClick={() => setOperator('÷')}
            className={`h-[52px] sm:h-14 rounded-2xl border text-lg font-bold active:scale-95 transition-all shadow-sm cursor-pointer ${
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
            className="h-[52px] sm:h-14 rounded-2xl gold-button text-lg sm:text-xl font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => inputDigit('8')}
            className="h-[52px] sm:h-14 rounded-2xl gold-button text-lg sm:text-xl font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => inputDigit('9')}
            className="h-[52px] sm:h-14 rounded-2xl gold-button text-lg sm:text-xl font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            9
          </button>
          <button
            type="button"
            onClick={() => setOperator('×')}
            className={`h-[52px] sm:h-14 rounded-2xl border text-lg font-bold active:scale-95 transition-all shadow-sm cursor-pointer ${
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
            className="h-[52px] sm:h-14 rounded-2xl gold-button text-lg sm:text-xl font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => inputDigit('5')}
            className="h-[52px] sm:h-14 rounded-2xl gold-button text-lg sm:text-xl font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => inputDigit('6')}
            className="h-[52px] sm:h-14 rounded-2xl gold-button text-lg sm:text-xl font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            6
          </button>
          <button
            type="button"
            onClick={() => setOperator('-')}
            className={`h-[52px] sm:h-14 rounded-2xl border text-lg font-bold active:scale-95 transition-all shadow-sm cursor-pointer ${
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
            className="h-[52px] sm:h-14 rounded-2xl gold-button text-lg sm:text-xl font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => inputDigit('2')}
            className="h-[52px] sm:h-14 rounded-2xl gold-button text-lg sm:text-xl font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => inputDigit('3')}
            className="h-[52px] sm:h-14 rounded-2xl gold-button text-lg sm:text-xl font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            3
          </button>
          <button
            type="button"
            onClick={() => setOperator('+')}
            className={`h-[52px] sm:h-14 rounded-2xl border text-lg font-bold active:scale-95 transition-all shadow-sm cursor-pointer ${
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
            className="h-[52px] sm:h-14 rounded-2xl bg-neutral-200/90 dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 text-sm font-bold text-neutral-700 dark:text-neutral-400 active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => inputDigit('0')}
            className="h-[52px] sm:h-14 rounded-2xl gold-button text-lg sm:text-xl font-mono-calc font-semibold text-[var(--text-main)] active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={inputDecimal}
            className="h-[52px] sm:h-14 rounded-2xl gold-button text-lg sm:text-xl font-mono-calc font-bold text-[var(--text-main)] active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleEquals}
            className="h-[52px] sm:h-14 rounded-2xl gold-button-accent text-xl font-bold active:scale-95 transition-all shadow-md flex items-center justify-center cursor-pointer"
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
