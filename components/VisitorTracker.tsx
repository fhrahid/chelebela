"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackMetric } from "@/lib/metrics-client";

export default function VisitorTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const firstView = useRef(true);

  useEffect(() => {
    if (!pathname || pathname === "/chhelebela-insights-7f3c9a" || pathname.startsWith("/chhelebela-insights-7f3c9a/")) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackMetric({
      name: "page_view",
      path: pathname,
      ...(firstView.current && document.referrer ? { referrer: document.referrer } : {}),
    });
    firstView.current = false;
  }, [pathname]);

  return null;
}
