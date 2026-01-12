"use client";

import * as React from "react";
import { merge, tap } from "rxjs";
import { subscribeGraphQL$ } from "../../../lib/graphql";

// Subscription queries
const PENDING_SUBSCRIPTION = `
  subscription PendingSub($id: ID!) {
    pending(id: $id) {
      id
      pending
      creator
      players
      number_of_players
    }
  }
`;

const ACTIVE_SUBSCRIPTION = `
  subscription ActiveSub {
    active {
      id
      pending
      players { id name }
    }
  }
`;

export default function PendingClient({ initialPending, initialError }) {
  const [pending, setPending] = React.useState(initialPending);
  const [error, setError] = React.useState(initialError);

  // Subscribe to updates using RxJS
  React.useEffect(() => {
    if (!pending?.id) return;
    const gameId = pending.id;

    // Create observables for both subscriptions
    const pending$ = subscribeGraphQL$<{ pending: typeof pending | null }>(
      PENDING_SUBSCRIPTION,
      { id: gameId }
    ).pipe(
      tap((payload) => console.debug("Pending subscription payload:", payload))
    );

    const active$ = subscribeGraphQL$<{ active: { id: string } | null }>(
      ACTIVE_SUBSCRIPTION,
      {}
    ).pipe(
      tap((payload) => console.debug("Active subscription payload:", payload))
    );

    // Merge both streams and handle updates
    const subscription = merge(pending$, active$).subscribe({
      next: (payload) => {
        // Handle pending game updates
        if (payload && "pending" in payload) {
          const pg = payload.pending;
          if (!pg) {
            // lobby gone → redirect to the active game page
            window.location.assign(`/game/${gameId}`);
            return;
          }
          setPending(pg);
        }
        
        // Handle active game updates (game started)
        if (payload && "active" in payload) {
          const active = payload.active;
          if (active && active.id === gameId) {
            window.location.assign(`/game/${gameId}`);
          }
        }
      },
      error: (err) => {
        console.warn("Subscription error:", err);
      },
    });

    return () => subscription.unsubscribe();
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
