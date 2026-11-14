import { NextResponse } from "next/server";
import {
  getAnalyticsCookies,
  hasMetricsOptOut,
  isLikelyBot,
  isSameOriginRequest,
} from "@/lib/metrics-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (hasMetricsOptOut(request)) return new NextResponse(null, { status: 204 });
  if (isLikelyBot(request)) return new NextResponse(null, { status: 204 });

  const cookies = getAnalyticsCookies(request);
  const response = NextResponse.json({ ok: true }, {
    headers: { "Cache-Control": "no-store" },
  });
  const secure = process.env.NODE_ENV === "production";
  if (cookies.setVisitor) {
    response.cookies.set("cb_visitor", cookies.visitorId, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
    });
  }
  if (cookies.setSession) {
    response.cookies.set("cb_analytics_session", cookies.sessionId, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 60,
    });
  }
  return response;
}
