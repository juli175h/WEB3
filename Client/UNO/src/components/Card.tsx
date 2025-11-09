import React from "react";
import type { Card as UnoCard } from "Domain/src/model/UnoCard";
import '../styles/Card.css'

type CardProps = {
  card: UnoCard;
  clickable?: boolean;
  className?: string;   
  onClick?: () => void;
};

export const Card: React.FC<CardProps> = ({ card, clickable, className, onClick }) => {
  const getCardImage = (): string => {
    // Map type and color to file name
    if (card.type === "WILD") return `/assets/Cards/uno_card-wildchange.png`;
    if (card.type === "WILD DRAW") return `/assets/Cards/uno_card-wilddraw4.png`;

    const color = card.color?.toLowerCase();
    if (!color) return "";

    if (card.type === "NUMBERED") return `/assets/Cards/uno_card-${color}${card.value}.png`;
    if (card.type === "DRAW") return `/assets/Cards/uno_card-${color}draw2.png`;
    if (card.type === "SKIP") return `/assets/Cards/uno_card-${color}skip.png`;
    if (card.type === "REVERSE") return `/assets/Cards/uno_card-${color}reverse.png`;
    return "";
  };

  return (
   <div
      className={`uno-card ${clickable ? "clickable" : ""} ${className || ""}`}
      onClick={clickable ? onClick : undefined}
    >
      <img src={getCardImage()} alt={`${card.color} ${card.type}`} />
    </div>
  );
};
