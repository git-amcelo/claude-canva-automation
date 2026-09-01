import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/canva/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await getAccessToken();
    return NextResponse.json({ connected: !!token });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
