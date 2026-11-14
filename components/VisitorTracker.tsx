"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackMetric } from "@/lib/metrics-client";

export default function VisitorTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const firstView = useRef(true);

  useEffect(() => {
    if (!pathname || pathname === "/admin" || pathname.startsWith("/admin/")) return;
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
