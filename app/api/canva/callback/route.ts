import { NextRequest, NextResponse } from "next/server";
import { finishAuth } from "@/lib/canva/auth";

export const runtime = "nodejs";

function htmlPage(body: string, script = "") {
  return new NextResponse(
    `<html><body style="font-family:sans-serif;padding:40px;text-align:center">${body}<script>${script}</script></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code || !state) {
    return htmlPage(`<h3>Canva connection cancelled</h3><p>${error ?? "Missing authorization code."}</p><p>You can close this window.</p>`);
  }

  try {
    await finishAuth(code, state);
    return htmlPage(
      "<h3>Canva connected ✓</h3><p>You can close this window.</p>",
      'if(window.opener){window.opener.postMessage("canva-connected","*");} setTimeout(()=>window.close(),800);'
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token exchange failed.";
    return htmlPage(`<h3>Canva connection failed</h3><p>${message}</p><p>Close this window and try again.</p>`);
  }
}
