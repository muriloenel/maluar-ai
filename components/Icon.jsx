/*
  components/Icon.jsx
  Icon-set custom, linha fina (stroke 1.5), 24x24 viewBox.
  Substitui os emojis no produto inteiro.

  Uso:
    import Icon from './Icon';
    <Icon name="chat" size={20} />
    <Icon name="sparkle" size={16} className="text-accent" />

  Suporta props:
    name       — qual ícone (ver lista abaixo)
    size       — px (default 20)
    strokeWidth — default 1.5
    className  — passa pro <svg>
*/
'use client';

import React from 'react';

const PATHS = {
  chat: (
    <>
      <path d="M4 6.5C4 5.12 5.12 4 6.5 4h11C18.88 4 20 5.12 20 6.5v8c0 1.38-1.12 2.5-2.5 2.5H10l-4 3.5V17H6.5C5.12 17 4 15.88 4 14.5v-8z" />
      <path d="M8.5 9.5h7M8.5 12.5h4" strokeLinecap="round" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.5l1.6 4.4c.25.7.8 1.25 1.5 1.5L19.5 11l-4.4 1.6c-.7.25-1.25.8-1.5 1.5L12 18.5l-1.6-4.4c-.25-.7-.8-1.25-1.5-1.5L4.5 11l4.4-1.6c.7-.25 1.25-.8 1.5-1.5L12 3.5z" strokeLinejoin="round" />
      <path d="M19 17l.6 1.6.4 1.4-1.6-.6-1.4-.4 1.6-.6L19 17z" strokeLinejoin="round" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M3.5 16l4-4 3.5 3.5L15 11l5.5 5.5" strokeLinejoin="round" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7.5" width="18" height="12" rx="1.5" />
      <path d="M9 7.5V6c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v1.5M3 13h18" strokeLinecap="round" />
    </>
  ),
  heart: <path d="M12 19.5s-7-4.5-7-10A4 4 0 0112 7a4 4 0 017 2.5c0 5.5-7 10-7 10z" strokeLinejoin="round" />,
  book: (
    <>
      <path d="M4 5.5C4 4.67 4.67 4 5.5 4H11v15.5H5.5c-.83 0-1.5-.67-1.5-1.5V5.5z" />
      <path d="M20 5.5C20 4.67 19.33 4 18.5 4H13v15.5h5.5c.83 0 1.5-.67 1.5-1.5V5.5z" />
      <path d="M12 4v15.5" />
    </>
  ),
  calculator: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <rect x="7.5" y="5.5" width="9" height="3" rx="0.5" />
      <circle cx="8.5" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="18" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c0-3.5 3.13-6 7-6s7 2.5 7 6" strokeLinecap="round" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" strokeLinecap="round" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" strokeLinecap="round" />,
  minus: <path d="M5 12h14" strokeLinecap="round" />,
  close: <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
  arrowLeft: <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />,
  arrowUpRight: <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />,
  chevronDown: <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />,
  chevronRight: <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
  send: <path d="M4.5 11.5L20 4l-5.5 16-3-7-7-1.5z" strokeLinejoin="round" />,
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />,
  trend: <path d="M4 17l5-6 4 3 7-9M14 5h6v6" strokeLinecap="round" strokeLinejoin="round" />,
  diamond: <path d="M12 3l4 5-4 13-4-13 4-5zM3 8h18l-9 13L3 8z" strokeLinejoin="round" />,
  feather: (
    <>
      <path d="M19 5C13 5 7 11 6 17l-2 3 3-2c6-1 12-7 12-13z" strokeLinejoin="round" />
      <path d="M14 10l-7 7" strokeLinecap="round" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6.5" cy="7" r="2.5" />
      <circle cx="6.5" cy="17" r="2.5" />
      <path d="M9 9l11 9M9 15L20 6" strokeLinecap="round" />
    </>
  ),
  star: <path d="M12 3.5l2.5 6 6.5.5-5 4.5 1.5 6.5L12 17.5l-5.5 3.5L8 14.5l-5-4.5 6.5-.5L12 3.5z" strokeLinejoin="round" />,
  bookmark: <path d="M6 4h12v17l-6-4-6 4V4z" strokeLinejoin="round" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 3 2.5 14 0 17M12 3.5c-2.5 3-2.5 14 0 17" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />,
  trash: <path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18M10.6 6.1A11 11 0 0112 6c6.5 0 10 6 10 6a16 16 0 01-3.4 4.2M6.6 6.6A16 16 0 002 12s3.5 6 10 6a11 11 0 003.9-.7" />
      <path d="M14.1 14.1A3 3 0 019.9 9.9" />
    </>
  ),
  google: (
    <path
      d="M21.35 11.1H12v2.85h5.35c-.25 1.6-1.65 4.7-5.35 4.7-3.2 0-5.85-2.65-5.85-5.85S8.8 6.95 12 6.95c1.85 0 3.05.8 3.75 1.5l2.55-2.45C16.65 4.4 14.5 3.5 12 3.5 7.3 3.5 3.5 7.3 3.5 12s3.8 8.5 8.5 8.5c4.9 0 8.15-3.45 8.15-8.3 0-.55-.05-1-.15-1.4z"
      fill="currentColor"
      stroke="none"
    />
  ),
  whatsapp: (
    <path
      d="M3.5 20.5l1.3-4.7a8.4 8.4 0 1115.7-4.3 8.4 8.4 0 01-12.7 7.3l-4.3 1.7zm5.5-4.5c2.5 1.5 6 1 7.5-1l-1-1.5c-.5.5-1.5 1-2 .5-1-.5-2-1.5-2.5-2.5-.5-.5 0-1.5.5-2L11 8c-1.5 0-2.5 1-2.5 2.5 0 2 1 4 2 5.5z"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" strokeLinecap="round" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" strokeLinejoin="round" />,
  key: (
    <>
      <circle cx="8" cy="15" r="3" />
      <path d="M10.5 13L21 2.5M16 7l3 3" strokeLinecap="round" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l-5-5 5-5M5 12h12" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  download: <path d="M12 3v13M7 11l5 5 5-5M5 21h14" strokeLinecap="round" strokeLinejoin="round" />,
};

export default function Icon({ name, size = 20, strokeWidth = 1.5, className = '', style }) {
  const path = PATHS[name];
  if (!path) {
    console.warn(`<Icon name="${name}" /> não existe. Adicione em components/Icon.jsx.`);
    return null;
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
