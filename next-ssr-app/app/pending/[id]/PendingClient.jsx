"use client";

import * as React from "react";
import { subscribeGraphQL } from "../../../lib/graphql";

export default function PendingClient({ initialPending, initialError }) {
  const [pending, setPending] = React.useState(initialPending);
  const [error, setError] = React.useState(initialError);

  // Subscribe to updates - skip initial fetch since we have initialPending from SSR
  React.useEffect(() => {
    if (!pending?.id) return;
    let cancelled = false;
    let unsub = null;

    (async () => {
      // Skip initial fetch - we already have data from props
      // Just set up subscriptions for real-time updates

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
              console.warn("Subscription failed:", err);
            },
          }
        );
        unsub = sub?.unsubscribe || (() => {});
      } catch (err) {
        console.warn("Could not open subscription", err);
      }

      // also subscribe to active matches so we catch the match start
      try {
        const activeSub = await subscribeGraphQL(
          `subscription ActiveSub { active { id pending players { id name } } }`,
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

  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!pending) return <p>Pending game not found.</p>;

  return (
    <>
      <section>
        <p>
          Creator: {pending.creator} — Players: {pending.players?.length ?? 0}/{pending.number_of_players}
        </p>

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
