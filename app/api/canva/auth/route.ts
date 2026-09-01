import { NextResponse } from "next/server";
import { beginAuth } from "@/lib/canva/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.redirect(beginAuth());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Canva auth failed.";
    return new NextResponse(`<html><body style="font-family:sans-serif;padding:40px"><h3>Canva setup needed</h3><p>${message}</p></body></html>`, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}
