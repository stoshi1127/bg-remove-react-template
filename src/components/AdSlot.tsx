'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type AdUserPlan = 'pro' | 'free' | 'guest';
type AdVariant = 'A' | 'B';

type AdSlotProps = {
  slotId: string;
  variant: AdVariant;
  userPlan: AdUserPlan;
  minHeight?: number;
  href?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
};

type SponsorBannerConfig = {
  href: string;
  imageSrc: string;
  trackingSrc: string;
  width: number;
  height: number;
  alt: string;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const DEFAULT_SPONSOR_BANNER = {
  href: 'https://px.a8.net/svt/ejp?a8mat=45BYEN+3KN6I+2PEO+O720X',
  imageSrc: '/api/affiliate-assets/banner',
  trackingSrc: '/api/affiliate-assets/pixel',
  width: 468,
  height: 60,
  alt: '画像作業に役立つおすすめサービス',
} as const satisfies SponsorBannerConfig;

const STICKY_CTA_BANNER = {
  href: 'https://px.a8.net/svt/ejp?a8mat=45BYEN+3KN6I+2PEO+O1P4H',
  imageSrc: '/api/affiliate-assets/sticky-banner',
  trackingSrc: '/api/affiliate-assets/sticky-pixel',
  width: 234,
  height: 60,
  alt: '画像作業に役立つおすすめサービス',
} as const;

function sendAdEvent(name: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

function SponsorBanner({
  banner,
  slotId,
  variant,
  userPlan,
  className,
}: {
  banner: SponsorBannerConfig;
  slotId: string;
  variant: AdVariant;
  userPlan: AdUserPlan;
  className?: string;
}) {
  return (
    <div className={className}>
      <a
        href={banner.href}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        className="inline-block"
        onClick={() => {
          sendAdEvent('ad_click', {
            ad_slot: slotId,
            variant,
            user_plan: userPlan,
          });
        }}
      >
        <img
          width={banner.width}
          height={banner.height}
          alt={banner.alt}
          src={banner.imageSrc}
          loading="lazy"
          decoding="async"
          className="h-auto max-w-full"
        />
      </a>
      <img
        width={1}
        height={1}
        src={banner.trackingSrc}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
    </div>
  );
}

export function StickyCtaSponsorBanner({
  slotId,
  variant,
  userPlan,
}: {
  slotId: string;
  variant: AdVariant;
  userPlan: AdUserPlan;
}) {
  return (
    <SponsorBanner
      banner={STICKY_CTA_BANNER}
      slotId={slotId}
      variant={variant}
      userPlan={userPlan}
      className="pointer-events-auto mb-2 flex justify-center sm:justify-end"
    />
  );
}

export default function AdSlot({
  slotId,
  variant,
  userPlan,
  minHeight = 164,
  href,
  title = 'スポンサーリンク',
  description = '関連サービスをご紹介しています。',
  ctaLabel = '詳しく見る',
}: AdSlotProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const sentImpressionRef = useRef(false);
  const sentLoadedRef = useRef(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setIsNearViewport(true);
          if (!sentLoadedRef.current) {
            sentLoadedRef.current = true;
            sendAdEvent('ad_loaded', {
              ad_slot: slotId,
              variant,
              user_plan: userPlan,
            });
          }
          if (!sentImpressionRef.current && entry.intersectionRatio >= 0.5) {
            sentImpressionRef.current = true;
            sendAdEvent('ad_impression', {
              ad_slot: slotId,
              variant,
              user_plan: userPlan,
            });
          }
        }
      },
      { root: null, rootMargin: '200px 0px', threshold: [0, 0.5] }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [slotId, userPlan, variant]);

  const cardClassName = useMemo(
    () =>
      'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-left transition-colors hover:bg-gray-100',
    []
  );

  const content = (
    <>
      <div className="mb-2 text-xs font-semibold tracking-wide text-gray-500">スポンサーリンク</div>
      <div className="text-base font-semibold text-gray-900">{title}</div>
      <p className="mt-1 text-sm text-gray-700">{description}</p>
      {href ? (
        <span className="mt-3 inline-flex rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
          {ctaLabel}
        </span>
      ) : (
        <SponsorBanner
          banner={DEFAULT_SPONSOR_BANNER}
          slotId={slotId}
          variant={variant}
          userPlan={userPlan}
          className="mt-4 text-center"
        />
      )}
    </>
  );

  return (
    <section aria-label="広告枠" className="w-full">
      <div ref={rootRef} style={{ minHeight }}>
        {isNearViewport ? (
          href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cardClassName}
              onClick={() => {
                sendAdEvent('ad_click', {
                  ad_slot: slotId,
                  variant,
                  user_plan: userPlan,
                });
              }}
            >
              {content}
            </a>
          ) : (
            <div className={cardClassName}>{content}</div>
          )
        ) : (
          <div
            className="h-full w-full animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            aria-hidden="true"
          />
        )}
      </div>
    </section>
  );
}
