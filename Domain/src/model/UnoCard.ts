
export type Color = "RED" | "BLUE" | "GREEN" | "YELLOW";


export type NumberedCard = {
  type: "NUMBERED";
  color: Color;
  value: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
};

export type SkipCard = {
  type: "SKIP";
  color: Color;
};

export type ReverseCard = {
  type: "REVERSE";
  color: Color;
};

export type DrawTwoCard = {
  type: "DRAW";
  color: Color;
};

export type WildCard = {
  type: "WILD";
};

export type WildDrawCard = {
  type: "WILD DRAW";
};

export type Card =
  | NumberedCard
  | SkipCard
  | ReverseCard
  | DrawTwoCard
  | WildCard
  | WildDrawCard;

export type CardType = Card["type"];

export type TypedCard<T extends CardType> = Extract<Card, { type: T }>;
