"use client";

import { useEffect } from "react";

const VISITOR_KEY = "larkup_visitor_id";

function getVisitorId() {
  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_KEY, id);
  return id;
}

/** Records one anonymous view when a published article is opened. */
export function AnalyticsTracker({ postId }: { postId: number }) {
  useEffect(() => {
    try {
      const body = JSON.stringify({ postId, visitorId: getVisitorId() });
      const blob = new Blob([body], { type: "application/json" });

      if (!navigator.sendBeacon("/api/analytics/views", blob)) {
        void fetch("/api/analytics/views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      }
    } catch {
      // Analytics must never affect the reader's article experience.
    }
  }, [postId]);

  return null;
}
