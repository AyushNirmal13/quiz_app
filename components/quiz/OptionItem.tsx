"use client";

import { useState } from "react";

interface OptionItemProps {
  optionIndex: number;
  optionText: string;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (optionIndex: number) => void;
}

export function OptionItem({
  optionIndex,
  optionText,
  isSelected,
  isDisabled,
  onSelect,
}: OptionItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const bg = isSelected
    ? "var(--color-ink)"
    : isHovered && !isDisabled
      ? "var(--color-panel-strong)"
      : "var(--color-paper)";

  const fg = isSelected ? "var(--color-paper)" : "var(--color-ink)";

  return (
    <li>
      <button
        type="button"
        disabled={isDisabled}
        aria-pressed={isSelected}
        onClick={() => onSelect(optionIndex)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto 1fr",
          gap: "0.85rem",
          alignItems: "flex-start",
          padding: "1rem",
          border: `1px solid var(--color-ink)`,
          background: bg,
          color: fg,
          cursor: isDisabled ? "default" : "pointer",
          width: "100%",
          textAlign: "left",
          transition: "background 0.12s, color 0.12s",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-label), monospace",
            fontSize: "0.8rem",
            textTransform: "uppercase",
            color: fg,
          }}
        >
          {String.fromCharCode(65 + optionIndex)}
        </span>
        <span
          style={{
            fontFamily: "var(--font-label), monospace",
            fontSize: "0.7rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: fg,
          }}
        >
          {isSelected ? "Selected" : "Option"}
        </span>
        <span style={{ margin: 0, color: fg, lineHeight: 1.6 }}>{optionText}</span>
      </button>
    </li>
  );
}
