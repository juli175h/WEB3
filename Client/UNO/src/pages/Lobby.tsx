import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchPendingGames,
  createPendingGame,
  joinPendingGame,
} from '../store/pendingGamesSlice';
import { games as fetchActiveGames, onActive } from '../services/api';
import type { IndexedUno, PendingUno } from '../services/game';
//import './Lobby.css';

const Lobby: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Get player name from Redux
  const playerNameFromStore = useAppSelector((state) => state.player.player);
  const [playerName, setPlayerName] = useState(playerNameFromStore || '');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [activeGames, setActiveGames] = useState<IndexedUno[]>([]);

  const pendingState = useAppSelector((state) => state.pendingGames);

  // Load pending + active games on mount
  useEffect(() => {
    // Fetch pending games from Redux slice
    dispatch(fetchPendingGames());

    // Fetch active games from API
    const loadActive = async () => {
      try {
        const loaded = await fetchActiveGames();
        setActiveGames(loaded.filter((g) => !g.finished));
      } catch (err) {
        console.error('Failed to load active games:', err);
      }
    };
    loadActive();

    // Subscribe to server updates for active games
    onActive(async () => {
      try {
        const refreshed = await fetchActiveGames();
        setActiveGames(refreshed.filter((g) => !g.finished));
      } catch (err) {
        console.error('Failed to refresh active games:', err);
      }
    });

    // No cleanup needed if onActive does not return an unsubscribe
  }, [dispatch]);

  // Utility to display players
  const playerNames = (game: PendingUno | IndexedUno) =>
    (game.players || [])
      .map((p) => (typeof p === 'string' ? p : p?.name ?? ''))
      .join(', ');

  // Create a new pending game
  const handleCreateGame = async () => {
    if (!playerName.trim()) return alert('Enter your name!');
    try {
      const game = await dispatch(
        createPendingGame({ name: playerName, maxPlayers })
      ).unwrap();
      navigate(`/pending/${game.id}`);
    } catch (err) {
      console.error('Failed to create game:', err);
      alert('Could not create game.');
    }
  };

  // Join an existing pending game
  const handleJoinGame = async (id: string) => {
    if (!playerName.trim()) return alert('Enter your name!');
    try {
      const joined = await dispatch(joinPendingGame({ id, name: playerName })).unwrap();
      navigate(joined.pending ? `/pending/${joined.id}` : `/game/${joined.id}`);
    } catch (err) {
      console.error('Failed to join game:', err);
      alert('Could not join game.');
    }
  };

  // Join an active game
  const handleJoinActiveGame = (id: string) => {
    if (!playerName.trim()) return alert('Enter your name first');
    navigate(`/game/${id}`);
  };

  return (
    <div className="lobby">
      <h2>UNO Lobby</h2>

      {/* Setup */}
      <section className="setup">
        <div>
          <label>Your Name:</label>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>

        <div>
          <label>Number of Players (2–4):</label>
          <select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
            {[2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <button onClick={handleCreateGame}>Create New Game</button>
      </section>

      {/* Active Games */}
      <section className="games">
        <h3>Active Games</h3>
        {activeGames.length ? (
          <ul>
            {activeGames.map((g) => (
              <li key={g.id}>
                Game #{g.id} — Players: {playerNames(g)}
            <button onClick={() => handleJoinActiveGame(g.id)}>Join</button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No active games.</p>
        )}
      </section>

      {/* Pending Games */}
      <section className="games">
        <h3>Pending Games</h3>
        {pendingState.loading && <p>Loading...</p>}
        {pendingState.error && <p>⚠️ Server error.</p>}
        {!pendingState.loading && !pendingState.error && pendingState.pendingGames.length > 0 && (
          <ul>
            {pendingState.pendingGames.map((g) => (
              <li key={g.id}>
                Game #{g.id} ({g.players?.length || 0}/{g.number_of_players} players)
                <button onClick={() => handleJoinGame(g.id)}>Join</button>
              </li>
            ))}
          </ul>
        )}
        {!pendingState.loading &&
          !pendingState.error &&
          pendingState.pendingGames.length === 0 && <p>No pending games.</p>}
      </section>
    </div>
  );
};

export default Lobby;
