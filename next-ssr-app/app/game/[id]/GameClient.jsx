"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { queryGraphQL, execGraphQL } from "../../../lib/graphql";

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

export default function GameClient({ initialGame }) {
  const params = useParams();
  const id = params.id;

  // Assume a player name is stored, for now, we'll hardcode it.
  // This should be replaced with a proper auth/session solution.
  const user = "player1";

  const [game, setGame] = React.useState(initialGame);
  const [hand, setHand] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  // Fetch hand and set up subscriptions
  React.useEffect(() => {
    if (!id || !user) return;

    const fetchHand = async () => {
      try {
        const handData = await queryGraphQL(
          `
          query Hand($id: ID!, $player: String!) {
            hand(id: $id, player: $player) {
              __typename
              ... on NumberedCard { type color value }
              ... on ReverseCard { type color value }
              ... on SkipCard { type color value }
              ... on DrawTwoCard { type color value }
              ... on WildCard { type color value }
              ... on WildDrawCard { type color value }
            }
          }
        `,
          { id, player: user }
        );
        setHand(handData.hand || []);
      } catch (e) {
        console.error("Failed to fetch hand:", e);
        setError("Could not load your hand.");
      }
    };

    fetchHand();

    // TODO: Set up GraphQL subscriptions to get real-time game updates.
    // The subscription would update the `game` state.
  }, [id, user]);

  const onDraw = async () => {
    if (!isYourTurn) return;
    try {
      const res = await execGraphQL(
        `mutation Draw($id: ID!, $player: String!) { draw(id: $id, player: $player) { id } }`,
        { id, player: user }
      );
      // Game state will be updated via subscription, but for now we can just alert.
      alert("Card drawn! (Game state will update via subscription)");
    } catch (e) {
      alert(e.message || "Could not draw card.");
    }
  };

  const onPlay = async (cardIndex) => {
    if (!isYourTurn) return;
    const card = hand[cardIndex];
    let chosenColor;
    if (card.type === "WildCard" || card.type === "WildDrawCard") {
      chosenColor = prompt("Choose a color (Red, Green, Blue, Yellow):");
      if (!["Red", "Green", "Blue", "Yellow"].includes(chosenColor)) {
        return alert("Invalid color.");
      }
    }

    try {
      await execGraphQL(
        `mutation Play($id: ID!, $player: String!, $handIndex: Int!, $chosenColor: Color) {
          play(id: $id, player: $player, handIndex: $handIndex, chosenColor: $chosenColor) { id }
        }`,
        { id, player: user, handIndex, chosenColor }
      );
      // Game state will be updated via subscription
      alert("Card played! (Game state will update via subscription)");
    } catch (e) {
      alert(e.message || "Could not play card.");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

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
          {round.discardTop ? <Card card={round.discardTop} /> : <p>None</p>}
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
