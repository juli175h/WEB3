import * as React from "react";
import { queryGraphQL } from "../lib/graphql";
import LobbyClient from "./LobbyClient";

export const dynamic = "force-dynamic";

async function getLobbyData() {
  try {
    const data = await queryGraphQL(`
      query LobbyData {
        games { id finished players { name } }
        pending_games { id pending number_of_players players }
      }
    `);
    const active = (data?.games || []).filter((g) => !g.finished);
    const pending = data?.pending_games || [];
    return { active, pending, error: null };
  } catch (e) {
    return {
      active: [],
      pending: [],
      error: e?.message || "Failed to load lobby",
    };
  }
}

export default async function Page() {
  const { active, pending, error } = await getLobbyData();

  return (
    <main style={{ padding: 16 }}>
      <h1>UNO Lobby</h1>
      <LobbyClient initialActive={active} initialPending={pending} initialError={error} />
    </main>
  );
}
