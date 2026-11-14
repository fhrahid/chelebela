import { NextResponse } from "next/server";
import { createComparison } from "@/lib/comparison-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
    const created = createComparison(input);
    if (!created) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    return NextResponse.json(created, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
