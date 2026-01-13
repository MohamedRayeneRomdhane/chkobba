import React, { useEffect, useState } from 'react';
import ProfileModal from './components/ProfileModal';
import { useProfile } from './hooks/useProfile';
import TableMat from './components/TableMat';
import PlayerHand from './components/PlayerHand';
import OpponentHand from './components/OpponentHand';
import SeatPanel from './components/SeatPanel';
import CoffeeProp from './components/CoffeeProp';
import ChichaProp from './components/ChichaProp';
import CigarettesProp from './components/CigarettesProp';
import ScoreBoard from './components/ScoreBoard';
import { useGameSocket } from './game/useGameSocket';
import EndOverlay from './components/EndOverlay';
import Layout from './components/Layout';
import { getCardImage } from './game/cardAssets';
import PlayAnimationsLayer from './components/PlayAnimationsLayer';
import usePlayAnimations from './hooks/usePlayAnimations';
import useSound from './hooks/useSound';
import FooterNote from './components/FooterNote';
import TutorialSection from './components/TutorialSection';
import CookieConsentBanner from './components/CookieConsentBanner';
import LegalModal, { type LegalSection } from './components/LegalModal';
import { useCookieConsent } from './hooks/useCookieConsent';
import { loadAdsenseScript } from './lib/adsense';
import { SOUNDBOARD_SOUNDS, type SoundboardSoundFile } from './lib/soundboard';
import { usePhoneLandscape } from './hooks/usePhoneLandscape';

function getSeatIndices(mySeat: number | null | undefined) {
  const bottom = mySeat ?? 0;
  return {
    bottom,
    right: (bottom + 1) % 4,
    top: (bottom + 2) % 4,
    left: (bottom + 3) % 4,
  } as const;
}

