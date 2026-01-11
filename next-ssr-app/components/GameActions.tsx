"use client";

import React from "react";

/**
 * Game action buttons (draw, etc.) and turn indicator
 */
export default function GameActions({ isYourTurn, onDraw }) {
  return (
    <section>
      <h3>Actions</h3>
      <button
        onClick={onDraw}
        disabled={!isYourTurn}
        style={{
          padding: "12px 24px",
          fontSize: 16,
          cursor: isYourTurn ? "pointer" : "not-allowed",
          opacity: isYourTurn ? 1 : 0.6,
        }}
      >
        Draw Card
      </button>
      {!isYourTurn && (
        <p style={{ color: "#666", marginTop: 8 }}>Waiting for your turn...</p>
      )}
    </section>
  );
}
