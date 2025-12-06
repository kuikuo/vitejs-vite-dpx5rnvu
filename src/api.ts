// Mock API service for text and title data
export interface ApiEntry {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// New types for detailed search response
export interface ApiHitMetadata {
  abuseipdb_ip_score: string;
  code_snippet: string;
  incident_type: string;
  ioc_type: string;
  problem: string;
  source: string;
  threat_level: string;
  title: string;
  vt_hash_reputation: string;
}

export interface ApiHit {
  id: string;
  score: number;
  text: string;
  metadata: ApiHitMetadata;
}

export interface ApiDetailedResponse {
  answer: string;
  hits: ApiHit[];
}

const API_BASE = "http://localhost:8000/v1/query";

// Fallback entries if server is unavailable or returns invalid shape
const FALLBACK_ENTRIES: ApiEntry[] = [];

async function fetchApiData(query: string = "entries"): Promise<ApiEntry[]> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Entries fetch failed: ${res.status} ${text}`);
  }
  const data = await res.json().catch(() => null);
  const entries = Array.isArray(data) ? data : data?.hits;
  if (!Array.isArray(entries)) throw new Error("Invalid entries response shape");
  return entries as ApiEntry[];
}

async function fetchDetailedFromServer(keyword: string): Promise<ApiDetailedResponse> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: keyword })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Query failed: ${res.status} ${text}`);
  }
  const data = await res.json().catch(() => ({}));
  return {
    answer: data?.answer ?? `Answer for: ${keyword}\n\nTop results:\n- No answer provided.`,
    hits: Array.isArray(data?.hits) ? data.hits : []
  };
}

export const apiService = {
  async getEntries(): Promise<ApiEntry[]> {
    await delay(500);
    try {
      return await fetchApiData("");
    } catch {
      return [...FALLBACK_ENTRIES];
    }
  },

  async getRandomEntry(): Promise<ApiEntry> {
    await delay(300);
    try {
      const entries = await fetchApiData("entries");
      const randomIndex = Math.floor(Math.random() * entries.length);
      return { ...entries[randomIndex] };
    } catch {
      const randomIndex = Math.floor(Math.random() * FALLBACK_ENTRIES.length);
      return { ...FALLBACK_ENTRIES[randomIndex] };
    }
  },

  async searchEntries(keyword: string): Promise<ApiEntry[]> {
    await delay(400);
    try {
      // Prefer server-side search if backend supports returning entries for a keyword
      const serverEntries = await fetchApiData(keyword.trim() || "entries");
      return serverEntries;
    } catch {
      // Fallback to client-side filtering on fallback data
      const lowerKeyword = keyword.toLowerCase();
      return FALLBACK_ENTRIES.filter(entry =>
        entry.title.toLowerCase().includes(lowerKeyword) ||
        entry.content.toLowerCase().includes(lowerKeyword)
      );
    }
  },

  // New method: get detailed response (answer + hits) for a keyword
  async searchDetailed(keyword: string): Promise<ApiDetailedResponse> {
    await delay(400);
    try {
      return await fetchDetailedFromServer(keyword.trim());
    } catch {
      return {
        answer: `Answer for: ${keyword}\n\nTop results:\n- No results found.`,
        hits: []
      };
    }
  }
};