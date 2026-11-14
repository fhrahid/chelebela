import { NextResponse } from "next/server";
import {
  getAnalyticsCookies,
  hasMetricsOptOut,
  isLikelyBot,
  isSameOriginRequest,
  parseMetricEvent,
  recordBrowserMetric,
} from "@/lib/metrics-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function setCookies(response: NextResponse, cookies: ReturnType<typeof getAnalyticsCookies>) {
  const secure = process.env.NODE_ENV === "production";
  if (cookies.setVisitor) {
    response.cookies.set("cb_visitor", cookies.visitorId, {
      httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 365 * 24 * 60 * 60,
    });
  }
  if (cookies.setSession) {
    response.cookies.set("cb_analytics_session", cookies.sessionId, {
      httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 30 * 60,
    });
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (hasMetricsOptOut(request)) return new NextResponse(null, { status: 204 });
  if (isLikelyBot(request)) return new NextResponse(null, { status: 204 });

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }
  if (body.length > 4_000) return NextResponse.json({ error: "invalid_event" }, { status: 413 });

  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }
  const event = parseMetricEvent(input);
  if (!event) return NextResponse.json({ error: "invalid_event" }, { status: 400 });

  try {
    const { cookies, recorded } = recordBrowserMetric(request, event);
    const response = NextResponse.json({ ok: true, recorded }, {
      headers: { "Cache-Control": "no-store" },
    });
    setCookies(response, cookies);
    return response;
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
