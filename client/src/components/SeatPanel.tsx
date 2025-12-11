import React from "react";

type Props = {
  position: "bottom" | "top" | "left" | "right";
  avatar?: string;
  nickname?: string;
  highlight?: boolean;
};

export default function SeatPanel({ position, avatar, nickname, highlight }: Props) {
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 6,
    borderRadius: 8,
    background: highlight ? "rgba(255,255,180,0.95)" : "rgba(255,255,255,0.85)",
    boxShadow: highlight ? "0 0 12px 4px rgba(255,215,0,0.8)" : "0 2px 6px rgba(0,0,0,0.3)",
    border: highlight ? "2px solid #e0c200" : "1px solid #999",
  };
  const posStyle: React.CSSProperties =
    position === "bottom"
      ? { bottom: 130, left: "50%", transform: "translateX(-50%)" }
      : position === "top"
      ? { top: 130, left: "50%", transform: "translateX(-50%)" }
      : position === "left"
      ? { left: 130, top: "50%", transform: "translateY(-50%)" }
      : { right: 130, top: "50%", transform: "translateY(-50%)" };

  return (
    <div style={{ ...baseStyle, ...posStyle }}>
      <img
        src={avatar || "/assets/avatars/default.png"}
        alt={nickname || "player"}
        style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", border: "1px solid #666" }}
      />
      <div style={{ fontWeight: 600, color: "#222" }}>{nickname || "Player"}</div>
      {highlight && <div style={{ marginLeft: 8, color: "#b58900", fontWeight: 700 }}>Your turn</div>}
    </div>
  );
}
