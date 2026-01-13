
export type Color = "RED" | "BLUE" | "GREEN" | "YELLOW";


export type NumberedCard = Readonly<{
  type: "NUMBERED";
  color: Color;
  value: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}>;

export type SkipCard = Readonly<{
  type: "SKIP";
  color: Color;
  value: 20;
}>;

export type ReverseCard = Readonly<{
  type: "REVERSE";
  color: Color;
  value: 20;
}>;

export type DrawTwoCard = Readonly<{
  type: "DRAW";
  color: Color;
  value: 20;
}>;

export type WildCard = Readonly<{ 
  type: "WILD"; 
  color?: Color; 
  value: 50;
}>;

export type WildDrawCard = Readonly<{ 
  type: "WILD DRAW"; 
  color?: Color; 
  value: 50;
}>;

export type Card = NumberedCard | SkipCard | ReverseCard | DrawTwoCard | WildCard | WildDrawCard;

export type CardType = Card["type"];

export type TypedCard<T extends CardType> = Extract<Card, { type: T }>;
