import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Calculator } from './components/calculator/Calculator';
import { PinSetupScreen } from './components/auth/PinSetupScreen';
import { AuthModal } from './components/auth/AuthModal';
import { MessengerDashboard } from './components/messenger/MessengerDashboard';

function MainApp() {
  const { user, hasPin, isUnlocked, loading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#050507] text-white">
        <div className="w-12 h-12 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin mb-4" />
        <span className="font-display tracking-[0.25em] text-xs uppercase gold-gradient-text">
          Initializing ERROREX
        </span>
      </div>
    );
  }

  // If user is authenticated but hasn't set up their secret 8-digit PIN yet:
  if (user && hasPin === false) {
    return <PinSetupScreen />;
  }

  // If user is authenticated and has unlocked the secret PIN:
  if (user && isUnlocked) {
    return <MessengerDashboard />;
  }

  // Default Sovereign Facade: The Real Functional Luxury Calculator
  return (
    <>
      <Calculator onOpenAuth={() => setIsAuthModalOpen(true)} />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