export default function App() {
  const {
    connected,
    roomCode,
    gameState,
    roundBanner,
    lastRound,
    replayWaiting,
    soundboardEvent,
    snapshot,
    mySeat,
    dealTick,
    turn,
    clockSkewMs,
    createRoom,
    join,
    play,
    setProfile,
    replay,
    playSoundboard,
    quit,
  } = useGameSocket();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { profile: localProfile, setProfile: setLocalProfile } = useProfile();
  const [selectedHandId, setSelectedHandId] = React.useState<string | null>(null);
  const [selectedTableIds, setSelectedTableIds] = React.useState<string[]>([]);
  const [handGhostIndex, setHandGhostIndex] = React.useState<number | null>(null);
  const [roomCodeInput, setRoomCodeInput] = React.useState('');
  const roomCodeInputRefMobile = React.useRef<HTMLInputElement | null>(null);
  const roomCodeInputRefDesktop = React.useRef<HTMLInputElement | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const phoneLandscape = usePhoneLandscape();

  const { play: playTimerWarn, stop: stopTimerWarn } = useSound('/assets/soundeffects/Timer.mp3', {
    volume: 0.45,
    loop: false,
    interrupt: true,
  });

  const { play: playTurnStart } = useSound('/assets/soundeffects/turn.mp3', {
    volume: 0.4,
    loop: false,
    interrupt: true,
  });
  const timerWarnTimeoutRef = React.useRef<number | null>(null);
  const timerWarnPlayedForTurnRef = React.useRef<number | null>(null);

  const turnStartPlayedForTurnRef = React.useRef<number | null>(null);

  const currentPlayerIndex = gameState?.currentPlayerIndex ?? null;

  React.useEffect(() => {
    if (timerWarnTimeoutRef.current != null) {
      window.clearTimeout(timerWarnTimeoutRef.current);
      timerWarnTimeoutRef.current = null;
    }
    stopTimerWarn();

    if (!turn || mySeat == null) return;
    if (currentPlayerIndex == null) return;
    if (currentPlayerIndex !== mySeat) return;

    const now = Date.now() + clockSkewMs;
    const remainingMs = Math.max(0, turn.endsAt - now);
    if (remainingMs <= 0) return;

    // Play once when 5s are left.
    const playAt = remainingMs - 5_000;
    if (timerWarnPlayedForTurnRef.current !== turn.endsAt && playAt <= 0) {
      timerWarnPlayedForTurnRef.current = turn.endsAt;
      void playTimerWarn();
      return;
    }

    if (timerWarnPlayedForTurnRef.current === turn.endsAt) return;

    timerWarnTimeoutRef.current = window.setTimeout(() => {
      timerWarnPlayedForTurnRef.current = turn.endsAt;
      void playTimerWarn();
    }, playAt);

    return () => {
      if (timerWarnTimeoutRef.current != null) {
        window.clearTimeout(timerWarnTimeoutRef.current);
        timerWarnTimeoutRef.current = null;
      }
      stopTimerWarn();
    };
  }, [turn, mySeat, currentPlayerIndex, clockSkewMs, playTimerWarn, stopTimerWarn]);

  React.useEffect(() => {
    // One-shot: when the active turn becomes the local player's turn.
    if (!turn) return;
    if (mySeat == null) return;
    if (currentPlayerIndex !== mySeat) return;

    if (turnStartPlayedForTurnRef.current === turn.endsAt) return;
    turnStartPlayedForTurnRef.current = turn.endsAt;
    void playTurnStart();
  }, [turn, mySeat, currentPlayerIndex, playTurnStart]);

  const cookieConsent = useCookieConsent();
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalSection, setLegalSection] = useState<LegalSection>('privacy');

  useEffect(() => {
    if (cookieConsent.status === 'granted') {
      loadAdsenseScript().catch(() => {
        // ignore: ads are optional
      });
    }
  }, [cookieConsent.status]);

  const openLegal = (section: LegalSection) => {
    setLegalSection(section);
    setLegalOpen(true);
  };

  // Deal tick sound per card animation start
  const { play: playDealTick } = useSound('/assets/soundeffects/deal.mp3', {
    volume: 0.7,
    loop: false,
    interrupt: true,
  });

  const [soundboardOpen, setSoundboardOpen] = React.useState(false);
  const soundboardRef = React.useRef<HTMLDivElement | null>(null);
  const soundboardAnchorRef = React.useRef<HTMLDivElement | null>(null);
  type SoundboardOverlayPos = {
    left: number;
    bottom: number;
  };
  const [soundboardOverlayPos, setSoundboardOverlayPos] =
    React.useState<SoundboardOverlayPos | null>(null);
  const [mutedSoundboardSeats, setMutedSoundboardSeats] = React.useState<Set<number>>(
    () => new Set()
  );
  const [speakingSeat, setSpeakingSeat] = React.useState<number | null>(null);
  const lastHandledSoundboardT = React.useRef<number>(0);

  // Per-seat audio: a player can't have multiple sounds overlapping.
  const seatAudioRef = React.useRef<Map<number, HTMLAudioElement>>(new Map());

  const playSoundboardLocal = React.useCallback(
    async (seatIndex: number, file: SoundboardSoundFile) => {
      const prev = seatAudioRef.current.get(seatIndex);
      if (prev) {
        prev.pause();
        prev.currentTime = 0;
      }

      const match = SOUNDBOARD_SOUNDS.find((s) => s.file === file);
      const src = match?.src || `/assets/soundboard/${file}`;
      const audio = new Audio(src);
      audio.volume = 0.95;
      seatAudioRef.current.set(seatIndex, audio);

      try {
        await audio.play();
      } catch {
        // ignore autoplay or load errors
      }
    },
    []
  );

  React.useEffect(() => {
    const seatAudio = seatAudioRef.current;
    return () => {
      for (const a of seatAudio.values()) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {
          // ignore
        }
      }
      seatAudio.clear();
    };
  }, []);

  React.useEffect(() => {
    if (!soundboardOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const root = soundboardRef.current;
      if (!root) return;
      if (e.target instanceof Node && root.contains(e.target)) return;
      setSoundboardOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [soundboardOpen]);

  React.useEffect(() => {
    if (!soundboardOpen) {
      setSoundboardOverlayPos(null);
      return;
    }

    const update = () => {
      const anchor = soundboardAnchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const left = Math.min(window.innerWidth - 12, Math.max(12, centerX));
      // Place overlay directly above the bottom player's panel.
      // Using `bottom` keeps us independent of the overlay height.
      const gap = 10;
      const bottom = Math.max(12, window.innerHeight - rect.top + gap);

      setSoundboardOverlayPos({ left, bottom });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
    };
  }, [soundboardOpen]);

  React.useEffect(() => {
    if (!soundboardEvent) return;
    // Avoid replaying the same event when unrelated state changes (e.g., mute toggles).
    if (soundboardEvent.t <= lastHandledSoundboardT.current) return;
    lastHandledSoundboardT.current = soundboardEvent.t;

    const seatIndex = soundboardEvent.seatIndex as number;
    const isMuted = seatIndex !== (mySeat ?? -1) && mutedSoundboardSeats.has(seatIndex);

    setSpeakingSeat(seatIndex);
    const t = window.setTimeout(() => {
      setSpeakingSeat((cur) => (cur === seatIndex ? null : cur));
    }, 1100);

    if (!isMuted) {
      void playSoundboardLocal(seatIndex, soundboardEvent.soundFile);
    }

    return () => window.clearTimeout(t);
  }, [soundboardEvent, mutedSoundboardSeats, mySeat, playSoundboardLocal]);

  const selectedHandCard = React.useMemo(() => {
    if (mySeat == null || !gameState?.hands) return null;
    return (gameState.hands[mySeat] || []).find((c) => c.id === selectedHandId) || null;
  }, [selectedHandId, gameState, mySeat]);
  const selectedSum = React.useMemo(() => {
    const byId = new Map((gameState?.tableCards || []).map((c) => [c.id, c]));
    return selectedTableIds.reduce((s, id) => s + (byId.get(id)?.value || 0), 0);
  }, [selectedTableIds, gameState]);
  const canPlaySelected = React.useMemo(() => {
    if (!selectedHandCard) return false;
    // allow play with no combo (place on table) or exact sum combo
    return selectedTableIds.length === 0 || selectedSum === selectedHandCard.value;
  }, [selectedHandCard, selectedTableIds, selectedSum]);

  const { flights: pendingFlights, clearFlights } = usePlayAnimations(
    gameState,
    mySeat,
    selectedHandCard
  );

  return (
    <>
      <Layout
        headerRight={
          <>
            {/* Mobile header */}
            <div className="header-controls-mobile sm:hidden w-full flex items-center justify-end">
              <div className="relative">
                <button
                  type="button"
                  className={`burger-btn px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white border border-white/15 shadow-sm ${
                    mobileMenuOpen ? 'burger-btn--open' : ''
                  }`}
                  aria-label="Open menu"
                  aria-expanded={mobileMenuOpen}
                  onClick={() => setMobileMenuOpen((v) => !v)}
                >
                  ☰
                </button>

                {mobileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[300]"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-hidden
                    />
                    <div className="absolute right-0 top-full mt-2 z-[310] w-[min(92vw,340px)] rounded-xl bg-tableWood-dark/95 backdrop-blur-sm shadow-caféGlow border border-white/10 p-2">
                      <div className="px-2 py-1 text-xs text-white/80">Menu</div>

                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          createRoom().then((code) => join(code));
                        }}
                      >
                        Create & Join
                      </button>

                      <button
                        type="button"
                        className="mt-1 w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setProfileModalOpen(true);
                        }}
                      >
                        Edit Profile
                      </button>

                      <div className="mt-2 rounded-lg bg-black/15 border border-white/10 p-2">
                        <div className="room-input room-input--fluid">
                          <div className="group">
                            <input
                              ref={roomCodeInputRefMobile}
                              id="roomCodeMobile"
                              type="text"
                              className="input"
                              required
                              value={roomCodeInput}
                              onChange={(e) => setRoomCodeInput(e.currentTarget.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const code = roomCodeInput.trim();
                                  if (code) {
                                    setMobileMenuOpen(false);
                                    join(code);
                                  }
                                }
                              }}
                              inputMode="text"
                              autoCapitalize="characters"
                              autoCorrect="off"
                              spellCheck={false}
                            />
                            <span className="highlight" />
                            <span className="bar" />
                            <label htmlFor="roomCodeMobile">Room code</label>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn--azure w-full justify-center mt-2"
                          onClick={() => {
                            const code = roomCodeInput.trim();
                            if (!code) return;
                            setMobileMenuOpen(false);
                            join(code);
                          }}
                        >
                          Join
                        </button>
                      </div>

                      {roomCode && (
                        <div className="mt-2 flex items-center justify-between gap-2 px-1 text-white/90">
                          <span className="px-2 py-0.5 rounded bg-white/20 text-white/90 border border-white/20 shadow-sm">
                            Room {roomCode}
                          </span>
                          <button
                            title="Copy room code"
                            className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white shadow-sm"
                            onClick={() => {
                              navigator.clipboard?.writeText(roomCode).then(() => {
                                const el = roomCodeInputRefMobile.current;
                                if (el) {
                                  el.classList.add('ring', 'ring-white/40');
                                  setTimeout(
                                    () => el.classList.remove('ring', 'ring-white/40'),
                                    600
                                  );
                                }
                              });
                            }}
                          >
                            <span aria-hidden>📋</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Desktop header (unchanged layout/labels) */}
            <div className="header-controls-desktop hidden sm:flex items-center gap-4">
              <button
                className="btn btn--mint"
                onClick={() => createRoom().then((code) => join(code))}
              >
                Create & Join
              </button>

              <div className="room-input">
                <div className="group">
                  <input
                    ref={roomCodeInputRefDesktop}
                    id="roomCodeDesktop"
                    type="text"
                    className="input"
                    required
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.currentTarget.value)}
                    inputMode="text"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <span className="highlight" />
                  <span className="bar" />
                  <label htmlFor="roomCodeDesktop">Room code</label>
                </div>
              </div>

              <button
                className="btn btn--azure"
                onClick={() => {
                  const code = roomCodeInput.trim();
                  if (code) join(code);
                }}
              >
                Join
              </button>

              <button className="btn btn--desert ml-2" onClick={() => setProfileModalOpen(true)}>
                <span role="img" aria-label="profile">
                  👤
                </span>
                Edit Profile
              </button>

              <span className="text-sm whitespace-nowrap flex items-center gap-2 text-white/90">
                <span>
                  {connected ? 'Connected' : 'Disconnected'}
                  {snapshot ? ` • Players ${snapshot.players?.length || 0}/4` : ''}
                  {mySeat !== null ? ` • You are seat ${mySeat + 1}` : ''}
                </span>
                {roomCode && (
                  <span className="inline-flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded bg-white/20 text-white/90 border border-white/20 shadow-sm">
                      Room {roomCode}
                    </span>
                    <button
                      title="Copy room code"
                      className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white shadow-sm"
                      onClick={() => {
                        navigator.clipboard?.writeText(roomCode).then(() => {
                          const el = roomCodeInputRefDesktop.current;
                          if (el) {
                            el.classList.add('ring', 'ring-white/40');
                            setTimeout(() => el.classList.remove('ring', 'ring-white/40'), 600);
                          }
                        });
                      }}
                    >
                      <span aria-hidden>📋</span>
                    </button>
                  </span>
                )}
              </span>
            </div>
          </>
        }
        footerLeft={<FooterNote />}
        footerRight={
          <div className="shrink-0 ml-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm opacity-90">
            <span>© Chkobba Café</span>
            <span className="hidden sm:inline">• Made for friendly games</span>
            <span className="hidden sm:inline">•</span>
            <button
              type="button"
              className="underline hover:no-underline"
              onClick={() => openLegal('privacy')}
            >
              Privacy
            </button>
            <span>•</span>
            <button
              type="button"
              className="underline hover:no-underline"
              onClick={() => openLegal('terms')}
            >
              Terms
            </button>
            <span>•</span>
            <button
              type="button"
              className="underline hover:no-underline"
              onClick={() => openLegal('contact')}
            >
              Contact
            </button>
            <span>•</span>
            <button
              type="button"
              className="underline hover:no-underline"
              onClick={() => cookieConsent.reset()}
              title="Change cookie preferences"
            >
              Cookies
            </button>
          </div>
        }
      >
        {/* End screen overlay: show after round end and until all replays */}
        {(() => {
          const waitingForReplay = replayWaiting ? replayWaiting.count < replayWaiting.total : true; // if replayWaiting not loaded yet, keep overlay visible after end
          const shouldShowOverlay = !!lastRound && waitingForReplay;
          return shouldShowOverlay;
        })() && (
          <EndOverlay
            banner={roundBanner}
            scores={lastRound?.scores ?? gameState?.scoresByTeam ?? null}
            details={lastRound?.details ?? null}
            replayWaiting={replayWaiting}
            onReplay={() => {
              if (roomCode) replay(roomCode);
            }}
            onQuit={() => {
              if (roomCode) quit(roomCode);
            }}
          />
        )}
        <section className="app-section app-section--game sm:snap-start sm:snap-always h-full min-h-0 flex flex-col gap-0.5 sm:gap-0">
          <div className="game-table-area flex-1 min-h-0 flex items-stretch justify-stretch overflow-visible">
            <TableMat>
              {/* Round banner */}
              {/* Inline banner removed in favor of end overlay */}
              {/* Table cards placeholder */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2 place-items-center max-w-[90%]"
                id="table-grid"
              >
                {(gameState?.tableCards || []).map((c) => {
                  const selected = selectedTableIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      data-card-id={c.id}
                      onClick={() => {
                        // toggle selection for building combinations
                        setSelectedTableIds((prev) =>
                          prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                        );
                      }}
                      className={`w-[clamp(60px,9.5vmin,120px)] aspect-[2/3] rounded-lg bg-white border-2 shadow-md overflow-hidden transition-transform duration-200 ease-out cursor-pointer touch-manipulation ${selected ? 'ring-2 ring-amber-400 border-gray-800 -translate-y-1' : 'border-gray-800 sm:hover:-translate-y-0.5'}`}
                    >
                      <img
                        src={getCardImage(c)}
                        alt={`${c.rank} of ${c.suit}`}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Opponents (relative to local seat) */}
              {(() => {
                const { right: idxRight, top: idxTop, left: idxLeft } = getSeatIndices(mySeat);
                const countAt = (i: number) => gameState?.hands?.[i]?.length ?? 0;
                return (
                  <>
                    <OpponentHand
                      position="top"
                      count={countAt(idxTop)}
                      dealTick={dealTick}
                      onDealAnimStart={playDealTick}
                    />
                    <OpponentHand
                      position="left"
                      count={countAt(idxLeft)}
                      dealTick={dealTick}
                      onDealAnimStart={playDealTick}
                    />
                    <OpponentHand
                      position="right"
                      count={countAt(idxRight)}
                      dealTick={dealTick}
                      onDealAnimStart={playDealTick}
                    />
                  </>
                );
              })()}

              {/* Avatar + nickname panels per seat (rotate so local seat is bottom) */}
              {(() => {
                const seats = snapshot?.seats || [null, null, null, null];
                const profiles = snapshot?.profiles || {};
                const current = gameState?.currentPlayerIndex ?? null;
                const {
                  bottom: idxBottom,
                  right: idxRight,
                  top: idxTop,
                  left: idxLeft,
                } = getSeatIndices(mySeat);
                const teamForSeat = (i: number) => (i % 2 === 0 ? 0 : 1); // [0,2] -> Team A, [1,3] -> Team B
                const teamName = (i: number) => (teamForSeat(i) === 0 ? 'Team A' : 'Team B');
                const getProfile = (seatIndex: number) => {
                  const sid = seats[seatIndex];
                  const fromSnapshot = sid ? profiles[sid] : null;
                  if (seatIndex === idxBottom) {
                    return (
                      fromSnapshot ??
                      (localProfile.nickname || localProfile.avatar
                        ? { nickname: localProfile.nickname, avatar: localProfile.avatar }
                        : null)
                    );
                  }
                  return fromSnapshot;
                };

                const getDisplay = (seatIndex: number) => {
                  const p = getProfile(seatIndex);
                  if (!seats[seatIndex]) return { nickname: 'Empty seat', avatar: undefined };
                  return { nickname: p?.nickname, avatar: p?.avatar };
                };
                return (
                  <>
                    {/* Top opponent */}
                    <SeatPanel
                      position="top"
                      avatar={getDisplay(idxTop).avatar}
                      nickname={getDisplay(idxTop).nickname}
                      highlight={current === idxTop}
                      turnEndsAt={current === idxTop ? turn?.endsAt : undefined}
                      turnDurationMs={current === idxTop ? turn?.durationMs : undefined}
                      clockSkewMs={current === idxTop ? clockSkewMs : undefined}
                      teamLabel={teamName(idxTop)}
                      teamIndex={teamForSeat(idxTop) as 0 | 1}
                      compact
                      dense={phoneLandscape}
                      actionIconSrc={
                        seats[idxTop]
                          ? mutedSoundboardSeats.has(idxTop)
                            ? '/assets/icons/mute.ico'
                            : '/assets/icons/play.ico'
                          : undefined
                      }
                      actionIconAlt={mutedSoundboardSeats.has(idxTop) ? 'Muted' : 'Unmuted'}
                      actionIconTitle={
                        mutedSoundboardSeats.has(idxTop) ? 'Unmute soundboard' : 'Mute soundboard'
                      }
                      onActionClick={() => {
                        if (!seats[idxTop]) return;
                        setMutedSoundboardSeats((prev) => {
                          const next = new Set(prev);
                          if (next.has(idxTop)) next.delete(idxTop);
                          else next.add(idxTop);
                          return next;
                        });
                      }}
                      speaking={speakingSeat === idxTop && !!seats[idxTop]}
                    />
                    {/* Left opponent */}
                    <SeatPanel
                      position="left"
                      avatar={getDisplay(idxLeft).avatar}
                      nickname={getDisplay(idxLeft).nickname}
                      highlight={current === idxLeft}
                      turnEndsAt={current === idxLeft ? turn?.endsAt : undefined}
                      turnDurationMs={current === idxLeft ? turn?.durationMs : undefined}
                      clockSkewMs={current === idxLeft ? clockSkewMs : undefined}
                      teamLabel={teamName(idxLeft)}
                      teamIndex={teamForSeat(idxLeft) as 0 | 1}
                      compact
                      dense={phoneLandscape}
                      actionIconSrc={
                        seats[idxLeft]
                          ? mutedSoundboardSeats.has(idxLeft)
                            ? '/assets/icons/mute.ico'
                            : '/assets/icons/play.ico'
                          : undefined
                      }
                      actionIconAlt={mutedSoundboardSeats.has(idxLeft) ? 'Muted' : 'Unmuted'}
                      actionIconTitle={
                        mutedSoundboardSeats.has(idxLeft) ? 'Unmute soundboard' : 'Mute soundboard'
                      }
                      onActionClick={() => {
                        if (!seats[idxLeft]) return;
                        setMutedSoundboardSeats((prev) => {
                          const next = new Set(prev);
                          if (next.has(idxLeft)) next.delete(idxLeft);
                          else next.add(idxLeft);
                          return next;
                        });
                      }}
                      speaking={speakingSeat === idxLeft && !!seats[idxLeft]}
                    />
                    {/* Right opponent */}
                    <SeatPanel
                      position="right"
                      avatar={getDisplay(idxRight).avatar}
                      nickname={getDisplay(idxRight).nickname}
                      highlight={current === idxRight}
                      turnEndsAt={current === idxRight ? turn?.endsAt : undefined}
                      turnDurationMs={current === idxRight ? turn?.durationMs : undefined}
                      clockSkewMs={current === idxRight ? clockSkewMs : undefined}
                      teamLabel={teamName(idxRight)}
                      teamIndex={teamForSeat(idxRight) as 0 | 1}
                      compact
                      dense={phoneLandscape}
                      actionIconSrc={
                        seats[idxRight]
                          ? mutedSoundboardSeats.has(idxRight)
                            ? '/assets/icons/mute.ico'
                            : '/assets/icons/play.ico'
                          : undefined
                      }
                      actionIconAlt={mutedSoundboardSeats.has(idxRight) ? 'Muted' : 'Unmuted'}
                      actionIconTitle={
                        mutedSoundboardSeats.has(idxRight) ? 'Unmute soundboard' : 'Mute soundboard'
                      }
                      onActionClick={() => {
                        if (!seats[idxRight]) return;
                        setMutedSoundboardSeats((prev) => {
                          const next = new Set(prev);
                          if (next.has(idxRight)) next.delete(idxRight);
                          else next.add(idxRight);
                          return next;
                        });
                      }}
                      speaking={speakingSeat === idxRight && !!seats[idxRight]}
                    />
                  </>
                );
              })()}

              {/* Player hand overlays on top of the table */}
              <div className="player-hand-overlay absolute left-1/2 -translate-x-1/2 bottom-[clamp(4px,1.8vh,18px)] z-[45] w-[min(98%,1200px)] h-[clamp(120px,18vmin,200px)] sm:h-[clamp(160px,22vmin,260px)] px-1 flex items-end pointer-events-none overflow-visible">
                <div
                  data-seat-capture="bottom"
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-px"
                />
                <div className="no-scrollbar pointer-events-auto w-full h-full min-h-[clamp(90px,14vmin,150px)] sm:min-h-[clamp(110px,16vmin,180px)] overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain">
                  <div className="min-w-full h-full flex items-end justify-center">
                    <PlayerHand
                      cards={
                        mySeat != null && gameState?.hands ? gameState.hands[mySeat] || [] : []
                      }
                      selectedId={selectedHandId}
                      ghostIndex={handGhostIndex}
                      onSelect={(id) => {
                        // re-clicking toggles: if same id selected, either discard (no table selected) or deselect
                        if (selectedHandId === id) {
                          if (canPlaySelected && selectedTableIds.length === 0) {
                            // discard: place on table
                            if (!roomCode || mySeat == null) return;
                            if (gameState?.currentPlayerIndex !== mySeat) return;
                            // fade out the actual card for a quick, smooth removal
                            const el = document.querySelector(
                              `[data-hand-card-id="${id}"]`
                            ) as HTMLElement | null;
                            if (el) {
                              el.style.willChange = 'opacity';
                              el.style.transition = 'opacity 220ms ease-out';
                              el.style.opacity = '0';
                            }
                            const handNow =
                              mySeat != null && gameState?.hands
                                ? gameState.hands[mySeat] || []
                                : [];
                            const idx = handNow.findIndex((c) => c.id === id);
                            if (idx >= 0) setHandGhostIndex(idx);
                            play(roomCode, id, undefined).then(() => {
                              setSelectedHandId(null);
                              setSelectedTableIds([]);
                            });
                          } else {
                            setSelectedHandId(null);
                          }
                        } else {
                          setSelectedHandId(id);
                        }
                      }}
                      onPlay={(id) => {
                        if (!roomCode) return;
                        if (mySeat == null) return;
                        if (gameState?.currentPlayerIndex !== mySeat) return;
                        // fade out the actual card for a quick, smooth removal
                        const el = document.querySelector(
                          `[data-hand-card-id="${id}"]`
                        ) as HTMLElement | null;
                        if (el) {
                          el.style.willChange = 'opacity';
                          el.style.transition = 'opacity 220ms ease-out';
                          el.style.opacity = '0';
                        }
                        const handNow =
                          mySeat != null && gameState?.hands ? gameState.hands[mySeat] || [] : [];
                        const idx = handNow.findIndex((c) => c.id === id);
                        if (idx >= 0) setHandGhostIndex(idx);
                        const combo =
                          selectedTableIds.length && selectedSum === (selectedHandCard?.value ?? -1)
                            ? selectedTableIds
                            : undefined;
                        play(roomCode, id, combo).then(() => {
                          setSelectedHandId(null);
                          setSelectedTableIds([]);
                        });
                      }}
                      dealTick={dealTick}
                      onDealAnimStart={playDealTick}
                    />
                  </div>
                </div>
              </div>

              {/* Props */}
              <CoffeeProp />
              <ChichaProp />
              <CigarettesProp />

              {/* Scoreboard */}
              <ScoreBoard state={gameState || null} />
              <PlayAnimationsLayer
                flights={pendingFlights}
                onDone={() => {
                  clearFlights();
                  setHandGhostIndex(null);
                }}
              />
            </TableMat>
          </div>

          {/* Player banner + action bar outside (below) the table */}
          <div
            className={`action-area w-full shrink-0 flex flex-col items-center justify-center ${soundboardOpen ? 'soundboard-open' : ''}`}
          >
            {(() => {
              const seats = snapshot?.seats || [null, null, null, null];
              const profiles = snapshot?.profiles || {};
              const current = gameState?.currentPlayerIndex ?? null;
              const { bottom: idxBottom } = getSeatIndices(mySeat);
              const teamForSeat = (i: number) => (i % 2 === 0 ? 0 : 1);
              const teamName = (i: number) => (teamForSeat(i) === 0 ? 'Team A' : 'Team B');

              const sid = seats[idxBottom];
              const fromSnapshot = sid ? profiles[sid] : null;
              const prof =
                fromSnapshot ??
                (localProfile.nickname || localProfile.avatar
                  ? { nickname: localProfile.nickname, avatar: localProfile.avatar }
                  : null);

              return (
                <div className="player-seat-row w-full flex items-center justify-center py-0.5 sm:py-1">
                  <div ref={soundboardRef} className="flex flex-col items-center">
                    <div ref={soundboardAnchorRef} className="relative">
                      <SeatPanel
                        position="bottom"
                        avatar={prof?.avatar}
                        nickname={prof?.nickname}
                        highlight={current === idxBottom}
                        turnEndsAt={current === idxBottom ? turn?.endsAt : undefined}
                        turnDurationMs={current === idxBottom ? turn?.durationMs : undefined}
                        clockSkewMs={current === idxBottom ? clockSkewMs : undefined}
                        teamLabel={teamName(idxBottom)}
                        teamIndex={teamForSeat(idxBottom) as 0 | 1}
                        compact
                        absolute={false}
                        actionIconSrc={roomCode ? '/assets/icons/play.ico' : undefined}
                        actionIconAlt="Soundboard"
                        actionIconTitle="Soundboard"
                        onActionClick={() => {
                          if (!roomCode) return;
                          setSoundboardOpen((v) => !v);
                        }}
                        speaking={speakingSeat === idxBottom}
                      />
                    </div>

                    {soundboardOpen && roomCode && soundboardOverlayPos && (
                      <>
                        {/* Backdrop (helps focus + consistent close) */}
                        <div
                          className="fixed inset-0 z-[255] bg-transparent"
                          onClick={() => setSoundboardOpen(false)}
                          aria-hidden
                        />

                        {/* Mobile: bottom sheet */}
                        <div className="sm:hidden fixed inset-x-0 bottom-0 z-[260]">
                          <div className="mx-auto max-w-[640px]">
                            <div className="rounded-t-3xl border-t border-x border-white/15 bg-tableWood-dark/95 backdrop-blur-sm shadow-caféGlow text-white">
                              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                                <div>
                                  <div className="text-sm font-semibold tracking-wide">
                                    Soundboard
                                  </div>
                                  <div className="text-[11px] text-white/70">
                                    Tap a sound to send it
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs"
                                  onClick={() => setSoundboardOpen(false)}
                                  aria-label="Close soundboard"
                                >
                                  Close
                                </button>
                              </div>
                              <div className="px-4 pb-4 max-h-[55svh] overflow-auto">
                                {SOUNDBOARD_SOUNDS.length === 0 ? (
                                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/85">
                                    Add audio files to{' '}
                                    <span className="font-mono">
                                      client/public/assets/soundboard
                                    </span>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-2">
                                    {SOUNDBOARD_SOUNDS.map((s) => (
                                      <button
                                        key={s.file}
                                        type="button"
                                        className="group rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15 px-3 py-2 text-left"
                                        onClick={() => {
                                          void playSoundboard(roomCode, s.file);
                                          setSoundboardOpen(false);
                                        }}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-[13px] font-semibold truncate">
                                            {s.label}
                                          </span>
                                          <img
                                            src="/assets/icons/play.ico"
                                            alt="Play"
                                            className="w-4 h-4 opacity-90 group-hover:opacity-100"
                                          />
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Desktop: anchored popover near the seat */}
                        <div
                          className="hidden sm:block fixed -translate-x-1/2 z-[260] w-[min(360px,34vw)] max-h-[48vh] overflow-hidden rounded-2xl border border-white/15 bg-tableWood-dark/95 backdrop-blur-sm shadow-caféGlow text-white"
                          style={{
                            left: soundboardOverlayPos.left,
                            bottom: soundboardOverlayPos.bottom,
                          }}
                        >
                          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <div>
                              <div className="text-sm font-semibold tracking-wide">Soundboard</div>
                              <div className="text-[11px] text-white/70">Pick a sound</div>
                            </div>
                            <button
                              type="button"
                              className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs"
                              onClick={() => setSoundboardOpen(false)}
                              aria-label="Close soundboard"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="p-3 max-h-[42vh] overflow-auto">
                            {SOUNDBOARD_SOUNDS.length === 0 ? (
                              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/85">
                                Add audio files to{' '}
                                <span className="font-mono">client/public/assets/soundboard</span>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {SOUNDBOARD_SOUNDS.map((s) => (
                                  <button
                                    key={s.file}
                                    type="button"
                                    className="group rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:bg-white/15 px-3 py-2 text-left"
                                    onClick={() => {
                                      void playSoundboard(roomCode, s.file);
                                      setSoundboardOpen(false);
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[13px] font-semibold truncate">
                                        {s.label}
                                      </span>
                                      <img
                                        src="/assets/icons/play.ico"
                                        alt="Play"
                                        className="w-4 h-4 opacity-90 group-hover:opacity-100"
                                      />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
            {/* Action bar for selected play */}
            <div className="action-bar mt-0.5 sm:mt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3 w-full px-2 sm:px-0">
              <div className="text-xs sm:text-sm px-2 py-1.5 rounded bg-white/70 shadow text-center sm:text-left">
                {selectedHandCard
                  ? `Selected: ${selectedHandCard.rank} • Sum: ${selectedSum}`
                  : 'Select a card'}
              </div>
              <button
                disabled={!canPlaySelected || !selectedHandCard}
                className={`px-4 py-2 sm:px-3 sm:py-1 rounded-md text-white shadow-sm w-full sm:w-auto ${canPlaySelected && selectedHandCard ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-500 opacity-60 cursor-not-allowed'}`}
                onClick={() => {
                  if (!roomCode || !selectedHandCard) return;
                  if (mySeat == null) return;
                  if (gameState?.currentPlayerIndex !== mySeat) return;
                  // fade out the actual card for a quick, smooth removal
                  const el = document.querySelector(
                    `[data-hand-card-id="${selectedHandCard.id}"]`
                  ) as HTMLElement | null;
                  if (el) {
                    el.style.willChange = 'opacity';
                    el.style.transition = 'opacity 220ms ease-out';
                    el.style.opacity = '0';
                  }
                  const handNow =
                    mySeat != null && gameState?.hands ? gameState.hands[mySeat] || [] : [];
                  const idx = handNow.findIndex((c) => c.id === selectedHandCard.id);
                  if (idx >= 0) setHandGhostIndex(idx);
                  const combo =
                    selectedTableIds.length && selectedSum === selectedHandCard.value
                      ? selectedTableIds
                      : undefined;
                  play(roomCode, selectedHandCard.id, combo).then(() => {
                    setSelectedHandId(null);
                    setSelectedTableIds([]);
                  });
                }}
              >
                Play Selected
              </button>
            </div>
          </div>
        </section>

        <section className="app-section app-section--tutorial sm:snap-start sm:snap-always min-h-full flex">
          <TutorialSection />
        </section>
      </Layout>
      {/* Profile modal for editing profile anytime */}
      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        initialNickname={localProfile.nickname}
        initialAvatar={localProfile.avatar}
        onSave={(nickname: string, avatar?: string) => {
          setProfile(nickname, avatar);
          setLocalProfile(nickname || undefined, avatar || undefined);
        }}
      />

      <CookieConsentBanner
        open={cookieConsent.status === null}
        onAccept={cookieConsent.accept}
        onDecline={cookieConsent.decline}
        onLearnMore={() => openLegal('privacy')}
      />

      <LegalModal open={legalOpen} section={legalSection} onClose={() => setLegalOpen(false)} />
    </>
  );
}
