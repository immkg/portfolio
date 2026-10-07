"use client";

import posthog from "posthog-js";

/* PostHog, in the immkg organisation's own project (the Ludo game reports
   to a different organisation). The project token is public by design: it
   can only send events, never read them. */
const KEY = "phc_vJh9xy5wWSCGGHvVKrhpFPYWRCNS9JBeZP2gCFkzoTdL";
const HOST = "https://us.i.posthog.com";

let started = false;

export function startAnalytics() {
  if (started || typeof window === "undefined") return;
  // local builds and previews stay out of the numbers
  if (!/(^|\.)immkg\.github\.io$/.test(window.location.hostname)) return;
  started = true;
  posthog.init(KEY, {
    api_host: HOST,
    defaults: "2025-05-24",            // pageviews on client-side navigation too
    person_profiles: "identified_only",
    respect_dnt: true,
    session_recording: { maskAllInputs: true },
  });
  posthog.register({ site: "portfolio" });
}

/** A named moment in a visit: what was opened, how someone said hi. */
export function track(event: string, props?: Record<string, unknown>) {
  // ask PostHog itself, not a local flag: a module flag can be a separate
  // copy in another bundle chunk and never see the start
  if ((posthog as any).__loaded) posthog.capture(event, props);
}
