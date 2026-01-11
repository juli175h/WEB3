"use client";

import React from "react";
import Card from "./Card";

/**
 * Displays the game table: discard pile, draw pile count, and direction
 */
export default function GameTable({ discardTop, drawPileCount, direction }) {
  return (
    <section>
      <h3>Table</h3>
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div>
          <strong>Discard Pile:</strong>
          <div style={{ marginTop: 8 }}>
            {discardTop ? <Card card={discardTop} /> : <p>None</p>}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#666" }}>Draw Pile</div>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>{drawPileCount ?? 0}</div>
          <div style={{ fontSize: 12, color: "#666" }}>cards</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#666" }}>Direction</div>
          <div style={{ fontSize: 32 }}>{direction === -1 ? "⟲" : "⟳"}</div>
          <div style={{ fontSize: 12, color: "#666" }}>
            {direction === -1 ? "Counter-clockwise" : "Clockwise"}
          </div>
        </div>
      </div>
    </section>
  );
}
