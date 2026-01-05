/* eslint-disable prettier/prettier */
/* eslint linebreak-style: 0 */
import React, { useEffect, useRef, useState } from 'react';

function useInViewOnce<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [inView, threshold]);

  return { ref, inView };
}

export default function TutorialSection() {
  const rules = useInViewOnce<HTMLDivElement>();
  const room = useInViewOnce<HTMLDivElement>();
  const profile = useInViewOnce<HTMLDivElement>();

  return (
    <section
      id="tutorial"
      className="w-full min-h-full flex items-start justify-center pt-1 pb-10 sm:pt-1 sm:pb-14"
    >
      <div className="w-full max-w-[min(1200px,96vw)]">
        <div className="px-1 sm:px-2">
          <h2 className="text-amber-100 text-2xl sm:text-3xl font-bold tracking-wide drop-shadow">
            Tutorial
          </h2>
          <p className="text-white/90 text-sm sm:text-base mt-1">
            Settle in at the café table—learn captures, room codes, and profile setup.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:gap-4">
          <div
            ref={rules.ref}
            className={`cafe-animated-bg rounded-xl bg-tableWood-dark/55 backdrop-blur-sm border border-white/10 shadow-caféGlow p-3 sm:p-4 motion-reduce:transform-none ${rules.inView ? 'animate-[tutorialIn_650ms_ease-out_both]' : 'opacity-0 translate-y-3'}`}
          >
            <h3 className="text-amber-100 font-semibold text-base drop-shadow-sm">Rules & capturing</h3>
            <p className="mt-1 text-white/80 text-xs sm:text-sm leading-relaxed">
              Two ways to take cards: an exact match, or a sum.
            </p>
            <ul className="mt-2 text-white/90 text-sm leading-relaxed list-disc pl-4 space-y-1">
              <li>Pick a card from your hand.</li>
              <li>
                To capture, select table cards that add up to your card’s value, then press{' '}
                <span className="inline-flex items-center rounded-md bg-amber-200/10 px-1.5 py-0.5 text-amber-200 font-medium border border-amber-200/20">
                  Play Selected
                </span>
                .
              </li>
              <li>If there’s an exact single-card match, it takes priority.</li>
              <li>If no capture is available, your card is placed on the table.</li>
            </ul>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <figure className="rounded-lg overflow-hidden border border-white/10 bg-black/10 flex flex-col">
                <img
                  src="/assets/tutorial/single_capture.gif"
                  alt="Capturing a single matching card"
                  className="w-full max-w-[min(1100px,100%)] max-h-[clamp(320px,52vh,480px)] object-contain"
                  loading="lazy"
                />
                <figcaption className="px-2 py-1 text-xs text-white/85">
                  <span className="font-medium text-amber-100">Action:</span> Exact match capture
                  <span className="block text-white/75">Tap the matching table card → Play Selected</span>
                </figcaption>
              </figure>
              <figure className="rounded-lg overflow-hidden border border-white/10 bg-black/10 flex flex-col">
                <img
                  src="/assets/tutorial/multi_capture.gif"
                  alt="Capturing multiple cards by making a sum"
                  className="w-full max-w-[min(1100px,100%)] max-h-[clamp(320px,52vh,480px)] object-contain"
                  loading="lazy"
                />
                <figcaption className="px-2 py-1 text-xs text-white/85">
                  <span className="font-medium text-amber-100">Action:</span> Sum capture
                  <span className="block text-white/75">Select a set that adds up → Play Selected</span>
                </figcaption>
              </figure>
            </div>
          </div>

          <div
            ref={room.ref}
            className={`cafe-animated-bg rounded-xl bg-tableWood-dark/55 backdrop-blur-sm border border-white/10 shadow-caféGlow p-3 sm:p-4 motion-reduce:transform-none ${room.inView ? 'animate-[tutorialIn_650ms_120ms_ease-out_both]' : 'opacity-0 translate-y-3'}`}
          >
            <h3 className="text-amber-100 font-semibold text-base drop-shadow-sm">Create or join a room</h3>
            <p className="mt-1 text-white/80 text-xs sm:text-sm leading-relaxed">
              Rooms are shared with a short code—copy it and invite friends.
            </p>
            <ul className="mt-2 text-white/90 text-sm leading-relaxed list-disc pl-4 space-y-1">
              <li>
                Press{' '}
                <span className="inline-flex items-center rounded-md bg-amber-200/10 px-1.5 py-0.5 text-amber-200 font-medium border border-amber-200/20">
                  Create &amp; Join
                </span>{' '}
                to create a room and jump in.
              </li>
              <li>
                Paste a room code, then press{' '}
                <span className="inline-flex items-center rounded-md bg-amber-200/10 px-1.5 py-0.5 text-amber-200 font-medium border border-amber-200/20">
                  Join
                </span>
                .
              </li>
              <li>Use the clipboard button to copy the code and share it.</li>
            </ul>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <figure className="rounded-lg overflow-hidden border border-white/10 bg-black/10 flex flex-col">
                <img
                  src="/assets/tutorial/create.gif"
                  alt="Creating a game"
                  className="w-full max-w-[min(1100px,100%)] max-h-[clamp(320px,52vh,480px)] object-contain"
                  loading="lazy"
                />
                <figcaption className="px-2 py-1 text-xs text-white/85">
                  <span className="font-medium text-amber-100">Action:</span> Create a room
                  <span className="block text-white/75">Press Create &amp; Join</span>
                </figcaption>
              </figure>
              <figure className="rounded-lg overflow-hidden border border-white/10 bg-black/10 flex flex-col">
                <img
                  src="/assets/tutorial/join.gif"
                  alt="Joining a game"
                  className="w-full max-w-[min(1100px,100%)] max-h-[clamp(320px,52vh,480px)] object-contain"
                  loading="lazy"
                />
                <figcaption className="px-2 py-1 text-xs text-white/85">
                  <span className="font-medium text-amber-100">Action:</span> Join with a code
                  <span className="block text-white/75">Paste code → press Join</span>
                </figcaption>
              </figure>
            </div>
          </div>

          <div
            ref={profile.ref}
            className={`cafe-animated-bg rounded-xl bg-tableWood-dark/55 backdrop-blur-sm border border-white/10 shadow-caféGlow p-3 sm:p-4 motion-reduce:transform-none ${profile.inView ? 'animate-[tutorialIn_650ms_220ms_ease-out_both]' : 'opacity-0 translate-y-3'}`}
          >
            <h3 className="text-amber-100 font-semibold text-base drop-shadow-sm">Edit your profile</h3>
            <p className="mt-1 text-white/80 text-xs sm:text-sm leading-relaxed">
              Choose a nickname and avatar so your seat feels like yours.
            </p>
            <ul className="mt-2 text-white/90 text-sm leading-relaxed list-disc pl-4 space-y-1">
              <li>
                Press{' '}
                <span className="inline-flex items-center rounded-md bg-amber-200/10 px-1.5 py-0.5 text-amber-200 font-medium border border-amber-200/20">
                  Edit Profile
                </span>{' '}
                in the header.
              </li>
              <li>Choose an avatar, set a nickname, then save.</li>
              <li>Your profile shows up on your seat in-game.</li>
            </ul>

            <div className="mt-3">
              <figure className="rounded-lg overflow-hidden border border-white/10 bg-black/10 flex flex-col">
                <img
                  src="/assets/tutorial/editprofile.gif"
                  alt="Editing your profile"
                  className="w-full max-w-[min(1100px,100%)] max-h-[clamp(320px,52vh,480px)] object-contain"
                  loading="lazy"
                />
                <figcaption className="px-2 py-1 text-xs text-white/85">
                  <span className="font-medium text-amber-100">Action:</span> Edit your profile
                  <span className="block text-white/75">Pick avatar + nickname, then save</span>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
