import { Card, TeamIndex } from "../../../shared/types";

function isDiamond(card: Card) { return card.suit === "diamonds"; }
function isSeven(card: Card) { return card.rank === "7"; }
function isSix(card: Card) { return card.rank === "6"; }

export interface RoundScore {
  teamPoints: [number, number];
  details: {
    mostCards?: TeamIndex;
    mostDiamonds?: TeamIndex;
    mostSevens?: TeamIndex | "tie";
    sevenDiamonds?: TeamIndex;
    chkobba: [number, number];
  };
}

export function computeRoundScore(
  capturesByTeam: [Card[], Card[]],
  chkobbaByTeam: [number, number]
): RoundScore {
  const [t0, t1] = capturesByTeam;
  let p0 = 0, p1 = 0;
  const details: RoundScore["details"] = { chkobba: [...chkobbaByTeam] as [number, number] };

  // most captured cards
  if (t0.length !== t1.length) {
    const w: TeamIndex = t0.length > t1.length ? 0 : 1;
    details.mostCards = w;
    if (w === 0) p0 += 1; else p1 += 1;
  }

  // most diamonds
  const d0 = t0.filter(isDiamond).length;
  const d1 = t1.filter(isDiamond).length;
  if (d0 !== d1) {
    const w: TeamIndex = d0 > d1 ? 0 : 1;
    details.mostDiamonds = w;
    if (w === 0) p0 += 1; else p1 += 1;
  }

  // most 7s; tie-break with 6s
  const s0 = t0.filter(isSeven).length;
  const s1 = t1.filter(isSeven).length;
  if (s0 !== s1) {
    const w: TeamIndex = s0 > s1 ? 0 : 1;
    details.mostSevens = w;
    if (w === 0) p0 += 1; else p1 += 1;
  } else if (s0 === s1 && s0 > 0) {
    const six0 = t0.filter(isSix).length;
    const six1 = t1.filter(isSix).length;
    if (six0 !== six1) {
      const w: TeamIndex = six0 > six1 ? 0 : 1;
      details.mostSevens = w;
      if (w === 0) p0 += 1; else p1 += 1;
    } else {
      details.mostSevens = "tie";
    }
  }

  // capture of 7♦
  const sevenDiamondCapturedBy0 = t0.some((c) => c.rank === "7" && c.suit === "diamonds");
  const sevenDiamondCapturedBy1 = t1.some((c) => c.rank === "7" && c.suit === "diamonds");
  if (sevenDiamondCapturedBy0 !== sevenDiamondCapturedBy1) {
    const w: TeamIndex = sevenDiamondCapturedBy0 ? 0 : 1;
    details.sevenDiamonds = w;
    if (w === 0) p0 += 1; else p1 += 1;
  }

  // chkobba points
  p0 += chkobbaByTeam[0];
  p1 += chkobbaByTeam[1];

  return { teamPoints: [p0, p1], details };
}
