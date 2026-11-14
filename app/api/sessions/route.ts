import { NextResponse } from "next/server";
import { createQuizSession, getQuizSession } from "@/lib/comparison-db";
import { computeResult } from "@/lib/scoring";
import { DEFAULT_DATASET } from "@/lib/data";
import { hasMetricsOptOut, isLikelyBot, isSameOriginRequest, recordCompletedQuizMetric } from "@/lib/metrics-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 32_000) {
    return NextResponse.json({ error: "invalid_request" }, { status: 413 });
  }

  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 32_000) {
      return NextResponse.json({ error: "invalid_request" }, { status: 413 });
    }
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const created = createQuizSession(input);
    if (!created) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    const response = NextResponse.json({ id: created.id, expiresAt: created.expiresAt }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
    if (created.created && !hasMetricsOptOut(request) && !isLikelyBot(request)) {
      try {
        const session = getQuizSession(created.id);
        if (session) {
          const score = computeResult(session.responses, DEFAULT_DATASET, {
            askedItemIds: session.askedIds,
          }).overallScore;
          const cookies = recordCompletedQuizMetric(request, session, score);
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
      } catch {
        // Analytics failure must never turn a saved quiz result into a failed quiz.
      }
    }
    return response;
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
