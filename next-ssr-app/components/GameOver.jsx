"use client";

import React from "react";

/**
 * Game over display with winner info
 */
export default function GameOver({ winner }) {
  return (
    <section
      style={{
        padding: 24,
        backgroundColor: "#e8f5e9",
        borderRadius: 12,
        textAlign: "center",
        marginTop: 16,
      }}
    >
      <h2 style={{ marginTop: 0 }}>🎉 Game Over!</h2>
      <p style={{ fontSize: 18 }}>
        Winner: <strong>{winner?.name ?? "—"}</strong>
      </p>
      {winner?.score && (
        <p style={{ color: "#666" }}>Final score: {winner.score} pts</p>
      )}
      <a
        href="/"
        style={{
          display: "inline-block",
          marginTop: 16,
          padding: "12px 24px",
          backgroundColor: "#2196f3",
          color: "white",
          textDecoration: "none",
          borderRadius: 8,
        }}
      >
        Back to Lobby
      </a>
    </section>
  );
}
