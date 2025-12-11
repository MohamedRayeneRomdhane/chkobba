import React from "react";

type Props = {
  position: "bottom" | "top" | "left" | "right";
  avatar?: string;
  nickname?: string;
  highlight?: boolean;
  isEditable?: boolean;
  onSaveProfile?: (nickname?: string, avatar?: string) => void;
};

export default function SeatPanel({ position, avatar, nickname, highlight, isEditable, onSaveProfile }: Props) {
  const [editing, setEditing] = React.useState(false);
  const [nickInput, setNickInput] = React.useState(nickname || "");
  const [avatarInput, setAvatarInput] = React.useState<string | undefined>(avatar);
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
      ? { bottom: 24, left: "50%", transform: "translateX(-50%)" }
      : position === "top"
      ? { top: 64, left: "50%", transform: "translateX(-50%)" }
      : position === "left"
      ? { left: 64, top: "50%", transform: "translateY(-50%)" }
      : { right: 64, top: "50%", transform: "translateY(-50%)" };

  return (
    <div style={{ ...baseStyle, ...posStyle }}>
      <img
        src={avatar || "/assets/avatars/default.png"}
        alt={nickname || "player"}
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36'><rect width='36' height='36' rx='6' fill='%23ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='12' fill='%23666'>🙂</text></svg>";
        }}
        style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", border: "1px solid #666", background: "#ddd" }}
      />
      <div style={{ fontWeight: 600, color: "#222" }}>{nickname || "Player"}</div>
      {highlight && <div style={{ marginLeft: 8, color: "#b58900", fontWeight: 700 }}>Your turn</div>}
      {isEditable && !editing && (
        <button
          title="Edit profile"
          onClick={() => { setEditing(true); setNickInput(nickname || ""); setAvatarInput(avatar); }}
          className="ml-2 px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
        >
          ✎
        </button>
      )}
      {isEditable && editing && (
        <div className="ml-2 flex items-center gap-2">
          <input
            className="px-2 py-1 rounded border border-gray-400"
            placeholder="Nickname"
            value={nickInput}
            onChange={(e) => setNickInput(e.target.value)}
          />
          <select
            className="px-2 py-1 rounded border border-gray-400"
            value={avatarInput}
            onChange={(e) => setAvatarInput(e.target.value)}
          >
            <option value="">Default</option>
            <option value="/assets/avatars/avatar1.png">avatar1.png</option>
            <option value="/assets/avatars/avatar2.png">avatar2.png</option>
            <option value="/assets/avatars/avatar3.png">avatar3.png</option>
            <option value="/assets/avatars/avatar4.png">avatar4.png</option>
          </select>
          <button
            className="px-2 py-1 rounded bg-green-600 text-white"
            onClick={() => { onSaveProfile?.(nickInput || undefined, avatarInput || undefined); setEditing(false); }}
          >
            Save
          </button>
          <button className="px-2 py-1 rounded bg-gray-500 text-white" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}
