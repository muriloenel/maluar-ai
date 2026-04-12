import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Maluar AI — Sua Mentora de Nail Design';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1528 0%, #0c0b12 30%, #16152B 70%, #231D32 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(127,119,221,0.15) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,83,126,0.12) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Logo emoji */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 100,
            height: 100,
            borderRadius: 24,
            background: 'linear-gradient(135deg, #7F77DD 0%, #D4537E 100%)',
            marginBottom: 32,
            fontSize: 52,
          }}
        >
          💅
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #AFA9EC, #7F77DD, #D4537E)',
              backgroundClip: 'text',
              color: 'transparent',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            Maluar AI
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#9490A8',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            Sua Mentora de Nail Design
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 32,
            fontSize: 22,
            color: '#635F78',
            maxWidth: 600,
            textAlign: 'center',
            lineHeight: 1.5,
            display: 'flex',
          }}
        >
          Aprenda, crie posts e gerencie seu negócio com IA
        </div>

        {/* Bottom badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 20px',
            borderRadius: 50,
            background: 'rgba(127,119,221,0.1)',
            border: '1px solid rgba(127,119,221,0.2)',
          }}
        >
          <div style={{ fontSize: 14, color: '#7F77DD', fontWeight: 600, display: 'flex' }}>
            maluar-ai.vercel.app
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
