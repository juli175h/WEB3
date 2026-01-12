"use client";

import * as React from "react";
import { getCookie, setCookie, PLAYER_COOKIE } from "../lib/cookies";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setUser } from "../store/userSlice";
import { setActiveGames, setPendingGames, setError, fetchLobby, createGame, joinGame } from "../store/gameSlice";
import { Game, PendingGame } from "../store/types";
import { subscribeGraphQL$ } from "../lib/graphql";
import { PENDING_GAMES_SUBSCRIPTION } from "../store/queries";

interface LobbyClientProps {
  initialActive: Game[];
  initialPending: PendingGame[];
  initialError?: string;
}

export default function LobbyClient({ initialActive, initialPending, initialError }: LobbyClientProps) {
  const dispatch = useAppDispatch();
  
  // Redux state
  const user = useAppSelector((state) => state.user.name);
  const active = useAppSelector((state) => state.game.activeGames);
  const pending = useAppSelector((state) => state.game.pendingGames);
  const loading = useAppSelector((state) => state.game.loading);
  const error = useAppSelector((state) => state.game.error);

  // Local state for form inputs
  const [playerName, setPlayerName] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return getCookie(PLAYER_COOKIE) || '';
    }
    return '';
  });
  const [maxPlayers, setMaxPlayers] = React.useState(2);

  // Initialize from props
  React.useEffect(() => {
    dispatch(setActiveGames(initialActive || []));
    dispatch(setPendingGames(initialPending || []));
    if (initialError) dispatch(setError(initialError));
  }, [initialActive, initialPending, initialError, dispatch]);

  // Subscribe to pending games updates (RxJS)
  React.useEffect(() => {
    const subscription = subscribeGraphQL$<{ pendingGames: PendingGame[] }>(
      PENDING_GAMES_SUBSCRIPTION
    ).subscribe({
      next: (data) => {
        if (data?.pendingGames) {
          dispatch(setPendingGames(data.pendingGames));
        }
      },
      error: (err) => {
        console.error("Pending games subscription error:", err);
      },
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  // Sync player name with Redux
  React.useEffect(() => {
    if (playerName && playerName !== user) {
      dispatch(setUser(playerName));
    }
  }, [playerName, user, dispatch]);

  const refresh = () => {
    dispatch(fetchLobby());
  };

  const handleCreate = async () => {
    if (!playerName.trim()) return alert("Enter your name");
    try {
      // Save player name to cookie before creating game
      setCookie(PLAYER_COOKIE, playerName.trim());
      const result = await dispatch(createGame({ creator: playerName.trim(), numberOfPlayers: maxPlayers })).unwrap();
      if (!result) throw new Error("No result");
      const to = result.__typename === "PendingGame" ? `/pending/${result.id}` : `/game/${result.id}`;
      window.location.assign(to);
    } catch (e: any) {
      alert(e?.message || "Could not create game");
    }
  };

  const handleJoinPending = async (id: string) => {
    if (!playerName.trim()) return alert("Enter your name");
    try {
      // Save player name to cookie before joining game
      setCookie(PLAYER_COOKIE, playerName.trim());
      const result = await dispatch(joinGame({ id, player: playerName.trim() })).unwrap();
      if (!result) throw new Error("No result");
      const to = result.__typename === "PendingGame" ? `/pending/${result.id}` : `/game/${result.id}`;
      window.location.assign(to);
    } catch (e: any) {
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
