import type { Track } from "@/types/game";

// --- Token cache (in-memory, server-side only) ---
let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify token fetch failed: ${res.status} — ${body}`);
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

// Well-known playlist IDs for popular/recognizable tracks
const CURATED_PLAYLIST_IDS = [
  "37i9dQZEVXbMDoHDwVN2tF", // Global Top 50
  "37i9dQZEVXbLiRSasKsNU9", // US Top 50
];

export async function fetchCuratedTracks(limit = 30): Promise<Track[]> {
  const token = await getSpotifyToken();
  const allTracks: Track[] = [];

  for (const playlistId of CURATED_PLAYLIST_IDS) {
    if (allTracks.length >= limit) break;

    const res = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&fields=items(track(id,name,preview_url,artists))`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) continue;

    const data = await res.json();
    for (const item of data.items ?? []) {
      const track = item?.track;
      if (!track?.preview_url) continue;
      allTracks.push({
        id: track.id,
        name: track.name,
        artist: track.artists?.[0]?.name ?? "Unknown",
        previewUrl: track.preview_url,
      });
    }
  }

  // Deduplicate by id
  const seen = new Set<string>();
  return allTracks.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}
