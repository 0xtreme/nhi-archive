// Static copy for the onboarding layer. Kept in one file so we can
// edit voice without grepping through JSX. Tone: blunt, short,
// reads-it-to-you. Try not to sound like a press release.

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
      'A former intelligence officer swore under oath that the U.S. government has non-human craft.',
    body:
      "His name is David Grusch. 14 years in intelligence, last posting the National Reconnaissance Office. He said it to House Oversight with his hand on a Bible. Congress didn't laugh him out of the room — they wrote new law off the back of it.",
    deepLinkId: 'grusch_2023',
  },

  reframe: {
    eyebrow: 'WHY YOU HAVEN\'T HEARD ABOUT THIS',
    headline:
      'For 48 years the official answer was: nothing to see.',
    body:
      "That line broke in December 2017, when the New York Times ran a story about a Pentagon UFO program nobody was supposed to know existed. It has not been restored since. Everything below is the catch-up.",
    timeline: [
      { year: '1969',     label: 'Blue Book closed',            note: "The Air Force's 20-year UFO study shuts down. Official stance: nothing to investigate. The topic goes cold." },
      { year: '1994',     label: 'Scientists pile on',          note: 'The Condon Report is cited to close the door a second time. Careers that touched UFOs do not recover.' },
      { year: 'Dec 2017', label: 'NYT breaks AATIP',            note: 'A Pentagon program running since 2007 is exposed. Three Navy videos are released and authenticated.' },
      { year: 'Jul 2023', label: 'Grusch on the stand',         note: "First whistleblower testimony under oath. He names names — programs, contractors. AARO disputes him. Congress doesn't back off." },
      { year: 'Nov 2024', label: 'Elizondo + Gallaudet',        note: 'The former head of AATIP and a retired Navy admiral testify. More legislation follows.' },
      { year: 'Feb 2026', label: 'The disclosure directive',    note: 'The President gives DOD, ODNI, and contractors 300 days to declassify UAP records. Largest single move on the record.' },
    ] as TimelineBeat[],
    trustedVoices: [
      { name: 'Sen. Harry Reid',        note: 'Senate Majority Leader. Funded AATIP in 2007. Spent the rest of his life pushing disclosure.' },
      { name: 'Barack Obama',           note: 'Two-term president. On the record that the footage is real and we don\'t know what it is.' },
      { name: 'R. James Woolsey',       note: 'Former CIA director. Told a reporter in 2020 he no longer thinks the topic is nonsense.' },
      { name: 'Cmdr. David Fravor',     note: 'Navy Commander. Flew the Tic Tac encounter. If he tells you what he saw, you do not get to call him a kook.' },
      { name: 'Rep. Anna Paulina Luna', note: 'Co-chairs the House UAP task force. Conservative Republican.' },
      { name: 'Rep. Tim Burchett',      note: 'Ran the 2023 Oversight hearings. Conservative Republican.' },
    ] as TrustedVoice[],
  },

  evidence: {
    eyebrow: 'WHAT THERE ACTUALLY IS',
    headline: 'Three piles. Keep them separate.',
    body:
      "Everything that gets called 'evidence' on this topic collapses into one of three categories. The first two are solid. The third is interesting but not proven. Don't confuse them.",
    tiers: [
      {
        tier: 1,
        label: 'DOCUMENTED',
        sub: 'Already in the record',
        color: 'sky',
        blurb: 'Government-authenticated, government-released, or government-mandated. Nobody serious disputes that these exist.',
        items: [
          { title: 'FLIR1 · Gimbal · GoFast',        detail: 'Three Navy videos of UAP encounters. Authenticated by the DOD in April 2020.' },
          { title: 'AARO caseload > 2,000',          detail: "The Pentagon's current UAP office has over 2,000 cases on the books as of 2026." },
          { title: 'FY2024 NDAA · UAP archive',      detail: 'Law requires the National Archives to house a UAP records collection.' },
          { title: 'FY2026 NDAA · three provisions', detail: 'Mandatory briefings to Congress on every intercept since 2004. Classification audit. Standardised reporting.' },
        ],
      },
      {
        tier: 2,
        label: 'SWORN',
        sub: 'Said under oath by real people',
        color: 'amber',
        blurb: 'Named individuals with verifiable careers told Congress these things. AARO disputes parts of it. They are still on the record.',
        items: [
          { title: 'David Grusch (2023)',          detail: 'Fmr. NRO rep. to the UAP Task Force. 14 years in intelligence.' },
          { title: 'Cmdr. David Fravor (2023)',    detail: 'Ret. Navy. 24-year career. Saw the Tic Tac.' },
          { title: 'Lt. Ryan Graves (2023)',       detail: 'Ret. F/A-18 pilot. Saw UAP almost daily off the Atlantic coast, 2014–15.' },
          { title: 'Luis Elizondo (2024)',         detail: 'Ran AATIP. Quit and said why.' },
          { title: 'R. Adm. Tim Gallaudet (2024)', detail: 'Ret. Navy flag officer. Former Navy oceanographer. Testified on objects entering the water.' },
        ],
      },
      {
        tier: 3,
        label: 'ALLEGED',
        sub: 'Claimed, not proven',
        color: 'fog',
        blurb: "Credible people say these things exist. The public record does not yet confirm them. Treat as live leads, not settled facts.",
        items: [
          { title: 'Crash-retrieval programs',    detail: 'Grusch says they exist and sit outside congressional oversight. AARO says they don\'t. Both sides are still talking.' },
          { title: 'Non-human biologics',         detail: 'Referenced in testimony. No corroborating material in the public record.' },
          { title: 'Immaculate Constellation',    detail: 'A program name that shows up in whistleblower statements. Existence unconfirmed.' },
        ],
      },
    ] as EvidenceTier[],
  },

  cast: {
    eyebrow: 'THE PEOPLE TALKING',
    headline: 'These are not cranks.',
    body:
      "You know the people in this list well enough to have trusted them with classified briefings, fighter jets, or the budget of a Pentagon program. You do not get to dismiss them now because the subject became inconvenient.",
    cards: [
      { id: 'grusch_2023',    name: 'David Grusch',          role: 'Fmr. NRO rep., UAP Task Force', tier: 'witness', credential: '14 years, intelligence',          note: 'First whistleblower to testify under oath.' },
      { id: 'fravor_nimitz',  name: 'Cmdr. David Fravor',    role: 'Ret. Navy, Nimitz 2004',        tier: 'witness', credential: '24-year Navy career',             note: 'Flew the Tic Tac encounter and said what he saw.' },
      { id: 'graves_fa18',    name: 'Lt. Ryan Graves',       role: 'Ret. F/A-18 pilot',             tier: 'witness', credential: 'ATFLIR encounters · 2014–15',     note: 'Now runs Americans for Safe Aerospace.' },
      { id: 'elizondo_aatip', name: 'Luis Elizondo',         role: 'Fmr. AATIP director',           tier: 'witness', credential: 'DOD counterintelligence',         note: 'Led the program. Quit. Went public.' },
      { id: 'gallaudet_navy', name: 'R. Adm. Tim Gallaudet', role: 'Ret. Navy oceanographer',       tier: 'witness', credential: 'Flag officer',                    note: 'Testified on submerged UAP in November 2024.' },
      { id: 'mellon_osd',     name: 'Chris Mellon',          role: 'Fmr. Dep. Asst. Sec. Defense',  tier: 'witness', credential: 'Architect of disclosure law',     note: 'The policy hand behind most of the post-2017 moves.' },
    ] as WitnessCard[],
  },

  handoff: {
    eyebrow: 'OVER TO YOU',
    headline: "Pick a thread. The archive has the rest.",
    body: "Three doors in. No account, no email, no gate. You can leave at any time.",
    doorways: [
      { title: 'The timeline',  pitch: "What happened, when. 1947 to now.",                                     href: '#/archive?view=timeline', accent: 'sky'    },
      { title: 'The network',   pitch: "Who knows who. Portrait map of the people in all of this.",             href: '#/archive?view=network',  accent: 'violet' },
      { title: 'The map',       pitch: "Where it happened. Nimitz, Rendlesham, Varginha, Aguadilla.",           href: '#/archive?view=map',      accent: 'lime'   },
    ] as HandoffDoorway[],
    exit: 'Or just start exploring →',
    exitHref: '#/archive',
  },
};

export type OnboardingContent = typeof ONBOARDING_CONTENT;
