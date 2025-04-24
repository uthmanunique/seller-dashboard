// src/app/auth/route.ts
import { NextResponse } from "next/server";

interface AuthPayload {
  token: string;
  refreshToken: string;
  userData: Record<string, unknown>;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("auth");
  if (!raw) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  let state: AuthPayload;
  try {
    state = JSON.parse(Buffer.from(raw, "base64").toString());
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.set("accessToken", state.token, { httpOnly: true, maxAge: 3600, sameSite: "lax", secure: true });
  res.cookies.set("refreshToken", state.refreshToken, { httpOnly: true, maxAge: 7 * 24 * 3600, sameSite: "lax", secure: true });
  res.cookies.set("role", (state.userData.role as string) || "SELLER", { maxAge: 7 * 24 * 3600, sameSite: "lax", secure: true });
  const dataKey = (state.userData.role as string) === "BUYER" ? "buyerData" : "sellerData";
  res.cookies.set(dataKey, JSON.stringify(state.userData), { maxAge: 7 * 24 * 3600, sameSite: "lax", secure: true });

  return res;
}
