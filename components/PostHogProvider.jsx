'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export default function PostHogProvider({ children }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      persistence: 'localStorage+cookie',
      // LGPD: respeitar consentimento — desabilitar session recording por padrão
      disable_session_recording: true,
    });
  }, []);

  if (!POSTHOG_KEY) return children;

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

// Helper para identificar usuário após login
export function identifyUser(user, profile) {
  if (!POSTHOG_KEY || !user) return;
  posthog.identify(user.id, {
    email: user.email,
    plan: profile?.plan || 'free',
    created_at: user.created_at,
  });
}

// Helper para track de eventos customizados
export function trackEvent(event, properties = {}) {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

// Helper para reset ao logout
export function resetPostHog() {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}
