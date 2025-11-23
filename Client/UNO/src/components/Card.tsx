import React from "react";
import type { Card as UnoCard } from "Domain/src/model/UnoCard";
import '../styles/Card.css'

type CardProps = {
  card: UnoCard;
  className?: string;   
  onClick?: () => void;
};

export const Card: React.FC<CardProps> = ({ card, className, onClick }) => {
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

  const isClickable = typeof onClick === 'function';

  return (
    <div
      className={`uno-card ${isClickable ? 'clickable' : ''} ${className || ''}`}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { onClick && onClick(); } } : undefined}
    >
      <img src={getCardImage()} alt={`${card.color} ${card.type}`} />
    </div>
  );
};
