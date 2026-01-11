const CONFIG_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ||
  process.env.NEXT_PUBLIC_GRAPHQL_URL ||
  null;

function generateCandidates() {
  const c = [];
  // try same-origin proxy first
  c.push("/graphql");
  if (CONFIG_URL) c.push(CONFIG_URL);
  if (CONFIG_URL && CONFIG_URL.includes("127.0.0.1")) c.push(CONFIG_URL.replace("127.0.0.1", "localhost"));
  if (CONFIG_URL && CONFIG_URL.includes("localhost")) c.push(CONFIG_URL.replace("localhost", "127.0.0.1"));
  c.push("http://localhost:4000/graphql");
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      c.push(`${window.location.protocol}//${host}:4000/graphql`);
    }
  }
  // dedupe
  return Array.from(new Set(c));
}

async function tryFetch(url, query, variables) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error(`Invalid JSON from ${url} — HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  if (!res.ok || json.errors) {
    const errMsg = json.errors ? JSON.stringify(json.errors) : `${res.status} ${res.statusText}`;
    throw new Error(`GraphQL error from ${url}: ${errMsg}`);
  }
  return json.data;
}

async function requestGraphQL(query, variables = {}) {
  const candidates = generateCandidates();
  const errors = [];
  for (const url of candidates) {
    try {
      return await tryFetch(url, query, variables);
    } catch (err) {
      errors.push({ url, message: err?.message || String(err) });
      // continue to next candidate
    }
  }
  const details = errors.map((e) => `${e.url} -> ${e.message}`).join("; ");
  throw new Error(`Network error when contacting GraphQL endpoint. Attempts: ${details}`);
}

// New: subscribeGraphQL using graphql-ws (dynamically imported so SSR won't eagerly require ws libs)
export async function subscribeGraphQL(query, variables = {}, handlers = {}) {
  if (typeof window === "undefined") {
    // SSR: return noop unsubscribe
    return { unsubscribe: () => {} };
  }

  function toWsUrl(httpUrl) {
    if (!httpUrl) return null;
    // same-origin proxy path
    if (httpUrl === "/graphql" || httpUrl.endsWith("/graphql") && httpUrl.startsWith("/")) {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${window.location.host}/graphql`;
    }
    if (httpUrl.startsWith("https://")) return httpUrl.replace(/^https:/, "wss:");
    if (httpUrl.startsWith("http://")) return httpUrl.replace(/^http:/, "ws:");
    // absolute ws already?
    if (httpUrl.startsWith("ws://") || httpUrl.startsWith("wss://")) return httpUrl;
    return null;
  }

  const candidates = generateCandidates();
  const errors = [];

  // dynamically import graphql-ws only when trying to subscribe
  const { createClient } = await import("graphql-ws");

  for (const url of candidates) {
    try {
      const wsUrl = toWsUrl(url);
      if (!wsUrl) continue;
      const client = createClient({ url: wsUrl.replace(/\/+$/, "") });
      // graphql-ws subscribe returns a dispose function in the browser
      const dispose = client.subscribe(
        { query, variables },
        {
          next: (msg) => { try { handlers.next?.(msg?.data ?? msg); } catch (e) { console.error(e); } },
          error: (err) => { handlers.error?.(err); },
          complete: () => { handlers.complete?.(); },
        }
      );
      return { unsubscribe: () => { try { dispose?.(); } catch(e){ /* ignore */ } } };
    } catch (err) {
      errors.push({ url, message: err?.message || String(err) });
      // try next candidate
    }
  }

  const details = errors.map((e) => `${e.url} -> ${e.message}`).join("; ");
  throw new Error(`Could not establish GraphQL subscription. Attempts: ${details}`);
}

export async function queryGraphQL(query, variables = {}) {
  return requestGraphQL(query, variables);
}

export async function execGraphQL(mutation, variables = {}) {
  return requestGraphQL(mutation, variables);
}
