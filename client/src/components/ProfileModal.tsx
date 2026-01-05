import React, { useState } from 'react';
import ProfileEditor from './ProfileEditor';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (_nickname: string, _avatar?: string) => void;
  initialNickname?: string;
  initialAvatar?: string;
}

export default function ProfileModal({
  open,
  onClose,
  onSave,
  initialNickname,
  initialAvatar,
}: ProfileModalProps) {
  const [nick, setNick] = useState<string>(initialNickname || '');
  const [av, setAv] = useState<string | undefined>(initialAvatar || undefined);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal panel */}
      <div className="relative w-[92vw] max-w-[720px] mx-auto rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-amber-100 to-amber-50 border-b border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-300 text-amber-900 shadow-inner">
              👤
            </span>
            <h2 className="text-base sm:text-lg font-semibold text-amber-900">Edit Profile</h2>
          </div>
          <button
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-700 hover:bg-gray-100 border border-gray-200"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-5 sm:py-6">
          <div className="grid grid-cols-1 gap-4">
            <ProfileEditor
              onSave={(nickname, avatar) => {
                onSave(nickname || '', avatar);
                onClose();
              }}
              onChange={(nickname, avatar) => {
                setNick(nickname || '');
                setAv(avatar);
              }}
              avatars={undefined}
              showInlineSave={false}
              initialNickname={nick}
              initialAvatar={av}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200">
          <button
            className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
            onClick={() => {
              onSave(nick || '', av);
              onClose();
            }}
            disabled={!nick}
            title={!nick ? 'Enter a nickname to save' : 'Save profile'}
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
