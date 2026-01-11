"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { queryGraphQL, execGraphQL, subscribeGraphQL } from "../../../lib/graphql";
import { getCookie, PLAYER_COOKIE } from "../../../lib/cookies";
import {
  ColorPickerModal,
  DrawnCardModal,
  PlayerList,
  GameTable,
  PlayerHand,
  GameActions,
  GameOver,
} from "../../../components";

export default function GameClient({ initialGame }) {
  const params = useParams();
  const id = params.id;

  // Read the player name from cookie (set during join/create)
  const [user, setUser] = React.useState(() => {
    try {
      if (typeof window !== "undefined") return getCookie(PLAYER_COOKIE);
    } catch (e) {}
    return null;
  });

  React.useEffect(() => {
    if (!user) {
      try {
        const u = typeof window !== "undefined" ? getCookie(PLAYER_COOKIE) : null;
        if (u) setUser(u);
      } catch (e) {}
    }
  }, [user]);

  const [game, setGame] = React.useState(initialGame);
  const [hand, setHand] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  // Color picker modal state
  const [colorPickerOpen, setColorPickerOpen] = React.useState(false);
  const [pendingCardIndex, setPendingCardIndex] = React.useState(null);
  // Drawn card modal state
  const [drawnCardModal, setDrawnCardModal] = React.useState({ open: false, card: null, cardIndex: null });

  // Compute current player and turn status (derived from game state)
  const players = game.players || [];
  const round = game.currentRound || {};
  const currentPlayer = players[round.currentPlayerIndex ?? 0];
  const isYourTurn = user && currentPlayer?.name === user;
  const discardTop = round.discardTop;

  // Check if a card can be played on the current discard top
  const canPlay = (card) => {
    if (!discardTop) return true;
    // If discard top is a wild with no color set, anything can be played
    if ((discardTop.type === "WILD" || discardTop.type === "WILD DRAW" ||
         discardTop.type === "WildCard" || discardTop.type === "WildDrawCard") && !discardTop.color) return true;
    // Wild cards can always be played
    if (card.type === "WILD" || card.type === "WILD DRAW" ||
        card.type === "WildCard" || card.type === "WildDrawCard") return true;
    // Same type check
    if (card.type === discardTop.type) {
      if ((card.type === "NUMBERED" || card.type === "NumberedCard") && 
          (discardTop.type === "NUMBERED" || discardTop.type === "NumberedCard")) {
        return card.color === discardTop.color || card.value === discardTop.value;
      }
      return true;
    }
    // Same color check
    if (card.color && discardTop.color && 
        card.color.toUpperCase() === discardTop.color.toUpperCase()) return true;
    return false;
  };

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
      // Refetch hand to get the new card
      const handData = await queryGraphQL(
        `query Hand($id: ID!, $player: String!) {
          hand(id: $id, player: $player) {
            __typename
            ... on NumberedCard { type color value }
            ... on ReverseCard { type color value }
            ... on SkipCard { type color value }
            ... on DrawTwoCard { type color value }
            ... on WildCard { type color value }
            ... on WildDrawCard { type color value }
          }
        }`,
        { id, player: user }
      );
      const newHand = handData.hand || [];
      setHand(newHand);
      // The drawn card is the last card in the hand
      const drawnCard = newHand[newHand.length - 1];
      const drawnCardIndex = newHand.length - 1;
      // Show the drawn card modal
      setDrawnCardModal({ open: true, card: drawnCard, cardIndex: drawnCardIndex });
      // Also refresh game state
      await fetchGame();
    } catch (e) {
      alert(e.message || "Could not draw card.");
    }
  };

  const onPlay = async (cardIndex, chosenColor = null) => {
    if (!isYourTurn) return;
    const card = hand[cardIndex];
    
    // Check if card can be played
    if (!canPlay(card)) {
      return; // Card is not playable
    }
    
    // For wild cards, show color picker if no color chosen yet
    if ((card.type === "WildCard" || card.type === "WildDrawCard" ||
         card.type === "WILD" || card.type === "WILD DRAW") && !chosenColor) {
      setPendingCardIndex(cardIndex);
      setColorPickerOpen(true);
      return;
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

  const onColorSelect = (color) => {
    setColorPickerOpen(false);
    if (pendingCardIndex !== null) {
      onPlay(pendingCardIndex, color);
      setPendingCardIndex(null);
    }
  };

  // Handle playing the drawn card
  const onPlayDrawnCard = () => {
    const { card, cardIndex } = drawnCardModal;
    setDrawnCardModal({ open: false, card: null, cardIndex: null });
    if (card && cardIndex !== null) {
      onPlay(cardIndex);
    }
  };

  // Handle skipping turn after drawing
  const onSkipAfterDraw = async () => {
    setDrawnCardModal({ open: false, card: null, cardIndex: null });
    try {
      await execGraphQL(
        `mutation Skip($id: ID!, $player: String!) { skip(id: $id, player: $player) { id } }`,
        { id, player: user }
      );
      await Promise.all([fetchHand(user), fetchGame()]);
    } catch (e) {
      alert(e.message || "Could not skip turn.");
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
      {/* Color Picker Modal */}
      <ColorPickerModal
        open={colorPickerOpen}
        onSelect={onColorSelect}
        onCancel={() => { setColorPickerOpen(false); setPendingCardIndex(null); }}
      />

      {/* Drawn Card Modal */}
      <DrawnCardModal
        open={drawnCardModal.open}
        card={drawnCardModal.card}
        canPlay={drawnCardModal.card ? canPlay(drawnCardModal.card) : false}
        onPlay={onPlayDrawnCard}
        onSkip={onSkipAfterDraw}
        onClose={() => setDrawnCardModal({ open: false, card: null, cardIndex: null })}
      />

      <h2>UNO Match #{game.id}</h2>
      <p style={{ marginBottom: 16 }}>Playing as: <strong>{user}</strong></p>

      <PlayerList
        players={players}
        currentPlayerId={currentPlayer?.id}
        currentUser={user}
      />

      <GameTable
        discardTop={round.discardTop}
        drawPileCount={round.drawPileCount}
        direction={round.direction}
      />

      <PlayerHand
        hand={hand}
        isYourTurn={isYourTurn}
        canPlay={canPlay}
        onPlayCard={onPlay}
      />

      <GameActions
        isYourTurn={isYourTurn}
        onDraw={onDraw}
      />

      {game.finished && <GameOver winner={game.winner} />}
    </>
  );
}
