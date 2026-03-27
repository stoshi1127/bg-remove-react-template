'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';

type BeforeAfterSliderProps = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  title: string;
  description: string;
  beforeLabel: string;
  afterLabel: string;
  isPro?: boolean;
  initialPosition?: number;
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  title,
  description,
  beforeLabel,
  afterLabel,
  isPro = false,
  initialPosition = 50,
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(() => clamp(initialPosition));
  const [draggingPointerId, setDraggingPointerId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePositionFromClientX = (clientX: number) => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const bounds = container.getBoundingClientRect();
    const nextPosition = ((clientX - bounds.left) / bounds.width) * 100;
    setPosition(clamp(nextPosition));
  };

  return (
    <article className="">
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">仕上がり例</p>
        <h3 className="flex items-center justify-center gap-2 text-xl font-bold text-slate-900 ">
          <span>{title}</span>
          {isPro ? (
            <span className="text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-400 px-2 py-0.5 rounded-full text-white shadow-sm">
              PRO
            </span>
          ) : null}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{description}</p>
      </div>

      <div
        ref={containerRef}
        className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={(event) => {
          setDraggingPointerId(event.pointerId);
          event.currentTarget.setPointerCapture(event.pointerId);
          updatePositionFromClientX(event.clientX);
        }}
        onPointerMove={(event) => {
          if (draggingPointerId !== event.pointerId) {
            return;
          }

          updatePositionFromClientX(event.clientX);
        }}
        onPointerUp={(event) => {
          if (draggingPointerId !== event.pointerId) {
            return;
          }

          setDraggingPointerId(null);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={(event) => {
          if (draggingPointerId !== event.pointerId) {
            return;
          }

          setDraggingPointerId(null);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: '#f8fafc',
            backgroundImage:
              'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
            backgroundPosition: '0 0, 0 18px, 18px -18px, -18px 0',
            backgroundSize: '36px 36px',
          }}
        />

        <Image
          src={beforeSrc}
          alt={beforeAlt}
          fill
          sizes="(min-width: 1280px) 560px, (min-width: 768px) 50vw, 100vw"
          className="object-cover"
          priority={false}
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        />

        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        >
          <Image
            src={afterSrc}
            alt={afterAlt}
            fill
            sizes="(min-width: 1280px) 560px, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
            priority={false}
          />
        </div>

        <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `calc(${position}% - 1px)` }}>
          <div className="absolute inset-y-0 left-0 w-0.5 bg-white/90 shadow-[0_0_0_1px_rgba(15,23,42,0.15)]" />
        </div>

        <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm sm:left-4 sm:top-4 sm:text-sm">
          {beforeLabel}
        </div>
        <div className="pointer-events-none absolute right-3 top-3 z-20 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-slate-900 backdrop-blur-sm sm:right-4 sm:top-4 sm:text-sm">
          {afterLabel}
        </div>

        <div
          className="absolute top-1/2 z-20 -translate-y-1/2"
          style={{ left: `calc(${position}% - 28px)` }}
        >
          <div
            role="slider"
            aria-label={`${title}の比較スライダー`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(position)}
            tabIndex={0}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-700 shadow-lg outline-none transition group-hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                setPosition((current) => clamp(current - 5));
              }

              if (event.key === 'ArrowRight') {
                event.preventDefault();
                setPosition((current) => clamp(current + 5));
              }

              if (event.key === 'Home') {
                event.preventDefault();
                setPosition(0);
              }

              if (event.key === 'End') {
                event.preventDefault();
                setPosition(100);
              }
            }}
          >
            <div className="flex items-center gap-1">
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M10.5 3.5 6 8l4.5 4.5v-9Z" />
              </svg>
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M5.5 3.5 10 8l-4.5 4.5v-9Z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-slate-950/55 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm sm:bottom-4 sm:text-xs">
          左右にドラッグして比較
        </div>
      </div>
    </article>
  );
}
