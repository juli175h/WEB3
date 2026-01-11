"use client";

import React from "react";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

/**
 * Reusable modal overlay component
 */
export default function Modal({ open, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          padding: 24,
          borderRadius: 12,
          textAlign: "center",
          minWidth: 280,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
