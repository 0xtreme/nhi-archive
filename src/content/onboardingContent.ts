// Static copy for the onboarding layer (NHI-ARCH-ONB-001). All text
// lives here rather than in JSX so iteration is cheap and a future i18n
// pass just swaps the payload. Keep the tone closer to a Financial
// Times investigation than a History Channel documentary — see §3 of
// the spec on register.

import type { NetworkTier } from '../components-new/network/types';

export interface TrustedVoice {
  name: string;
  note: string;
}

export interface TimelineBeat {
  year: string;
  label: string;
  note: string;
}

export interface EvidenceItem {
  title: string;
  detail: string;
}

export interface EvidenceTier {
  tier: 1 | 2 | 3;
  label: string;
  sub: string;
  color: 'sky' | 'amber' | 'fog';
  blurb: string;
  items: EvidenceItem[];
}

export interface WitnessCard {
  id: string;
  name: string;
  role: string;
  credential: string;
  tier: NetworkTier;
  note: string;
}

export interface HandoffDoorway {
  title: string;
  pitch: string;
  href: string;
  accent: 'sky' | 'violet' | 'lime';
}

export const ONBOARDING_CONTENT = {
  hook: {
    eyebrow: 'JULY 26, 2023',
    headline:
      'A former U.S. intelligence officer placed his hand on a Bible and testified under oath to Congress.',
    body:
      "His name is David Charles Grusch. He told House Oversight that the U.S. government is in possession of non-human craft — and non-human bodies. His testimony was not dismissed. It triggered legislation. This is where we start.",
    deepLinkId: 'grusch_2023',
  },

  reframe: {
    eyebrow: 'THE STIGMA',
    headline:
      'If you grew up treating UFOs as a joke, your instincts were calibrated for a different era.',
    body:
      "Between 1969 and 2017, the U.S. government's official line was that there was nothing to investigate. In December 2017, that line broke. It has not been restored.",
    timeline: [
      { year: '1969', label: 'Project Blue Book closed',        note: 'Air Force ends its official UAP investigation. The topic goes cold for 48 years.' },
      { year: '1994', label: 'Condon Report cited as closure',  note: 'The 1968 Condon Report hardens the scientific stigma around anomalous phenomena.' },
      { year: 'Dec 2017', label: "NYT 'Glowing Auras & Black Money'", note: 'Reveals AATIP, a Pentagon program running since 2007. Three Navy videos authenticated.' },
      { year: 'Jul 2023', label: 'Grusch testifies to House',   note: 'First-ever whistleblower testimony under oath alleging non-human craft and biologics.' },
      { year: 'Nov 2024', label: 'Elizondo + Gallaudet hearings', note: 'Former AATIP director and Fmr. Oceanographer of the Navy testify. Legislation advances.' },
      { year: 'Feb 2026', label: 'Executive disclosure directive', note: '300-day window for DOD, ODNI, and contractors to declassify UAP records.' },
    ] as TimelineBeat[],
    trustedVoices: [
      { name: 'Sen. Harry Reid',        note: 'Architect of AATIP funding. Pushed disclosure until his death.' },
      { name: 'Barack Obama',           note: 'Publicly acknowledged the existence of unidentified aerial phenomena.' },
      { name: 'R. James Woolsey',       note: 'Former CIA director — opened the door on his view in the late 2010s.' },
      { name: 'Cmdr. David Fravor',     note: 'Commanded the Nimitz Tic Tac encounter. A Navy Commander, not a fringe figure.' },
      { name: 'Rep. Anna Paulina Luna', note: 'Co-chair of the House UAP task force. Conservative.' },
      { name: 'Rep. Tim Burchett',      note: 'Led the 2023 House Oversight hearings. Conservative.' },
    ] as TrustedVoice[],
  },

  evidence: {
    eyebrow: 'THE EVIDENCE',
    headline: 'Three tiers. Do not confuse them.',
    body:
      'Everything below is presented in graduated credibility. The strongest tier first, the most contested last. Where a claim is disputed, we say so plainly.',
    tiers: [
      {
        tier: 1,
        label: 'DOCUMENTED',
        sub: 'In the public record',
        color: 'sky',
        blurb: 'Facts the U.S. government has officially released, authenticated, or legislated around. These are not interpretations.',
        items: [
          { title: 'FLIR1 / Gimbal / GoFast',     detail: 'Three Navy videos of UAP encounters, authenticated by the DOD in April 2020.' },
          { title: 'AARO caseload > 2,000',       detail: 'The All-domain Anomaly Resolution Office has exceeded 2,000 active reports by 2026.' },
          { title: 'FY2024 NDAA · UAP Archive',   detail: 'Mandated a UAP Records Collection at the National Archives. Force of law.' },
          { title: 'FY2026 NDAA · three provisions', detail: 'Mandatory Congressional briefings on intercepts since 2004, classification guide audit, streamlined reporting.' },
        ],
      },
      {
        tier: 2,
        label: 'SWORN TESTIMONY',
        sub: 'Named, credentialed, under oath',
        color: 'amber',
        blurb: 'Individuals with verifiable institutional careers who testified to Congress under oath. Their claims are disputed by other agencies (AARO).',
        items: [
          { title: 'David Grusch (2023)',    detail: 'Fmr. NRO rep. to UAP Task Force. 14 years in intelligence.' },
          { title: 'Cmdr. David Fravor (2023)', detail: 'U.S. Navy (Ret.), 24-year career, commanded Nimitz 2004.' },
          { title: 'Lt. Ryan Graves (2023)', detail: 'Fmr. F/A-18 pilot. Documented regular UAP incursions 2014–15.' },
          { title: 'Luis Elizondo (2024)',   detail: 'Fmr. director of AATIP. Resigned in protest.' },
          { title: 'R. Adm. Tim Gallaudet (2024)', detail: 'Fmr. Oceanographer of the Navy. Testified on submerged UAP.' },
        ],
      },
      {
        tier: 3,
        label: 'CLAIMED · UNVERIFIED',
        sub: "Alleged, not yet established",
        color: 'fog',
        blurb: "Claims made by credible witnesses that have not been independently established. Track them, don't rely on them.",
        items: [
          { title: 'Crash-retrieval programs',  detail: 'Alleged by Grusch to exist outside Congressional oversight. Disputed by AARO.' },
          { title: 'Non-human biologics',        detail: 'Alleged material under unacknowledged programs. Not corroborated in public record.' },
          { title: 'Immaculate Constellation',   detail: 'A program name referenced in whistleblower statements. Existence not confirmed.' },
        ],
      },
    ] as EvidenceTier[],
  },

  cast: {
    eyebrow: 'THE CAST',
    headline: 'These are not fringe figures.',
    body:
      'Pilots, admirals, intelligence officers, policy architects. The people you trust to handle nuclear weapons, run classified programs, and fly your president.',
    cards: [
      { id: 'grusch_2023',    name: 'David Grusch',        role: 'Fmr. NRO rep., UAP Task Force',  tier: 'witness',  credential: '14 years in intelligence',   note: 'First-ever whistleblower testimony under oath.' },
      { id: 'fravor_nimitz',  name: 'Cmdr. David Fravor',  role: 'U.S. Navy (Ret.), Nimitz 2004',  tier: 'witness',  credential: '24-year Navy career',         note: 'Commanded the Tic Tac encounter, November 2004.' },
      { id: 'graves_fa18',    name: 'Lt. Ryan Graves',     role: 'Fmr. F/A-18 pilot',              tier: 'witness',  credential: 'ATFLIR encounters 2014–15',   note: 'Founded Americans for Safe Aerospace.' },
      { id: 'elizondo_aatip', name: 'Luis Elizondo',       role: 'Fmr. AATIP director',            tier: 'witness',  credential: 'DOD · CI specialist',         note: 'Led AATIP before resigning in protest.' },
      { id: 'gallaudet_navy', name: 'R. Adm. Tim Gallaudet', role: 'Fmr. Oceanographer of the Navy', tier: 'witness', credential: 'Flag officer · meteorologist', note: 'Testified on submerged UAP, November 2024.' },
      { id: 'mellon_osd',     name: 'Chris Mellon',        role: 'Fmr. Dep. Asst. Sec. of Defense', tier: 'witness', credential: 'Architect of current disclosure legislation', note: 'Principal policy hand across the post-2017 moment.' },
    ] as WitnessCard[],
  },

  handoff: {
    eyebrow: 'THE HANDOFF',
    headline: "You've got the basics. The archive is where the details live.",
    body: 'Pick the first thread you want to pull. No account. No gate.',
    doorways: [
      { title: 'Walk the timeline',   pitch: '1947 to 2026. Every major public event, in order. Best if you want the full historical arc.',                       href: '#/archive?view=timeline',  accent: 'sky' },
      { title: 'See the network',     pitch: 'Portrait map of the witnesses, officials, and advocates. Best if you want to see how the people connect.',          href: '#/archive?view=network',   accent: 'violet' },
      { title: 'Scan the map',        pitch: 'Nimitz, Rendlesham, Varginha, Aguadilla. Best if you think geographically.',                                         href: '#/archive?view=map',       accent: 'lime' },
    ] as HandoffDoorway[],
    exit: 'Or just start exploring →',
    exitHref: '#/archive',
  },
};

export type OnboardingContent = typeof ONBOARDING_CONTENT;
