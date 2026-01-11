"use client";

import React from "react";
import Modal from "./Modal";
import Card from "./Card";

/**
 * Modal shown after drawing a card, with options to play or skip
 */
export default function DrawnCardModal({ open, card, canPlay, onPlay, onSkip, onClose }) {
  if (!card) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <h3 style={{ marginTop: 0 }}>You drew a card!</h3>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <Card card={card} />
      </div>
      {canPlay ? (
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={onPlay}
            style={{
              padding: "12px 24px",
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            Play Card
          </button>
          <button
            onClick={onSkip}
            style={{
              padding: "12px 24px",
              backgroundColor: "#9e9e9e",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            Keep & Skip
          </button>
        </div>
      ) : (
        <div>
          <p style={{ color: "#666", marginBottom: 12 }}>
            This card cannot be played right now.
          </p>
          <button
            onClick={onSkip}
            style={{
              padding: "12px 24px",
              backgroundColor: "#2196f3",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            End Turn
          </button>
        </div>
      )}
    </Modal>
  );
}
