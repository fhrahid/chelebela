import { NextResponse } from "next/server";
import { isAdminConfigured, isAdminRequest } from "@/lib/admin-auth";
import { getAnalyticsDashboard } from "@/lib/metrics-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
  if (![7, 30, 90].includes(days)) {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }
  try {
    return NextResponse.json(getAnalyticsDashboard(days), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
