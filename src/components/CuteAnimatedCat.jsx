import React, { useState } from 'react';

/**
 * CuteAnimatedCat - An adorable animated kitten companion.
 * Features:
 * - Waving paw welcoming the user
 * - Soft breathing / bobbing animation
 * - Blinking happy smiling eyes
 * - Twitching cute ear & swaying tail
 * - Floating sparkling heart
 * - Interactive tap/click with heart pop effect
 */
export const CuteAnimatedCat = ({ size = 64, className = '', theme = 'dark' }) => {
  const [isTapped, setIsTapped] = useState(false);

  const handleTap = () => {
    setIsTapped(true);
    setTimeout(() => setIsTapped(false), 900);
  };

  return (
    <div
      onClick={handleTap}
      className={`relative inline-block cursor-pointer select-none transition-transform active:scale-90 ${className}`}
      title="Bé mèo con chúc bạn ngày mới ngập tràn niềm vui! (Chạm để vuốt ve)"
      style={{ width: size, height: Math.round(size * 0.8) }}
    >
      <svg
        viewBox="0 0 100 80"
        className="w-full h-full overflow-visible drop-shadow-md"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Head & Body Gradient */}
          <linearGradient id="catWhiteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F8FAFC" />
          </linearGradient>

          {/* Calico / Ginger Patch Gradient */}
          <linearGradient id="catPatchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDBA74" />
            <stop offset="100%" stopColor="#FB923C" />
          </linearGradient>

          {/* Inner Ear Pink Gradient */}
          <linearGradient id="catEarPink" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FDA4AF" />
            <stop offset="100%" stopColor="#F43F5E" />
          </linearGradient>
        </defs>

        {/* Floating Heart Above Kitty */}
        <g className={`animate-cat-heart ${isTapped ? 'scale-125' : ''} transition-transform`}>
          <path
            d="M 76 12 C 73 7 67 8 67 13 C 67 18 76 25 76 25 C 76 25 85 18 85 13 C 85 8 79 7 76 12 Z"
            fill="#FB7185"
            stroke="#FFF"
            strokeWidth="0.8"
          />
          <circle cx="73" cy="11" r="1" fill="#FFF" opacity="0.8" />
        </g>

        {/* Animated Tail behind body */}
        <path
          className="animate-cat-tail"
          d="M 23 64 C 13 63 9 51 14 43 C 16 39 21 41 19 45 C 16 52 19 57 27 59 Z"
          fill="#FED7AA"
          stroke="#FB923C"
          strokeWidth="0.8"
        />

        {/* Main Cat Body & Head Group with Breathing Animation */}
        <g className={`animate-cat-body ${isTapped ? 'animate-bounce' : ''}`}>
          {/* Chubby Body */}
          <ellipse
            cx="50"
            cy="56"
            rx="27"
            ry="18"
            fill="url(#catWhiteGrad)"
            stroke="#E2E8F0"
            strokeWidth="1.2"
          />

          {/* Belly highlight */}
          <ellipse
            cx="50"
            cy="57"
            rx="18"
            ry="12"
            fill="#FFF"
            opacity="0.9"
          />

          {/* Left Ear with Cute Twitch */}
          <g className="animate-cat-ear">
            <path
              d="M 28 36 Q 22 14 41 24 Z"
              fill="url(#catWhiteGrad)"
              stroke="#CBD5E1"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Inner Pink Ear */}
            <path
              d="M 30 33 Q 26 19 38 26 Z"
              fill="url(#catEarPink)"
              opacity="0.75"
            />
          </g>

          {/* Right Ear (With Calico Orange Patch) */}
          <g>
            <path
              d="M 72 36 Q 78 14 59 24 Z"
              fill="url(#catPatchGrad)"
              stroke="#F97316"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Inner Pink Ear */}
            <path
              d="M 70 33 Q 74 19 62 26 Z"
              fill="url(#catEarPink)"
              opacity="0.8"
            />
          </g>

          {/* Round Chubby Head */}
          <ellipse
            cx="50"
            cy="40"
            rx="25"
            ry="20"
            fill="url(#catWhiteGrad)"
            stroke="#E2E8F0"
            strokeWidth="1.2"
          />

          {/* Cute Calico Patch on right side of face */}
          <path
            d="M 64 27 Q 75 34 70 47 Q 60 46 62 30 Z"
            fill="url(#catPatchGrad)"
            opacity="0.9"
          />

          {/* Happy Smiling Eyes with Soft Blink Animation */}
          <g className="animate-cat-blink">
            {/* Left Eye: Cute happy closed arc ^ */}
            <path
              d="M 37 40 Q 42 35 47 40"
              stroke="#334155"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right Eye: Cute happy closed arc ^ */}
            <path
              d="M 53 40 Q 58 35 63 40"
              stroke="#334155"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* Tiny Pink Nose */}
          <ellipse
            cx="50"
            cy="44.5"
            rx="2.2"
            ry="1.6"
            fill="#F43F5E"
          />

          {/* Sweet Cat W-Smile */}
          <path
            d="M 45 46.5 Q 47.5 49 50 46.5 Q 52.5 49 55 46.5"
            stroke="#334155"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Rosy Cheeks (Blush) */}
          <ellipse
            cx="33"
            cy="45"
            rx="4.5"
            ry="3"
            fill="#FDA4AF"
            opacity="0.75"
          />
          <ellipse
            cx="67"
            cy="45"
            rx="4.5"
            ry="3"
            fill="#FDA4AF"
            opacity="0.75"
          />

          {/* Cute Whiskers */}
          {/* Left Whiskers */}
          <line x1="28" y1="43" x2="18" y2="41" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="28" y1="46" x2="19" y2="47" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
          {/* Right Whiskers */}
          <line x1="72" y1="43" x2="82" y2="41" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="72" y1="46" x2="81" y2="47" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />

          {/* Resting Left Paw */}
          <ellipse
            cx="37"
            cy="58"
            rx="5.5"
            ry="3.8"
            fill="#FFF"
            stroke="#E2E8F0"
            strokeWidth="1.2"
          />
          {/* Left Toe dividers */}
          <line x1="35" y1="58" x2="35" y2="61" stroke="#CBD5E1" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="39" y1="58" x2="39" y2="61" stroke="#CBD5E1" strokeWidth="0.8" strokeLinecap="round" />

          {/* Waving Right Paw */}
          <g className="animate-cat-paw">
            <ellipse
              cx="67"
              cy="48"
              rx="6"
              ry="7.5"
              transform="rotate(-20 67 48)"
              fill="#FFF"
              stroke="#E2E8F0"
              strokeWidth="1.2"
            />
            {/* Cute Pink Paw Pad (Toe Bean) */}
            <ellipse
              cx="66.5"
              cy="46.5"
              rx="2.6"
              ry="2"
              fill="#FB7185"
              opacity="0.85"
            />
            <circle cx="64" cy="43" r="0.9" fill="#FB7185" opacity="0.85" />
            <circle cx="66.5" cy="42.5" r="0.9" fill="#FB7185" opacity="0.85" />
            <circle cx="69" cy="43.5" r="0.9" fill="#FB7185" opacity="0.85" />
          </g>
        </g>
      </svg>

      {/* Floating Interactive Hearts on Tap */}
      {isTapped && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-rose-500 animate-ping pointer-events-none">
          ❤️ Meow!
        </span>
      )}
    </div>
  );
};
