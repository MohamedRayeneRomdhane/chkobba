/* The site's consent UI is now rendered by Google Funding Choices (configured in
   AdSense → Privacy & messaging). This component remains as a no-op shim so existing
   imports still work without a wider refactor. */

type Props = {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onLearnMore: () => void;
};

export default function CookieConsentBanner(_props: Props) {
  return null;
}
