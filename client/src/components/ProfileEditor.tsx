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
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
      <input
        placeholder="Nickname"
        value={nickname}
        onChange={(e) => {
          const v = e.target.value;
          setNickname(v);
          onChange?.(v || undefined, avatar);
        }}
        className="px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-300 w-full sm:w-auto"
      />
      <div className="flex flex-wrap gap-2 items-center">
        {avatars.map((a) => (
          <img
            key={a}
            src={a}
            alt={a.split('/').pop()}
            onClick={() => {
              setAvatar(a);
              onChange?.(nickname || undefined, a);
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-md object-cover bg-gray-200 cursor-pointer transition"
            style={{
              border: avatar === a ? '2px solid #4ade80' : '1px solid #999',
              boxShadow: avatar === a ? '0 0 0 2px #bbf7d0' : undefined,
              opacity: avatar === a ? 1 : 0.7,
            }}
          />
        ))}
      </div>
      {showInlineSave && (
        <button
          onClick={() => onSave(nickname || undefined, avatar || undefined)}
          className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
        >
          Save Profile
        </button>
      )}
    </div>
  );
}
