import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_COOKIE,
  createAdminSession,
  isAdminConfigured,
  isAdminLoginAllowed,
  isSameAdminOrigin,
  noteAdminLogin,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({ password: z.string().min(1).max(256) }).strict();

export async function POST(request: Request) {
  if (!isSameAdminOrigin(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }
  if (!isAdminLoginAllowed()) {
    return NextResponse.json({ error: "try_later" }, { status: 429 });
  }

  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 2_000) return NextResponse.json({ error: "invalid_request" }, { status: 413 });
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success || !verifyAdminPassword(parsed.data.password)) {
    noteAdminLogin(false);
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  noteAdminLogin(true);
  const session = createAdminSession();
  if (!session) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  const response = NextResponse.json({ ok: true }, {
    headers: { "Cache-Control": "no-store" },
  });
  response.cookies.set(ADMIN_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(session.expiresAt),
  });
  return response;
}
