import * as React from "react";
import { queryGraphQL } from "../../../lib/graphql";
import PendingClient from "./PendingClient";

export const dynamic = "force-dynamic";

async function getPendingData(id) {
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
      { id }
    );
    return { pending: data?.pending_game ?? null, error: null };
  } catch (e) {
    return { pending: null, error: e?.message || "Failed to load pending game" };
  }
}

export default async function Page({ params }) {
  const { id } = params;
  const { pending, error } = await getPendingData(id);
  return (
    <main style={{ padding: 16 }}>
      <h1>Pending Game #{id}</h1>
      <PendingClient initialPending={pending} initialError={error} />
    </main>
  );
}
