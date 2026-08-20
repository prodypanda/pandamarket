'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type CheckoutAddress,
  type CheckoutItemInput,
  type CheckoutQuote,
  type CheckoutRequestError,
  type CheckoutScope,
  requestCheckoutQuote,
} from '@/lib/checkout-quote';

export type CheckoutQuoteStatus = 'idle' | 'loading' | 'refreshing' | 'ready' | 'error';

export function useCheckoutQuote(input: {
  scope: CheckoutScope;
  items: CheckoutItemInput[];
  shippingAddress: CheckoutAddress | null;
  couponCode?: string | null;
  enabled: boolean;
  debounceMs?: number;
}) {
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [status, setStatus] = useState<CheckoutQuoteStatus>('idle');
  const [error, setError] = useState<CheckoutRequestError | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const sequenceRef = useRef(0);
  const quoteRef = useRef<CheckoutQuote | null>(null);

  const refresh = useCallback(async (): Promise<CheckoutQuote> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const sequence = ++sequenceRef.current;
    setStatus(quoteRef.current ? 'refreshing' : 'loading');
    setError(null);

    try {
      const nextQuote = await requestCheckoutQuote({
        scope: input.scope,
        items: input.items,
        shippingAddress: input.shippingAddress,
        couponCode: input.couponCode,
        signal: controller.signal,
      });
      if (sequence === sequenceRef.current) {
        quoteRef.current = nextQuote;
        setQuote(nextQuote);
        setStatus('ready');
      }
      return nextQuote;
    } catch (requestFailure) {
      if (controller.signal.aborted) throw requestFailure;
      if (sequence === sequenceRef.current) {
        quoteRef.current = null;
        setQuote(null);
        setError(requestFailure as CheckoutRequestError);
        setStatus('error');
      }
      throw requestFailure;
    }
  }, [input.scope, input.items, input.shippingAddress, input.couponCode]);

  useEffect(() => {
    controllerRef.current?.abort();
    quoteRef.current = null;
    setQuote(null);
    setError(null);

    if (!input.enabled) {
      setStatus('idle');
      return undefined;
    }

    setStatus('loading');
    const timeout = window.setTimeout(() => {
      void refresh().catch(() => undefined);
    }, input.debounceMs ?? 350);

    return () => {
      window.clearTimeout(timeout);
      controllerRef.current?.abort();
    };
  }, [input.enabled, input.debounceMs, refresh]);

  return {
    quote,
    status,
    error,
    refresh,
    isLoading: status === 'loading' || status === 'refreshing',
  };
}
