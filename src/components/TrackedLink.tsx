'use client';

import Link from 'next/link';
import type { ComponentProps, MouseEvent } from 'react';

import { trackAnalyticsEvent } from '@/lib/analytics/events';

type TrackedLinkProps = ComponentProps<typeof Link> & {
  eventName?: string;
  source?: string;
};

export default function TrackedLink({
  eventName,
  source,
  onClick,
  ...props
}: TrackedLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (eventName) {
      trackAnalyticsEvent(eventName, { source });
    }

    onClick?.(event);
  };

  return <Link {...props} onClick={handleClick} />;
}
