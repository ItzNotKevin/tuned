import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy for Spotify CDN preview URLs so the browser never hits the CDN
 * directly (avoids any potential CORS issues).
 *
 * Usage: GET /api/spotify/preview?url=<encoded-preview-url>
 */
export async function GET(req: NextRequest) {
  const previewUrl = req.nextUrl.searchParams.get("url");
  if (!previewUrl) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Only allow Spotify CDN domains
  let parsed: URL;
  try {
    parsed = new URL(previewUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const allowed =
    parsed.hostname.endsWith("scdn.co") ||
    parsed.hostname.endsWith("spotify.com") ||
    parsed.hostname.endsWith("dzcdn.net") ||
    parsed.hostname.endsWith("deezer.com");
  if (!allowed) {
    return NextResponse.json({ error: "Disallowed host" }, { status: 403 });
  }

  const upstream = await fetch(previewUrl);
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Upstream ${upstream.status}` },
      { status: 502 }
    );
  }

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
