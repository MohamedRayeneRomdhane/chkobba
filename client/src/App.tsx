import React from 'react';
import Layout from './components/Layout';
import ProfileModal from './components/ProfileModal';
import CookieConsentBanner from './components/CookieConsentBanner';
import FooterNote from './components/FooterNote';
import HeaderControls from './features/lobby/HeaderControls';
import FooterLinks from './features/lobby/FooterLinks';
import GameTable from './features/game/GameTable';
import { useTurnSounds } from './features/game/useTurnSounds';
import { useGameNetwork } from './net/useGameNetwork';
import { useGameStore } from './store';
import { useProfile } from './hooks/useProfile';
import { usePhoneLandscape } from './hooks/usePhoneLandscape';
import { useCookieConsent } from './hooks/useCookieConsent';
import { loadAdsenseScript } from './lib/adsense';
import { useRoom } from './store/selectors';

const LegalModal = React.lazy(() => import('./components/LegalModal'));
const TutorialSection = React.lazy(() => import('./components/TutorialSection'));

export default function App() {
  const net = useGameNetwork();
  const { profile: localProfile, setProfile: setLocalProfile } = useProfile();
  const phoneLandscape = usePhoneLandscape();
  const cookieConsent = useCookieConsent();

  const { snapshot } = useRoom();
  const playerCount = (snapshot?.settings?.playerCount ?? 4) as 2 | 4;

  const profileModalOpen = useGameStore((s) => s.profileModalOpen);
  const setProfileModalOpen = useGameStore((s) => s.setProfileModalOpen);
  const legalOpen = useGameStore((s) => s.legalOpen);
  const legalSection = useGameStore((s) => s.legalSection);
  const setLegal = useGameStore((s) => s.setLegal);

  useTurnSounds();

  React.useEffect(() => {
    if (cookieConsent.status === 'granted') {
      loadAdsenseScript().catch(() => {
        /* ads optional */
      });
    }
  }, [cookieConsent.status]);

  return (
    <>
      <Layout
        headerRight={<HeaderControls net={net} playerCount={playerCount} />}
        footerLeft={<FooterNote />}
        adsEnabled={cookieConsent.status === 'granted'}
        footerRight={<FooterLinks cookieConsent={cookieConsent} />}
      >
        <GameTable net={net} localProfile={localProfile} phoneLandscape={phoneLandscape} />

        <section className="app-section app-section--tutorial sm:snap-start sm:snap-always min-h-full flex">
          <React.Suspense fallback={<div className="m-auto text-white/60">Loading…</div>}>
            <TutorialSection />
          </React.Suspense>
        </section>
      </Layout>

      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        initialNickname={localProfile.nickname}
        initialAvatar={localProfile.avatar}
        onSave={(nickname: string, avatar?: string) => {
          net.setProfile(nickname, avatar);
          setLocalProfile(nickname || undefined, avatar || undefined);
        }}
      />

      <CookieConsentBanner
        open={cookieConsent.status === null}
        onAccept={cookieConsent.accept}
        onDecline={cookieConsent.decline}
        onLearnMore={() => setLegal(true, 'privacy')}
      />

      {legalOpen && (
        <React.Suspense fallback={null}>
          <LegalModal open={legalOpen} section={legalSection} onClose={() => setLegal(false)} />
        </React.Suspense>
      )}
    </>
  );
}
