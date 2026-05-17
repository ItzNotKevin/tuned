import { NextResponse } from "next/server";
import { fetchCuratedTracks } from "@/lib/deezer";

export async function GET() {
  try {
    const tracks = await fetchCuratedTracks(20);
    return NextResponse.json({ tracks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
