"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { filter, tap } from "rxjs";
import { subscribeGraphQL$ } from "../../../lib/graphql";
import { getCookie, PLAYER_COOKIE } from "../../../lib/cookies";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { setUser } from "../../../store/userSlice";
import { setGame, fetchHand, fetchGame, drawCard, playCard, skipTurn } from "../../../store/gameSlice";
import { openColorPicker, closeColorPicker, openDrawnCardModal, closeDrawnCardModal } from "../../../store/uiSlice";
import { ACTIVE_SUBSCRIPTION } from "../../../store/queries";
import { Game, UnoCard } from "../../../store/types";
import {
  ColorPickerModal,
  DrawnCardModal,
  PlayerList,
  GameTable,
  PlayerHand,
  GameActions,
  GameOver,
} from "../../../components";

interface GameClientProps {
  initialGame: Game;
}

export default function GameClient({ initialGame }: GameClientProps) {
  const params = useParams();
  const id = params.id as string;
  const dispatch = useAppDispatch();

  // Redux state
  const user = useAppSelector((state) => state.user.name);
  const game = useAppSelector((state) => state.game.game) ?? initialGame;
  const hand = useAppSelector((state) => state.game.hand);
  const loading = useAppSelector((state) => state.game.loading);
  const error = useAppSelector((state) => state.game.error);
  const colorPickerOpen = useAppSelector((state) => state.ui.colorPickerOpen);
  const pendingCardIndex = useAppSelector((state) => state.ui.pendingCardIndex);
  const drawnCardModal = useAppSelector((state) => state.ui.drawnCardModal);

  // Initialize game state from props
  React.useEffect(() => {
    if (initialGame) {
      dispatch(setGame(initialGame));
    }
  }, [initialGame, dispatch]);

  // Read the player name from cookie on mount
  React.useEffect(() => {
    if (!user) {
      try {
        const cookieUser = typeof window !== "undefined" ? getCookie(PLAYER_COOKIE) : null;
        if (cookieUser) dispatch(setUser(cookieUser));
      } catch (e) {}
    }
  }, [user, dispatch]);

  // Compute current player and turn status (derived from game state)
  const players = game?.players || [];
  const round = game?.currentRound || { currentPlayerIndex: 0, direction: 1, discardTop: null, drawPileCount: 0 };
  const currentPlayer = players[round.currentPlayerIndex ?? 0];
  const isYourTurn = user && currentPlayer?.name === user;
  const discardTop = round.discardTop;

  // Check if a card can be played on the current discard top
  const canPlay = (card: UnoCard): boolean => {
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

  // Fetch hand on mount and when user changes
  React.useEffect(() => {
    if (!id || !user) return;
    dispatch(fetchHand({ id, player: user }));
  }, [id, user, dispatch]);

  // Subscribe to game updates using RxJS
  React.useEffect(() => {
    if (!id) return;

    const subscription = subscribeGraphQL$<{ active: Game }>(
      ACTIVE_SUBSCRIPTION,
      {}
    ).pipe(
      tap((payload) => console.debug("Game subscription payload:", payload)),
      filter((payload): payload is { active: Game } => 
        payload?.active != null && payload.active.id === id
      )
    ).subscribe({
      next: (payload) => {
        dispatch(setGame(payload.active));
        // Refetch hand when game updates
        if (user) dispatch(fetchHand({ id, player: user }));
      },
      error: (err) => {
        console.warn("Game subscription error:", err);
      },
    });

    return () => subscription.unsubscribe();
  }, [id, user, dispatch]);

  const onDraw = async () => {
    if (!isYourTurn || !user) return;
    try {
      const result = await dispatch(drawCard({ id, player: user })).unwrap();
      // The drawn card is the last card in the hand
      const drawnCardData = result[result.length - 1];
      const drawnCardIndex = result.length - 1;
      // Show the drawn card modal
      dispatch(openDrawnCardModal({ card: drawnCardData, cardIndex: drawnCardIndex }));
      // Also refresh game state
      dispatch(fetchGame({ id }));
    } catch (e: any) {
      alert(e.message || "Could not draw card.");
    }
  };

  const onPlay = async (cardIndex: number, chosenColor: string | null = null) => {
    if (!isYourTurn || !user) return;
    const card = hand[cardIndex];
    
    // Check if card can be played
    if (!canPlay(card)) {
      return; // Card is not playable
    }
    
    // For wild cards, show color picker if no color chosen yet
    if ((card.type === "WildCard" || card.type === "WildDrawCard" ||
         card.type === "WILD" || card.type === "WILD DRAW") && !chosenColor) {
      dispatch(openColorPicker(cardIndex));
      return;
    }

    try {
      await dispatch(playCard({ id, player: user, handIndex: cardIndex, chosenColor })).unwrap();
    } catch (e: any) {
      alert(e.message || "Could not play card.");
    }
  };

  const onColorSelect = (color: string) => {
    dispatch(closeColorPicker());
    if (pendingCardIndex !== null) {
      onPlay(pendingCardIndex, color);
    }
  };

  // Handle playing the drawn card
  const onPlayDrawnCard = () => {
    const { card, cardIndex } = drawnCardModal;
    dispatch(closeDrawnCardModal());
    if (card && cardIndex !== null) {
      onPlay(cardIndex);
    }
  };

  // Handle skipping turn after drawing
  const onSkipAfterDraw = async () => {
    dispatch(closeDrawnCardModal());
    if (!user) return;
    try {
      await dispatch(skipTurn({ id, player: user })).unwrap();
    } catch (e: any) {
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
        onCancel={() => dispatch(closeColorPicker())}
      />

      {/* Drawn Card Modal */}
      <DrawnCardModal
        open={drawnCardModal.open}
        card={drawnCardModal.card}
        canPlay={drawnCardModal.card ? canPlay(drawnCardModal.card) : false}
        onPlay={onPlayDrawnCard}
        onSkip={onSkipAfterDraw}
        onClose={() => dispatch(closeDrawnCardModal())}
      />

      <h2>UNO Match #{game?.id}</h2>
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

      {game?.finished && <GameOver winner={game.winner} />}
    </>
  );
}
