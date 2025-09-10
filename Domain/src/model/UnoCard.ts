
type Color = "RED" | "BLUE" | "GREEN" | "YELLOW";


type NumberedCard = {
  type: "NUMBERED";
  color: Color;
  value: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
};

type SkipCard = {
  type: "SKIP";
  color: Color;
};

type ReverseCard = {
  type: "REVERSE";
  color: Color;
};

type DrawTwoCard = {
  type: "DRAW";
  color: Color;
};

type WildCard = {
  type: "WILD";
};

type WildDrawCard = {
  type: "WILD DRAW";
};

type Card =
  | NumberedCard
  | SkipCard
  | ReverseCard
  | DrawTwoCard
  | WildCard
  | WildDrawCard;

type CardType = Card["type"];

type TypedCard<T extends CardType> = Extract<Card, { type: T }>;
