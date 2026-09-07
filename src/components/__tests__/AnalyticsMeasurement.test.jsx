import React, { StrictMode } from 'react';
import { act, render } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';

import BillingTracking from '../BillingTracking';
import PricingTable from '../PricingTable';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

describe('analytics measurement', () => {
  beforeEach(() => {
    window.gtag = jest.fn();
    window.sessionStorage.clear();
    useSearchParams.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete window.IntersectionObserver;
  });

  test('records a pricing view only after half of the table is visible', () => {
    let observerCallback;
    const disconnect = jest.fn();
    window.IntersectionObserver = jest.fn((callback) => {
      observerCallback = callback;
      return { observe: jest.fn(), disconnect, unobserve: jest.fn() };
    });

    render(<PricingTable source="top_cta" />);
    expect(window.gtag).not.toHaveBeenCalled();

    act(() => observerCallback([{ isIntersecting: true, intersectionRatio: 0.49 }]));
    expect(window.gtag).not.toHaveBeenCalled();

    act(() => observerCallback([{ isIntersecting: true, intersectionRatio: 0.5 }]));
    act(() => observerCallback([{ isIntersecting: true, intersectionRatio: 1 }]));
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith('event', 'pricing_table_view', {
      event_source: 'top_cta',
    });
    expect(disconnect).toHaveBeenCalled();
  });

  test('deduplicates a verified checkout completion by billing reference', () => {
    useSearchParams.mockReturnValue(new URLSearchParams(
      'billing=success&billing_flow=email&billing_ref=abc123',
    ));

    const first = render(<StrictMode><BillingTracking /></StrictMode>);
    first.unmount();
    render(<BillingTracking />);

    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith('event', 'checkout_completed', {
      event_source: 'verified_billing_return',
      billing_flow: 'email',
    });
  });
});
