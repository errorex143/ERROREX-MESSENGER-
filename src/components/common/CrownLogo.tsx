import React from 'react';

interface CrownLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
}

export const CrownLogo: React.FC<CrownLogoProps> = ({
  size = 'md',
  showWordmark = true,
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-11 h-11',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-sm tracking-widest',
    md: 'text-lg tracking-widest',
    lg: 'text-2xl tracking-[0.25em]',
    xl: 'text-4xl tracking-[0.3em]'
  };

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Golden Crown Icon */}
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_10px_var(--accent-glow)]"
        >
          {/* Subtle Outer Glow Aura */}
          <circle cx="24" cy="24" r="22" fill="url(#crown_aura)" opacity="0.18" />

          {/* Luxury Crown Crest */}
          <path
            d="M6 36L10 18L19 27L24 10L29 27L38 18L42 36H6Z"
            fill="url(#gold_crown_grad)"
            stroke="url(#gold_crown_stroke)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Crown Base Band */}
          <path
            d="M6 36C6 35 12 34 24 34C36 34 42 35 42 36L41 40C41 41 35 42 24 42C13 42 7 41 7 40L6 36Z"
            fill="url(#gold_band_grad)"
            stroke="url(#gold_crown_stroke)"
            strokeWidth="1.2"
          />

          {/* Crown Jewels */}
          <circle cx="24" cy="10" r="2.5" fill="#FFF5DC" stroke="var(--accent-primary)" strokeWidth="1" />
          <circle cx="10" cy="18" r="2" fill="#FFF5DC" stroke="var(--accent-primary)" strokeWidth="0.8" />
          <circle cx="38" cy="18" r="2" fill="#FFF5DC" stroke="var(--accent-primary)" strokeWidth="0.8" />

          {/* Center Diamond on Crown Band */}
          <polygon points="24,35.5 26.5,38 24,40.5 21.5,38" fill="#FFFFFF" />
          <circle cx="14" cy="38" r="1.2" fill="var(--accent-primary)" />
          <circle cx="34" cy="38" r="1.2" fill="var(--accent-primary)" />

          <defs>
            <linearGradient id="gold_crown_grad" x1="6" y1="10" x2="42" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFF2B2" />
              <stop offset="0.3" stopColor="var(--accent-primary)" />
              <stop offset="0.7" stopColor="var(--accent-secondary)" />
              <stop offset="1" stopColor="#6C4E08" />
            </linearGradient>
            <linearGradient id="gold_band_grad" x1="6" y1="34" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--accent-secondary)" />
              <stop offset="0.5" stopColor="#FFF2B2" />
              <stop offset="1" stopColor="var(--accent-secondary)" />
            </linearGradient>
            <linearGradient id="gold_crown_stroke" x1="6" y1="10" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFF8E0" />
              <stop offset="0.5" stopColor="var(--accent-primary)" />
              <stop offset="1" stopColor="#8A670F" />
            </linearGradient>
            <radialGradient id="crown_aura" cx="24" cy="24" r="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--accent-primary)" />
              <stop offset="1" stopColor="transparent" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* ERROREX Wordmark */}
      {showWordmark && (
        <div className="flex flex-col">
          <span className={`font-display font-bold gold-gradient-text ${textSizes[size]}`}>
            ERROREX
          </span>
        </div>
      )}
    </div>
  );
};
