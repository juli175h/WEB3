"use client";

import React from "react";

/**
 * Displays the list of players with their stats
 */
export default function PlayerList({ players, currentPlayerId, currentUser }) {
  return (
    <section>
      <h3>Players</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {players.map((p) => (
          <li
            key={p.id}
            style={{
              fontWeight: p.id === currentPlayerId ? "bold" : "normal",
              marginBottom: 8,
              padding: "8px 12px",
              backgroundColor: p.id === currentPlayerId ? "#e3f2fd" : "transparent",
              borderRadius: 6,
            }}
          >
            <strong>{p.name}</strong>
            {p.name === currentUser && (
              <span style={{ color: "#666" }}> (you)</span>
            )}
            <span style={{ fontSize: 12, color: "#666", marginLeft: 8 }}>
              {p.handCount} cards · {p.score} pts
              {p.id === currentPlayerId && (
                <strong style={{ color: "#2196f3" }}> · current turn</strong>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
