import * as React from 'react';

type BrandMarkProps = {
  size: number;
};

const brandShadow = '0 24px 64px rgba(37, 99, 235, 0.22)';

export function BrandMark({ size }: BrandMarkProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: size * 0.28,
        background: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)',
        boxShadow: brandShadow,
      }}
    >
      <svg
        width={size * 0.54}
        height={size * 0.54}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z"
          fill="white"
        />
      </svg>
    </div>
  );
}

export function OgArtwork() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #f8fbff 0%, #eef6ff 42%, #ffffff 100%)',
        color: '#0f172a',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 10% 20%, rgba(14,165,233,0.16), transparent 30%), radial-gradient(circle at 88% 18%, rgba(37,99,235,0.14), transparent 24%), radial-gradient(circle at 78% 82%, rgba(125,211,252,0.18), transparent 26%)',
        }}
      />
      <div
        style={{
          display: 'flex',
          width: '100%',
          padding: '64px 72px',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '40px',
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '58%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              marginBottom: '24px',
              color: '#2563eb',
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <BrandMark size={68} />
            QuickTools
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div
              style={{
                fontSize: '84px',
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '-0.04em',
              }}
            >
              EasyCut
            </div>
            <div
              style={{
                fontSize: '40px',
                fontWeight: 600,
                color: '#334155',
                letterSpacing: '-0.02em',
              }}
            >
              Background Remover
            </div>
            <div
              style={{
                marginTop: '12px',
                fontSize: '26px',
                lineHeight: 1.4,
                color: '#475569',
                maxWidth: '680px',
              }}
            >
              Remove, replace, and compose image backgrounds online. Batch-ready, browser-based, and HEIC-friendly.
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '14px',
              marginTop: '34px',
              flexWrap: 'wrap',
            }}
          >
            {['Browser', 'Batch', 'HEIC', 'Composite'].map((label) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 20px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.86)',
                  border: '1px solid rgba(148, 163, 184, 0.28)',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '34%',
            height: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              minHeight: '360px',
              borderRadius: '40px',
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
              border: '1px solid rgba(191, 219, 254, 0.9)',
              boxShadow: '0 18px 48px rgba(148, 163, 184, 0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BrandMark size={230} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppleArtwork() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fbff 0%, #eef6ff 100%)',
      }}
    >
      <BrandMark size={140} />
    </div>
  );
}
