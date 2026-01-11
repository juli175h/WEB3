"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { queryGraphQL } from "../../../lib/graphql";

// A placeholder for the Card component, which we will create later.
const Card = ({ card, onClick, className }) => (
  <div
    onClick={onClick}
    className={className}
    style={{
      border: "1px solid black",
      padding: "10px",
      margin: "5px",
      cursor: onClick ? "pointer" : "default",
    }}
  >
    <pre>{JSON.stringify(card, null, 2)}</pre>
  </div>
);

export default function GamePage({ params }) {
  const { id } = params;

  // Assume a player name is stored, for now, we'll hardcode it.
  // This should be replaced with a proper auth/session solution.
  const user = "player1";

  const [game, setGame] = React.useState(null);
  const [hand, setHand] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // Fetch initial game state and hand
  React.useEffect(() => {
    if (!id) return;

    const loadGame = async () => {
      try {
        setLoading(true);
        const gameData = await queryGraphQL(
          `
            query Game($id: ID!) {
              game(id: $id) {
                id
                finished
                winner { name score }
                players { id name score handCount }
                currentRound {
                  currentPlayerIndex
                  direction
                  drawPileCount
                  discardTop {
                    __typename
                    ... on NumberedCard { type color value }
                    ... on ReverseCard { type color value }
                    ... on SkipCard { type color value }
                    ... on DrawTwoCard { type color value }
                    ... on WildCard { type color value }
                    ... on WildDrawCard { type color value }
                  }
                }
              }
            }
          `,
          { id }
        );
        setGame(gameData.game);

        // TODO: Add a 'hand' query to your GraphQL schema and server
        // For now, we'll leave the hand empty.
        // const handData = await queryGraphQL( ... get hand query ... );
        // setHand(handData.hand);
      } catch (e) {
        setError(e.message || "Failed to load game.");
      } finally {
        setLoading(false);
      }
    };

    loadGame();

    // TODO: Set up GraphQL subscriptions to get real-time game updates.
  }, [id]);

  const onDraw = async () => {
    if (!isYourTurn) return;
    alert("TODO: Implement draw card mutation");
    // const updatedGame = await execGraphQL( ... draw mutation ... );
    // setGame(updatedGame);
    // ... update hand ...
  };

  const onPlay = async (cardIndex) => {
    if (!isYourTurn) return;
    const card = hand[cardIndex];
    alert(
      `TODO: Implement play card mutation for card: ${JSON.stringify(card)}`
    );
    // const updatedGame = await execGraphQL( ... play card mutation ... );
    // setGame(updatedGame);
    // ... update hand ...
  };

  if (loading) return <div>Loading game...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!game) return <div>Game not found.</div>;

  const players = game.players || [];
  const round = game.currentRound || {};
  const currentPlayer = players[round.currentPlayerIndex ?? 0];
  const isYourTurn = user && currentPlayer?.name === user;

  return (
    <>
      <h2>UNO Match #{game.id}</h2>

      <section>
        <h3>Players</h3>
        <ul>
          {players.map((p) => (
            <li
              key={p.id}
              style={{
                fontWeight: p.id === currentPlayer?.id ? "bold" : "normal",
              }}
            >
              <span>{p.name}</span>{" "}
              <small>
                (cards: {p.handCount} · score: {p.score}
                {p.id === currentPlayer?.id ? " · current turn" : ""})
              </small>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Table</h3>
        <p>Draw pile: {round.drawPileCount ?? 0}</p>
        <p>Direction: {round.direction === -1 ? "⟲ CCW" : "⟳ CW"}</p>
        <div>
          <strong>Discard Top:</strong>
          {round.discardTop ? (
            <Card card={round.discardTop} />
          ) : (
            <p>None</p>
          )}
        </div>
      </section>

      <section>
        <h3>Your Hand</h3>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {hand.length > 0 ? (
            hand.map((card, index) => (
              <Card
                key={index}
                card={card}
                onClick={() => onPlay(index)}
                className={isYourTurn ? "clickable" : "disabled"}
              />
            ))
          ) : (
            <p>You have no cards.</p>
          )}
        </div>
      </section>

      <section>
        <h3>Actions</h3>
        <button onClick={onDraw} disabled={!isYourTurn}>
          Draw Card
        </button>
        {!isYourTurn && <p>Waiting for your turn...</p>}
      </section>

      {game.finished && (
        <section>
          <h3>Game Over</h3>
          <p>Winner: {game.winner?.name ?? "—"}</p>
        </section>
      )}
    </>
  );
}
