import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchPendingGames, selectGameById, subscribeToUpdates } from '../store/pendingGamesSlice';
//import ./PendingGame.css';

const PendingGame: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const gameId = id ?? '';

  const player = useAppSelector((state) => state.player.player);
  const pendingState = useAppSelector((state) => state.pendingGames);
  const game = useAppSelector((state) => selectGameById(state, gameId));

  useEffect(() => {
    // Guard: if no player name is set, redirect to lobby
    if (!player) {
      navigate('/');
      return;
    }

    // Load all pending games
    dispatch(fetchPendingGames());

    // Subscribe to pending game updates (redirect if game starts)
    const unsub = subscribeToUpdates((startedGameId: string) => {
      if (startedGameId === gameId) {
        console.log(`🎉 Game ${startedGameId} started — redirecting...`);
        navigate(`/game/${startedGameId}`);
      }
    });

    // Cleanup subscription on unmount
    return () => unsub();
  }, [dispatch, gameId, navigate, player]);

  const playersJoined = game?.players?.length ?? 0;
  const totalPlayers = game?.number_of_players ?? 0;

  return (
    <div className="pending-page">
      <h2>Pending Game #{gameId}</h2>

      {pendingState.loading && <div>Loading game...</div>}

      {!pendingState.loading && pendingState.error && (
        <div className="error">Failed to load game.</div>
      )}

      {!pendingState.loading && !pendingState.error && !game && <div>Game not found.</div>}

      {!pendingState.loading && !pendingState.error && game && (
        <>
          <p>
            Players joined: {playersJoined}/{totalPlayers || '?'}
          </p>

          {playersJoined > 0 && (
            <ul>
              {game.players.map((p, idx) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
          )}

          {playersJoined < totalPlayers ? (
            <p>Waiting for remaining players to join...</p>
          ) : (
            <p>All players have joined! Game starting...</p>
          )}
        </>
      )}
    </div>
  );
};

export default PendingGame;
