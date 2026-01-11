"use client";

import React from "react";
import Modal from "./Modal";

const COLORS = [
  { name: "RED", hex: "#f44336" },
  { name: "BLUE", hex: "#2196f3" },
  { name: "GREEN", hex: "#4caf50" },
  { name: "YELLOW", hex: "#ffeb3b" },
];

/**
 * Modal for choosing a color when playing a wild card
 */
export default function ColorPickerModal({ open, onSelect, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel}>
      <h3 style={{ marginTop: 0 }}>Choose a color</h3>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        {COLORS.map((color) => (
          <button
            key={color.name}
            onClick={() => onSelect(color.name)}
            style={{
              width: 60,
              height: 60,
              backgroundColor: color.hex,
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
            aria-label={color.name}
          />
        ))}
      </div>
      <button
        onClick={onCancel}
        style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}
      >
        Cancel
      </button>
    </Modal>
  );
}
