import React, { useState } from "react";

type Props = {
  onSave: (nickname?: string, avatar?: string) => void;
  avatars?: string[];
};

export default function ProfileEditor({ onSave, avatars = [
  "/assets/avatars/avatar1.png",
  "/assets/avatars/avatar2.png",
  "/assets/avatars/avatar3.png",
  "/assets/avatars/avatar4.png"
] }: Props) {
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState<string | undefined>(undefined);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        placeholder="Nickname"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        style={{ padding: 6, borderRadius: 6, border: "1px solid #999" }}
      />
      <select value={avatar} onChange={(e) => setAvatar(e.target.value)} style={{ padding: 6, borderRadius: 6 }}>
        <option value="">Default avatar</option>
        {avatars.map((a) => (
          <option key={a} value={a}>{a.split("/").pop()}</option>
        ))}
      </select>
      <button onClick={() => onSave(nickname || undefined, avatar || undefined)}>Save Profile</button>
    </div>
  );
}
