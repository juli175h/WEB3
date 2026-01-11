"use client";

import React from "react";
import Card from "./Card";

/**
 * Displays the player's hand of cards
 */
export default function PlayerHand({ hand, isYourTurn, canPlay, onPlayCard }) {
  return (
    <section>
      <h3>Your Hand</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {hand.length > 0 ? (
          hand.map((card, index) => {
            const playable = isYourTurn && canPlay(card);
            return (
              <Card
                key={index}
                card={card}
                onClick={playable ? () => onPlayCard(index) : undefined}
                className={playable ? "clickable" : "disabled"}
              />
            );
          })
        ) : (
          <p style={{ color: "#666", fontStyle: "italic" }}>You have no cards.</p>
        )}
      </div>
    </section>
  );
}
