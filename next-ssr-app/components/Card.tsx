/// <reference types="react" />
import React from "react";
// lightweight local UnoCard type to avoid cross-package type resolution errors
type UnoCard = {
  type: string;
  color?: string;
  value?: number;
};
import '../styles/Card.css'

type CardProps = {
  card?: UnoCard; // optional for face-down placeholder
  faceDown?: boolean;
  className?: string;
  onClick?: () => void;
};

export const Card: React.FC<CardProps> = ({ card, faceDown = false, className, onClick }) => {
  const getCardImage = (): string => {
    // Return the image filename only; actual path will be probed at runtime.
    if (faceDown) return `uno_card-back.png`;
    if (!card) return `uno_card-back.png`;

    // Map type and color to file name
    if (card.type === "WILD") return `uno_card-wildchange.png`;
    if (card.type === "WILD DRAW") return `uno_card-wilddraw4.png`;

    const color = (card.color || "").toLowerCase();
    if (!color) return `uno_card-back.png`;

    if (card.type === "NUMBERED") return `uno_card-${color}${card.value}.png`;
    if (card.type === "DRAW") return `uno_card-${color}draw2.png`;
    if (card.type === "SKIP") return `uno_card-${color}skip.png`;
    if (card.type === "REVERSE") return `uno_card-${color}reverse.png`;
    return `uno_card-back.png`;
  };

  const isClickable = typeof onClick === 'function';
  // Maintain src in state so we can swap to a working URL or inline placeholder.
  const [src, setSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const filename = getCardImage();

    // candidate prefixes to try (covers common dev layouts)
    const prefixes = [
      "/assets/Cards/",
      "/Cards/",
      "/static/Cards/",
      "/public/assets/Cards/",
      "/public/Cards/",
      // also try absolute path relative to site root
      "/assets/Cards/",
    ];

    const tryNext = (idx: number) => {
      if (cancelled) return;
      if (idx >= prefixes.length) {
        // no remote image found — fallback to inline placeholder
        setSrc(`data:image/svg+xml;utf8,${placeholderSvg}`);
        return;
      }
      const url = prefixes[idx] + filename;
      const img = new Image();
      img.onload = () => { if (!cancelled) setSrc(url); };
      img.onerror = () => { console.debug("Card image not found at", url); tryNext(idx + 1); };
      img.src = url;
    };

    tryNext(0);

    return () => { cancelled = true; };
  }, [card?.type, card?.color, card?.value, faceDown]);

  const placeholderSvg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='240'><rect width='100%' height='100%' fill='#ddd' rx='12' ry='12'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#666' font-family='Arial' font-size='18'>Card</text></svg>`);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isClickable) return;
    if (e.key === "Enter" || e.key === " ") {
      onClick && onClick();
    }
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.warn("Card image failed to load, falling back to inline placeholder:", src);
    setSrc(`data:image/svg+xml;utf8,${placeholderSvg}`);
    try { (e.target as HTMLImageElement).onerror = null; } catch (_) {}
  };

  const usingPlaceholder = !src || src.startsWith("data:image/svg+xml");

  return (
    <div
      className={`uno-card ${isClickable ? "clickable" : ""} ${className || ""}`}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
    >
      {usingPlaceholder ? (
        // Render a CSS-based card face so dev doesn't depend on image files
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: 8,
          background: faceDown ? '#ddd' : (card?.color ? ({ red: '#ff6b6b', blue: '#6ba6ff', green: '#6bff9a', yellow: '#fff36b'} as any)[(card.color || '').toLowerCase()] || '#eee' : '#eee'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#333',
          fontWeight: 700,
        }}>
          {!faceDown && card ? (
            <div style={{ textAlign: 'center' }}>{card.type === 'NUMBERED' ? card.value : card.type}</div>
          ) : (
            <div style={{ textAlign: 'center', color: '#666', fontWeight: 400 }}>Card</div>
          )}
        </div>
      ) : (
        <img
          src={src!}
          alt={faceDown ? "face-down card" : `${card?.color ?? ""} ${card?.type ?? ""}`}
          onError={handleImgError}
        />
      )}
    </div>
  );
};

export default Card;
