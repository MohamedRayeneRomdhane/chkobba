import React, { useState } from 'react';

type Props = {
  onSave: (_nickname?: string, _avatar?: string) => void;
  onChange?: (_nickname?: string, _avatar?: string) => void;
  avatars?: string[];
  showInlineSave?: boolean;
  initialNickname?: string;
  initialAvatar?: string;
};

// List all avatar image filenames available in the assets/avatars folder
const defaultAvatars = [
  '/assets/avatars/avatar1.jpg',
  '/assets/avatars/avatar2.jpg',
  '/assets/avatars/avatar3.jpg',
  '/assets/avatars/avatar4.jpg',
  '/assets/avatars/avatar5.jpg',
  '/assets/avatars/avatar6.jpg',
  '/assets/avatars/avatar7.jpg',
  '/assets/avatars/avatar8.jpg',
  '/assets/avatars/avatar9.jpg',
  '/assets/avatars/avatar10.jpg',
  '/assets/avatars/avatar11.jpg',
  '/assets/avatars/default.svg',
];

export default function ProfileEditor({
  onSave,
  onChange,
  avatars = defaultAvatars,
  showInlineSave = true,
  initialNickname,
  initialAvatar,
}: Props) {
  const [nickname, setNickname] = useState(initialNickname || '');
  const [avatar, setAvatar] = useState<string | undefined>(initialAvatar || undefined);

  React.useEffect(() => {
    setNickname(initialNickname || '');
  }, [initialNickname]);

  React.useEffect(() => {
    setAvatar(initialAvatar || undefined);
  }, [initialAvatar]);

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <input
        placeholder="Nickname"
        value={nickname}
        onChange={(e) => {
          const v = e.target.value;
          setNickname(v);
          onChange?.(v || undefined, avatar);
        }}
        style={{ padding: 6, borderRadius: 6, border: '1px solid #999' }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {avatars.map((a) => (
          <img
            key={a}
            src={a}
            alt={a.split('/').pop()}
            onClick={() => {
              setAvatar(a);
              onChange?.(nickname || undefined, a);
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              border: avatar === a ? '2px solid #4ade80' : '1px solid #999',
              boxShadow: avatar === a ? '0 0 0 2px #bbf7d0' : undefined,
              cursor: 'pointer',
              objectFit: 'cover',
              background: '#eee',
              opacity: avatar === a ? 1 : 0.7,
              transition: 'border 0.2s, box-shadow 0.2s, opacity 0.2s',
            }}
          />
        ))}
      </div>
      {showInlineSave && (
        <button
          onClick={() => onSave(nickname || undefined, avatar || undefined)}
          style={{ marginLeft: 8 }}
        >
          Save Profile
        </button>
      )}
    </div>
  );
}
