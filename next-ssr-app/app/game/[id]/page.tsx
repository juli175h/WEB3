"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { queryGraphQL } from "../../../lib/graphql";
import GameClient from "./GameClient";

export default function GamePage({ params }) {
  const { id } = params;
  const [game, setGame] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // Fetch initial game state only once
  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadGame = async () => {
      try {
        const gameData = await queryGraphQL(
          `
            query Game($id: ID!) {
              game(id: $id) {
                id
                pending
                finished
                winner { id name score }
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
        if (!cancelled) {
          setGame(gameData.game);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Failed to load game.");
          setLoading(false);
        }
      }
    };

    loadGame();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div>Loading game...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!game) return <div>Game not found.</div>;

  // Pass initialGame to GameClient - it will NOT refetch on mount
  return <GameClient initialGame={game} />;
}
