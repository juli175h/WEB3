"use client";

import * as React from "react";
import { execGraphQL, queryGraphQL, subscribeGraphQL } from "../../../lib/graphql";

export default function PendingClient({ initialPending, initialError }) {
  const [playerName, setPlayerName] = React.useState("");
  const [pending, setPending] = React.useState(initialPending);
  const [error, setError] = React.useState(initialError);

  // Replace polling with a subscription; fall back to polling if subscription can't be established.
  React.useEffect(() => {
    if (!pending?.id) return;
    let cancelled = false;
    let unsub = null;

    (async () => {
      // One-time fetch to rehydrate client state in case the subscription
      // is established after the server-side state changed (avoids missing
      // the transition from pending → active during hydration).
      try {
        const data = await queryGraphQL(
          `
          query PendingGame($id: ID!) {
            pending_game(id: $id) {
              id
              pending
              creator
              players
              number_of_players
            }
          }
        `,
          { id: pending.id }
        );
        if (cancelled) return;
        const pg = data?.pending_game ?? null;
        if (!pg) {
          window.location.assign(`/game/${pending.id}`);
          return;
        }
        setPending(pg);
      } catch (err) {
        console.warn("Initial pending fetch failed (continuing to subscribe):", err);
      }

      try {
        const sub = await subscribeGraphQL(
          `
          subscription PendingSub($id: ID!) {
            pending(id: $id) {
              id
              pending
              creator
              players
              number_of_players
            }
          }
        `,
          { id: pending.id },
          {
            next: (payload) => {
              console.debug("Pending subscription payload:", payload);
              if (cancelled) return;
              const pg = payload?.pending ?? null;
              if (!pg) {
                // lobby gone → redirect to the active game page (same id)
                window.location.assign(`/game/${pending.id}`);
                return;
              }
              setPending(pg);
            },
            error: (err) => {
              console.warn("Subscription failed — no polling fallback:", err);
            },
          }
        );
        unsub = sub?.unsubscribe || (() => {});
      } catch (err) {
        // could not subscribe (e.g. no ws support) → fallback to polling
        console.warn("Could not open subscription; no polling fallback", err);
      }

      // also subscribe to active matches so we catch the match start even
      // if pending subscription payloads are shaped differently.
      try {
        const activeSub = await subscribeGraphQL(
          `
          subscription ActiveSub { active { id pending players { id name } } }
        `,
          {},
          {
            next: (payload) => {
              console.debug("Active subscription payload:", payload);
              if (cancelled) return;
              const active = payload?.active ?? null;
              if (active && active.id === pending.id) {
                window.location.assign(`/game/${pending.id}`);
              }
            },
            error: (err) => {
              console.warn("Active subscription failed:", err);
            },
          }
        );
        // chain cleanup
        const activeUnsub = activeSub?.unsubscribe || (() => {});
        const oldUnsub = unsub;
        unsub = () => {
          try { oldUnsub?.(); } catch (e) {}
          try { activeUnsub?.(); } catch (e) {}
        };
      } catch (err) {
        console.warn("Could not open active subscription", err);
      }
    })();

    return () => {
      cancelled = true;
      try { unsub?.(); } catch (e) {}
    };
  }, [pending?.id]);

  const handleJoin = async () => {
    if (!playerName.trim()) return alert("Enter your name");
    try {
      const res = await execGraphQL(
        `
        mutation Join($id: ID!, $player: String!) {
          join(id: $id, player: $player) {
            __typename
            ... on PendingGame { id }
            ... on ActiveMatch { id }
          }
        }
      `,
        { id: pending.id, player: playerName.trim() }
      );
      const g = res?.join;
      if (!g) throw new Error("No result");
      const to = g.__typename === "PendingGame" ? `/pending/${g.id}` : `/game/${g.id}`;
      window.location.assign(to);
    } catch (e) {
      alert(e?.message || "Could not join game");
    }
  };

  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!pending) return <p>Pending game not found.</p>;

  return (
    <>
      <section>
        <p>
          Creator: {pending.creator} — Players: {pending.players?.length ?? 0}/{pending.number_of_players}
        </p>

        <div style={{ margin: "8px 0" }}>
          <input
            placeholder="Your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button onClick={handleJoin} style={{ marginLeft: 8 }}>
            Join Game
          </button>
        </div>

        {pending.players && pending.players.length > 0 && (
          <div>
            <h4>Players joined</h4>
            <ul>
              {pending.players.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {pending.players?.length >= pending.number_of_players ? (
          <p>All players have joined — redirecting shortly...</p>
        ) : (
          <p>Waiting for players...</p>
        )}
      </section>
    </>
  );
}
