import { Observable, Subject, share, takeUntil } from "rxjs";

const CONFIG_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ||
  process.env.NEXT_PUBLIC_GRAPHQL_URL ||
  null;

// Cache the working endpoint to avoid re-discovery on every request
let cachedEndpoint: string | null = null;

function generateCandidates() {
  const c = [];
  // If we have a cached working endpoint, try it first
  if (cachedEndpoint) c.push(cachedEndpoint);
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

async function tryFetch(url: string, query: string, variables: any) {
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
  // Cache the working endpoint
  cachedEndpoint = url;
  return json.data;
}

async function requestGraphQL(query: string, variables = {}) {
  const candidates = generateCandidates();
  const errors: Array<{ url: string; message: string }> = [];
  for (const url of candidates) {
    try {
      return await tryFetch(url, query, variables);
    } catch (err: any) {
      errors.push({ url, message: err?.message || String(err) });
      // continue to next candidate
    }
  }
  // Clear cache if all endpoints failed
  cachedEndpoint = null;
  const details = errors.map((e) => `${e.url} -> ${e.message}`).join("; ");
  throw new Error(`Network error when contacting GraphQL endpoint. Attempts: ${details}`);
}

// Cache the working WebSocket endpoint
let cachedWsEndpoint: string | null = null;

// Type for subscription payloads
export interface GraphQLSubscription<T = any> {
  data?: T;
  errors?: any[];
}

/**
 * Creates an RxJS Observable for GraphQL subscriptions.
 * Uses graphql-ws under the hood, but exposes reactive streams for consumption.
 * 
 * @param query - The GraphQL subscription query string
 * @param variables - Variables to pass to the subscription
 * @returns Observable that emits subscription payloads
 */
export function subscribeGraphQL$<T = any>(
  query: string,
  variables: any = {}
): Observable<T> {
  return new Observable<T>((subscriber) => {
    // SSR guard - complete immediately on server
    if (typeof window === "undefined") {
      subscriber.complete();
      return;
    }

    let dispose: (() => void) | null = null;
    let isDisposed = false;

    function toWsUrl(httpUrl: string): string | null {
      if (!httpUrl) return null;
      if (httpUrl === "/graphql" || (httpUrl.endsWith("/graphql") && httpUrl.startsWith("/"))) {
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${proto}//${window.location.host}/graphql`;
      }
      if (httpUrl.startsWith("https://")) return httpUrl.replace(/^https:/, "wss:");
      if (httpUrl.startsWith("http://")) return httpUrl.replace(/^http:/, "ws:");
      if (httpUrl.startsWith("ws://") || httpUrl.startsWith("wss://")) return httpUrl;
      return null;
    }

    (async () => {
      try {
        const { createClient } = await import("graphql-ws");

        const candidates = cachedWsEndpoint
          ? [cachedWsEndpoint, ...generateCandidates().map(toWsUrl).filter(Boolean)]
          : generateCandidates().map(toWsUrl).filter(Boolean);

        const errors: Array<{ url: string; message: string }> = [];

        for (const wsUrl of candidates as string[]) {
          if (isDisposed) return;
          
          try {
            const client = createClient({ url: wsUrl.replace(/\/+$/, "") });
            
            dispose = client.subscribe(
              { query, variables },
              {
                next: (msg: any) => {
                  if (!isDisposed) {
                    subscriber.next(msg?.data ?? msg);
                  }
                },
                error: (err: any) => {
                  subscriber.error(err);
                },
                complete: () => {
                  subscriber.complete();
                },
              }
            );
            
            cachedWsEndpoint = wsUrl;
            return; // Successfully connected, exit the loop
          } catch (err: any) {
            errors.push({ url: wsUrl, message: err?.message || String(err) });
          }
        }

        // All endpoints failed
        cachedWsEndpoint = null;
        const details = errors.map((e) => `${e.url} -> ${e.message}`).join("; ");
        subscriber.error(new Error(`Could not establish GraphQL subscription. Attempts: ${details}`));
      } catch (err) {
        subscriber.error(err);
      }
    })();

    // Cleanup function when unsubscribed
    return () => {
      isDisposed = true;
      try {
        dispose?.();
      } catch (e) {
        // ignore cleanup errors
      }
    };
  });
}

/**
 * Legacy callback-based subscription API for backward compatibility.
 * Prefer using subscribeGraphQL$ which returns an RxJS Observable.
 * 
 * @deprecated Use subscribeGraphQL$ instead
 */
export async function subscribeGraphQL(query: string, variables: any = {}, handlers: any = {}) {
  if (typeof window === "undefined") {
    return { unsubscribe: () => {} };
  }

  const subscription = subscribeGraphQL$(query, variables).subscribe({
    next: (data) => {
      try {
        handlers.next?.(data);
      } catch (e) {
        console.error(e);
      }
    },
    error: (err) => handlers.error?.(err),
    complete: () => handlers.complete?.(),
  });

  return { unsubscribe: () => subscription.unsubscribe() };
}

export async function queryGraphQL(query, variables = {}) {
  return requestGraphQL(query, variables);
}

export async function execGraphQL(mutation, variables = {}) {
  return requestGraphQL(mutation, variables);
}
