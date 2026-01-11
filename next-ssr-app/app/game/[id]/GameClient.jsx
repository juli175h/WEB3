"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { queryGraphQL, execGraphQL, subscribeGraphQL } from "../../../lib/graphql";
import Card from "../../../components/Card";

// Cookie helper function
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}

// A placeholder for the Card component, which we will create later.
// Removed the placeholder Card component definition as we are now importing it.

export default function GameClient({ initialGame }) {
  const params = useParams();
  const id = params.id;

  // Read the player name from cookie (set during join/create)
  const [user, setUser] = React.useState(() => {
    try {
      if (typeof window !== "undefined") return getCookie("uno.player");
    } catch (e) {}
    return null;
  });

  React.useEffect(() => {
    if (!user) {
      try {
        const u = typeof window !== "undefined" ? getCookie("uno.player") : null;
        if (u) setUser(u);
      } catch (e) {}
    }
  }, [user]);

  const [game, setGame] = React.useState(initialGame);
  const [hand, setHand] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  // Compute current player and turn status (derived from game state)
  const players = game.players || [];
  const round = game.currentRound || {};
  const currentPlayer = players[round.currentPlayerIndex ?? 0];
  const isYourTurn = user && currentPlayer?.name === user;

  // Fetch hand and set up subscriptions
  const fetchHand = React.useCallback(async (forPlayer) => {
    if (!id || !forPlayer) return;
    try {
      setError(null);
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
        { id, player: forPlayer }
      );
      console.debug("fetchHand result:", handData);
      setHand(handData.hand || []);
    } catch (e) {
      console.error("Failed to fetch hand:", e);
      setHand([]);
      setError(e?.message || String(e) || "Could not load your hand.");
    }
  }, [id]);

  React.useEffect(() => {
    if (!id || !user) return;
    fetchHand(user);
  }, [id, user, fetchHand]);

  // Fetch game state
  const fetchGame = React.useCallback(async () => {
    if (!id) return;
    try {
      const data = await queryGraphQL(
        `query Game($id: ID!) {
          game(id: $id) {
            id
            pending
            finished
            winner { id name score }
            players { id name score handCount }
            currentRound {
              currentPlayerIndex
              direction
              discardTop {
                __typename
                ... on NumberedCard { type color value }
                ... on ReverseCard { type color value }
                ... on SkipCard { type color value }
                ... on DrawTwoCard { type color value }
                ... on WildCard { type color value }
                ... on WildDrawCard { type color value }
              }
              drawPileCount
            }
          }
        }`,
        { id }
      );
      if (data?.game) setGame(data.game);
    } catch (e) {
      console.error("Failed to fetch game:", e);
    }
  }, [id]);

  // Subscribe to game updates
  React.useEffect(() => {
    if (!id) return;
    let unsub = null;
    let cancelled = false;

    (async () => {
      try {
        const sub = await subscribeGraphQL(
          `subscription ActiveSub {
            active {
              id
              pending
              finished
              winner { id name score }
              players { id name score handCount }
              currentRound {
                currentPlayerIndex
                direction
                discardTop {
                  __typename
                  ... on NumberedCard { type color value }
                  ... on ReverseCard { type color value }
                  ... on SkipCard { type color value }
                  ... on DrawTwoCard { type color value }
                  ... on WildCard { type color value }
                  ... on WildDrawCard { type color value }
                }
                drawPileCount
              }
            }
          }`,
          {},
          {
            next: (payload) => {
              if (cancelled) return;
              const active = payload?.active;
              if (active && active.id === id) {
                setGame(active);
                // Refetch hand when game updates
                if (user) fetchHand(user);
              }
            },
            error: (err) => {
              console.warn("Game subscription error:", err);
            },
          }
        );
        unsub = sub?.unsubscribe;
      } catch (err) {
        console.warn("Could not subscribe to game updates:", err);
      }
    })();

    return () => {
      cancelled = true;
      try { unsub?.(); } catch (e) {}
    };
  }, [id, user, fetchHand]);

  const onDraw = async () => {
    if (!isYourTurn) return;
    try {
      await execGraphQL(
        `mutation Draw($id: ID!, $player: String!) { draw(id: $id, player: $player) { id } }`,
        { id, player: user }
      );
      // Refetch hand and game state after drawing
      await Promise.all([fetchHand(user), fetchGame()]);
    } catch (e) {
      alert(e.message || "Could not draw card.");
    }
  };

  const onPlay = async (cardIndex) => {
    if (!isYourTurn) return;
    const card = hand[cardIndex];
    let chosenColor;
    if (card.type === "WildCard" || card.type === "WildDrawCard") {
      const colorInput = prompt("Choose a color (Red, Green, Blue, Yellow):");
      const colorMap = { "Red": "RED", "Green": "GREEN", "Blue": "BLUE", "Yellow": "YELLOW" };
      chosenColor = colorMap[colorInput];
      if (!chosenColor) {
        return alert("Invalid color.");
      }
    }

    try {
      await execGraphQL(
        `mutation PlayCard($id: ID!, $player: String!, $handIndex: Int!, $chosenColor: Color) {
          playCardByIndex(id: $id, player: $player, handIndex: $handIndex, chosenColor: $chosenColor) { id }
        }`,
        { id, player: user, handIndex: cardIndex, chosenColor }
      );
      // Refetch hand and game state after playing
      await Promise.all([fetchHand(user), fetchGame()]);
    } catch (e) {
      alert(e.message || "Could not play card.");
    }
  };

  if (loading) return <div>Loading...</div>;

  if (error) return (
    <div>
      <div style={{ color: 'crimson' }}>Error: {error}</div>
      <p>Please make sure you joined this game from the lobby.</p>
      <a href="/">← Back to Lobby</a>
    </div>
  );

  return (
    <>
      <h2>UNO Match #{game.id}</h2>
      <p style={{ marginBottom: 16 }}>Playing as: <strong>{user}</strong></p>

      <section>
        <h3>Players</h3>
        <ul>
          {players.map((p) => (
            <li
              key={p.id}
              style={{
                fontWeight: p.id === currentPlayer?.id ? "bold" : "normal",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div>
                  <strong>{p.name}</strong>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    (cards: {p.handCount} · score: {p.score}{p.id === currentPlayer?.id ? " · current turn" : ""})
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  {/* If this is the local user, show their actual hand (if available);
                      otherwise show a simple message. For other players always show
                      face-down placeholders so we don't leak card info. */}
                  {p.name === user ? (
                    hand.length > 0 ? (
                      hand.map((c, i) => (
                        <Card key={i} card={c} onClick={isYourTurn ? () => onPlay(i) : undefined} />
                      ))
                    ) : (
                      <div style={{ fontStyle: "italic", color: "#666" }}>You have no cards.</div>
                    )
                  ) : (
                    Array.from({ length: p.handCount }).map((_, i) => (
                      <Card key={i} faceDown />
                    ))
                  )}
                </div>
              </div>
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
