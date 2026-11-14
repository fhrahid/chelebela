import { NextResponse } from "next/server";
import { getComparison, isValidComparisonToken } from "@/lib/comparison-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isValidComparisonToken(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const comparison = getComparison(id);
    if (!comparison) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(comparison, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
