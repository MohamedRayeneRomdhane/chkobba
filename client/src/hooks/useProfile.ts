import React from 'react';

export type Profile = { nickname?: string; avatar?: string };

const STORAGE_KEY = 'chkobba.profile';

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function saveProfile(p: Profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // ignore storage errors
  }
}

export function useProfile(initial?: Profile) {
  const [profile, setProfileState] = React.useState<Profile>(() => ({
    ...loadProfile(),
    ...(initial || {}),
  }));

  const setProfile = React.useCallback((nickname?: string, avatar?: string) => {
    const next: Profile = { nickname, avatar };
    setProfileState(next);
    saveProfile(next);
  }, []);

  const updateProfile = React.useCallback((partial: Partial<Profile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...partial };
      saveProfile(next);
      return next;
    });
  }, []);

  return { profile, setProfile, updateProfile };
}
