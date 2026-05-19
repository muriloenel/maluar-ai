/*
  components/MaluarMark.jsx
  Logo monogram (estrutura herdada do logo original /logo-maluar.svg).
  Suporta 3 modos:
    - default (gradient rosé→mauve→rosegold)
    - solid (cor sólida via prop color)
    - dark (sobre fundo escuro)
*/
'use client';

import React from 'react';

let _id = 0;

export default function MaluarMark({ size = 32, color, dark = false, className = '', solid = false }) {
  // ID único por instância pra não colidir <defs>
  const gradId = React.useMemo(() => `maluarGrad-${++_id}`, []);
  const fill = solid
    ? (color || (dark ? '#FFFFFF' : 'var(--color-text)'))
    : `url(#${gradId})`;

  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {!solid && (
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent)" />
            <stop offset="50%" stopColor="var(--color-mauve)" />
            <stop offset="100%" stopColor="var(--color-rosegold)" />
          </linearGradient>
        </defs>
      )}
      <path d="M256 56 L156 156 L156 236 L206 186 L206 356 L256 296 L306 356 L306 186 L356 236 L356 156 Z" fill={fill} />
      <path d="M206 370 L256 310 L306 370 L256 430 Z" fill={fill} />
    </svg>
  );
}

export function MaluarWordmark({ size = 28, dark = false, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <MaluarMark size={size} dark={dark} />
      <div className="leading-tight">
        <div
          className="font-display"
          style={{
            fontSize: size * 0.78,
            letterSpacing: '0.04em',
            color: dark ? '#FFFFFF' : 'var(--color-text)',
            lineHeight: 1,
          }}
        >
          Maluar
        </div>
        <div
          className="text-text-light uppercase"
          style={{
            fontSize: Math.max(9, size * 0.32),
            letterSpacing: '0.22em',
            marginTop: 2,
            fontWeight: 600,
          }}
        >
          Nail Design AI
        </div>
      </div>
    </div>
  );
}
