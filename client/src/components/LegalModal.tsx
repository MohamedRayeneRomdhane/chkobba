/* eslint-disable prettier/prettier */
/* eslint linebreak-style: 0 */
import React from 'react';

export type LegalSection = 'privacy' | 'terms' | 'contact';

type Props = {
  open: boolean;
  section: LegalSection;
  onClose: () => void;
};

function SectionTitle({ section }: { section: LegalSection }) {
  if (section === 'privacy') return <>Privacy</>;
  if (section === 'terms') return <>Terms</>;
  return <>Contact</>;
}

export default function LegalModal({ open, section, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative w-[92vw] max-w-[860px] mx-auto rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-amber-100 to-amber-50 border-b border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-300 text-amber-900 shadow-inner">
              ☕
            </span>
            <h2 className="text-base sm:text-lg font-semibold text-amber-900">
              <SectionTitle section={section} />
            </h2>
          </div>
          <button
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-700 hover:bg-gray-100 border border-gray-200"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5 sm:py-6 text-sm text-gray-800">
          {section === 'privacy' && (
            <div className="space-y-3">
              <p>
                Chkobba Café is a casual multiplayer card game. This page explains what data we
                store and what third parties may collect when ads are enabled.
              </p>

              <div>
                <div className="font-semibold text-gray-900">What we store</div>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Profile info you choose: nickname and avatar selection.</li>
                  <li>Cookie consent choice (accept/decline) to remember your preference.</li>
                </ul>
              </div>

              <div>
                <div className="font-semibold text-gray-900">Ads (Google AdSense)</div>
                <p className="mt-1 text-gray-700">
                  If you accept cookies, we may load Google AdSense which can set cookies and
                  collect information to personalize or measure ads. If you decline, ads won’t be
                  loaded.
                </p>
                <p className="mt-2 text-gray-700">
                  Learn more:
                  <a
                    href="https://policies.google.com/technologies/partner-sites"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline ml-1"
                  >
                    How Google uses data
                  </a>
                  .
                </p>
              </div>

              <div>
                <div className="font-semibold text-gray-900">Bug reports</div>
                <p className="mt-1 text-gray-700">
                  If you submit a bug report via the linked form, the information you provide is
                  sent to that form provider.
                </p>
              </div>

              <div>
                <div className="font-semibold text-gray-900">Your choices</div>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>You can decline cookies and continue playing.</li>
                  <li>You can change your choice anytime via the “Cookies” link in the footer.</li>
                </ul>
              </div>

              <p className="text-xs text-gray-600">Last updated: 2026-01-05</p>
            </div>
          )}

          {section === 'terms' && (
            <div className="space-y-3">
              <p>
                Chkobba Café is provided for friendly games. By using the site, you agree to these
                basic terms.
              </p>

              <div>
                <div className="font-semibold text-gray-900">Fair play</div>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>No cheating, harassment, or disruptive behavior.</li>
                  <li>Rooms are meant for private play with friends.</li>
                </ul>
              </div>

              <div>
                <div className="font-semibold text-gray-900">No gambling</div>
                <p className="mt-1 text-gray-700">
                  This is a skill-and-luck card game with no real-money wagering.
                </p>
              </div>

              <div>
                <div className="font-semibold text-gray-900">Availability</div>
                <p className="mt-1 text-gray-700">
                  The service is provided “as is”. We may change features or take the site offline
                  for maintenance.
                </p>
              </div>

              <p className="text-xs text-gray-600">Last updated: 2026-01-05</p>
            </div>
          )}

          {section === 'contact' && (
            <div className="space-y-3">
              <p>
                Need help or found a bug? Use the bug report form and include your room code if
                relevant.
              </p>
              <p>
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSfLcCluvvArOvjqTdahD5npxS06vpVmkGn2MYSzKWGe7ud3QA/viewform?usp=dialog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Open bug report form
                </a>
              </p>
              <p className="text-xs text-gray-600">Last updated: 2026-01-05</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200">
          <button
            className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
