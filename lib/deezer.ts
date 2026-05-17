import type { Track } from "@/types/game";

// Well-known songs that are recognizable across a wide audience
const SEARCH_QUERIES = [
  "Bohemian Rhapsody Queen",
  "Billie Jean Michael Jackson",
  "Shape of You Ed Sheeran",
  "Rolling in the Deep Adele",
  "Blinding Lights The Weeknd",
  "Hotel California Eagles",
  "Smells Like Teen Spirit Nirvana",
  "Uptown Funk Bruno Mars",
  "Happy Pharrell Williams",
  "Stairway to Heaven Led Zeppelin",
  "Sweet Child O Mine Guns N Roses",
  "Like a Rolling Stone Bob Dylan",
  "Thriller Michael Jackson",
  "Born to Run Bruce Springsteen",
  "Purple Rain Prince",
  "Lose Yourself Eminem",
  "Empire State of Mind Jay-Z",
  "Bad Guy Billie Eilish",
  "Old Town Road Lil Nas X",
  "Despacito Luis Fonsi",
];

async function searchDeezer(query: string): Promise<Track | null> {
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;

  const data = await res.json();
  const items: DeezerTrack[] = data.data ?? [];

  for (const item of items) {
    if (item.preview) {
      return {
        id: String(item.id),
        name: item.title,
        artist: item.artist.name,
        previewUrl: item.preview,
      };
    }
  }
  return null;
}

interface DeezerTrack {
  id: number;
  title: string;
  preview: string;
  artist: { name: string };
}

export async function fetchCuratedTracks(limit = 30): Promise<Track[]> {
  const queries = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);

  const results = await Promise.all(
    queries.slice(0, Math.min(limit, queries.length)).map(searchDeezer)
  );

  return results.filter((t): t is Track => t !== null);
}
