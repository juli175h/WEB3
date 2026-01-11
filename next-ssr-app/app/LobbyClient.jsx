"use client";

import * as React from "react";
import { queryGraphQL, execGraphQL } from "../lib/graphql";

// Cookie helper functions
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}

export default function LobbyClient({ initialActive, initialPending, initialError }) {
  // Initialize player name from cookie if available
  const [playerName, setPlayerName] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return getCookie('uno.player') || '';
    }
    return '';
  });
  const [maxPlayers, setMaxPlayers] = React.useState(2);
  const [active, setActive] = React.useState(initialActive);
  const [pending, setPending] = React.useState(initialPending);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(initialError);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await queryGraphQL(`
        query LobbyData {
          games { id finished players { name } }
          pending_games { id pending number_of_players players }
        }
      `);
      setActive((data?.games || []).filter((g) => !g.finished));
      setPending(data?.pending_games || []);
    } catch (e) {
      setError(e?.message || "Failed to refresh");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!playerName.trim()) return alert("Enter your name");
    try {
      // Save player name to cookie before creating game
      setCookie('uno.player', playerName.trim());
      const res = await execGraphQL(
        `
        mutation NewGame($creator: String!, $n: Int!) {
          new_game(creator: $creator, number_of_players: $n) {
            __typename
            ... on PendingGame { id }
            ... on ActiveMatch { id }
          }
        }
      `,
        { creator: playerName.trim(), n: maxPlayers }
      );
      const g = res?.new_game;
      if (!g) throw new Error("No result");
      const to = g.__typename === "PendingGame" ? `/pending/${g.id}` : `/game/${g.id}`;
      window.location.assign(to);
    } catch (e) {
      alert(e?.message || "Could not create game");
    }
  };

  const handleJoinPending = async (id) => {
    if (!playerName.trim()) return alert("Enter your name");
    try {
      // Save player name to cookie before joining game
      setCookie('uno.player', playerName.trim());
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
        { id, player: playerName.trim() }
      );
      const g = res?.join;
      if (!g) throw new Error("No result");
      const to = g.__typename === "PendingGame" ? `/pending/${g.id}` : `/game/${g.id}`;
      window.location.assign(to);
    } catch (e) {
      alert(e?.message || "Could not join game");
    }
  };

  return (
    <>
      <section>
        <h3>Setup</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            placeholder="Your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <label>
            Players:
            <select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
              {[2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button onClick={handleCreate}>Create New Game</button>
          <button onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
      </section>

      <section>
        <h3>Active Games</h3>
        {active.length ? (
          <ul>
            {active.map((g) => (
              <li key={g.id}>
                Game #{g.id} — Players: {(g.players || []).map((p) => p.name).join(", ")}{" "}
                <a href={`/game/${g.id}`}>Open</a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No active games.</p>
        )}
      </section>

      <section>
        <h3>Pending Games</h3>
        {pending.length ? (
          <ul>
            {pending.map((g) => (
              <li key={g.id}>
                Game #{g.id} ({(g.players || []).length}/{g.number_of_players} players){" "}
                <a href={`/pending/${g.id}`}>Open</a> <button onClick={() => handleJoinPending(g.id)}>Join</button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No pending games.</p>
        )}
      </section>
    </>
  );
}
