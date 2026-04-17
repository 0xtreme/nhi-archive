"""Deep claim extraction for FINAL 16 videos (83-98)."""
from __future__ import annotations
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _extract_v1_builders import (
    src, claim, edge, person, incident, technology, concept, document,
    event, program, location, phenomenon
)
from _extract_helpers import write_output


def extend(vid, new_entities, claims_data):
    path = Path(__file__).parent / "entities" / f"{vid}.json"
    existing = json.loads(path.read_text())
    nodes = list(existing["nodes"]); edges_list = list(existing["edges"])
    ids = {n["id"] for n in nodes}
    def S(t=0, q=""): return [src(vid, t, None, q)]
    for e in new_entities:
        if e["id"] not in ids:
            nodes.append(e); ids.add(e["id"])
    for slug, t, stmt, asserter, assertability, subs, quote in claims_data:
        cl = claim(slug, stmt, asserter, vid, t, assertability, subs, S(t, quote), quote=quote)
        nodes = [n for n in nodes if n["id"] != cl["id"]]; ids.discard(cl["id"])
        nodes.append(cl); ids.add(cl["id"])
        edges_list.append(edge(asserter, cl["id"], "ASSERTED", S(t, stmt[:200]), 0.95))
        edges_list.append(edge(f"video-{vid}", cl["id"], "REFERENCES", S(t), 0.95))
        for subj in subs:
            if subj != asserter and subj != f"video-{vid}":
                edges_list.append(edge(cl["id"], subj, "REFERENCES", S(t), 0.85))
    out = {"video_id": vid, "nodes": nodes, "edges": edges_list}
    write_output(out, vid)
    print(f"  {vid}: {len(nodes)} nodes, {len(edges_list)} edges")


def P(slug, label, vid, t, quote, summary, aliases=None, prof="", notability=None):
    return person(slug, label, [src(vid, t, None, quote)], summary=summary,
                  aliases=aliases or [], profession=prof, notability=notability or [])


# V83 lbGE3EC6StE — Villarroel part 2 (Baltic USO)
VID83 = "lbGE3EC6StE"
entities_83 = [
    P("halton-arp", "Halton Arp", VID83, 25,
      "Astronomer who found non-cosmological redshifts",
      "American astronomer; found pairs of galaxies exchanging gas with completely different redshifts — challenging the standard cosmological-distance interpretation of redshift. Marginalized by mainstream astronomy.",
      ["Arp", "Heltonarp"], "astronomer",
      ["astronomer", "heretic"]),
    concept("non-cosmological-redshift", "Non-Cosmological (Anomalous) Redshift", "physics",
        [src(VID83, 27, "Arp's anomalous redshift discoveries")],
        summary="Halton Arp's observations of interacting galaxy pairs with discordant redshifts — contradicting the Doppler-expansion framework that underlies the Big Bang. Villarroel was fascinated by this in her youth."),
    incident("baltic-sea-burned-biological-material", "Baltic Coast 'Crashed UFO' Burned Biological Material", "crash_retrieval", "2020-01-01",
        [src(VID83, 7, "Swedish coast object covered in burned biological material")],
        summary="Alleged crashed UFO / artificial structure off the Swedish coast covered in burned biological material. Hard to sample — even scientists claiming it was 'just a rock' never actually studied physical samples. Villarroel argues this is possibly the best-candidate non-human artifact available for analysis."),
]
claims_83 = [
    ("villarroel-baltic-artifact-worth-study", 7,
     "Per Villarroel: the alleged Swedish-coast crashed structure — covered in burned biological material, sliding into the ocean — may be the best-candidate non-human artifact available for scientific analysis. Scientists claiming 'it's just a rock' never actually studied samples.",
     "person-beatriz-villarroel", "on_record_statement",
     ["person-beatriz-villarroel", "incident-baltic-sea-burned-biological-material",
      "incident-2011-baltic-sea-anomaly"],
     "There's something that looks like it has been sliding into the ocean. They found this thing that looked like a crashed UFO covered in burned biological material. The scientists who had claimed it was just a rock never studied the actual samples. There's no paper and no open data."),
    ("villarroel-flying-saucer-cats-child-essay", 15,
     "Villarroel's charming backstory: at age 6-7 she had already written and illustrated a small essay about 'cats in flying saucers' — her UAP interest is life-long.",
     "person-beatriz-villarroel", "personal_account",
     ["person-beatriz-villarroel"],
     "When I was six or seven I had written a small little essay about cats in flying saucers. I still like cats as well."),
    ("villarroel-arp-anomalous-redshift-inspiration", 25,
     "Villarroel was fascinated by Halton Arp's non-cosmological redshift discoveries — interacting galaxy pairs with discordant redshifts challenging Big Bang cosmology. 'The verdict on redshifts is still out.'",
     "person-beatriz-villarroel", "personal_account",
     ["person-beatriz-villarroel", "person-halton-arp", "concept-non-cosmological-redshift"],
     "I was so influenced and fascinated by Halton Arp. He found couples of galaxies exchanging gas but they had completely different redshifts. The verdict on redshifts is still out."),
]

# V84 h0hAit-KH9A — WSJ UFO fact-check
VID84 = "h0hAit-KH9A"
entities_84 = [
    P("joel-shectman", "Joel Shectman", VID84, 62,
      "Wall Street Journal reporter behind disinformation UFO article",
      "Wall Street Journal reporter who authored 'The Pentagon Disinformation That Fueled America's UFO Mythology' — an article Jesse argues is itself part of disinformation. Same reporter also wrote piece against scoop on Chinese COVID vaccine marginalization.",
      ["Shectman", "Shman"], "journalist",
      ["journalist", "WSJ"]),
    P("susan-goff", "Susan Goff", VID84, 46,
      "Pentagon PR; Booz Allen psyops consulting practice lead",
      "Pentagon public affairs officer. Per LinkedIn and independent sources: held lead role in Booz Allen Hamilton's psychological operations consulting practice for DoD. Self-listed skills include 'strategic communication and psychological operations.' Primary source for the WSJ UFO article.",
      ["Goff"], "official",
      ["Pentagon", "psyops"]),
    P("merrick-von-rennenkampff", "Merrick von Rennenkampff", VID84, 70,
      "Journalist; debunker of EMP-nukes-shutdown WSJ argument",
      "Journalist and former DoD employee; eloquently pointed out that the WSJ's 'EMP on our own nuclear weapons' theory is physically implausible — 60-foot science experiment cannot be moved to the front gate of an alert missile facility undetected.",
      ["von Rennenkampff"], "journalist",
      ["journalist", "DoD"]),
    P("john-mills-malmstrom-1993", "John Mills", VID84, 58,
      "1993 Malmstrom missile technician UFO witness",
      "Missile technician stationed at Malmstrom in 1993; saw UFOs en route back to base; the base had been 'swarmed' when he returned.",
      ["Mills"], "military veteran",
      ["witness", "Malmstrom", "USAF"]),
    document("wsj-pentagon-disinformation-article", "WSJ 'Pentagon Disinformation' UFO Article", "broadcast",
        [src(VID84, 44, "WSJ article dismissing UFOs as EMP experiments + hazing rituals")],
        summary="WSJ article by Joel Shectman titled 'The Pentagon Disinformation That Fueled America's UFO Mythology.' Claims UFOs are 'entirely explained by' Air Force EMP experiments on own nuclear missiles plus hazing rituals. Jesse and Robert Salas argue this IS the disinformation.",
        author="Joel Shectman"),
]
claims_84 = [
    ("wsj-primary-source-booz-allen-psyops", 46,
     "The WSJ UFO article's primary source, Susan Goff, held a lead role in Booz Allen Hamilton's psychological operations consulting practice for DoD — she self-listed 'psychological operations' as a skill. Article is itself psyop.",
     "person-jesse-michels", "cited_from_document",
     ["person-susan-goff", "document-wsj-pentagon-disinformation-article",
      "person-joel-shectman"],
     "One of the article's primary sources is Susan Goff, whose own LinkedIn confirms her lead role in Booz Allen Hamilton's psychological operations consulting practice for the Department of Defense. Her self-professed skills include strategic communication and psychological operations."),
    ("salas-wsj-emp-implausible", 66,
     "Robert Salas on the WSJ EMP theory: 'It would have been irresponsible and unthinkable for the US Air Force to jeopardize the operational status of these weapons. The EMP generator equipment would have involved a prolonged installation process in plain sight of our security team.'",
     "person-robert-salas", "personal_account",
     ["person-robert-salas", "document-wsj-pentagon-disinformation-article"],
     "It would have been irresponsible and unthinkable for the US Air Force to jeopardize the operational status of these weapons. The EMP generator equipment would have involved a prolonged installation process in plain sight of our security team."),
    ("emp-not-operational-until-1970s", 70,
     "EMPs as directed weapons weren't even operational until the 1970s — WSJ's claim that a 1967 Malmstrom EMP experiment shut down 10 nuclear missiles is technologically anachronistic.",
     "person-jesse-michels", "on_record_statement",
     ["document-wsj-pentagon-disinformation-article", "incident-1967-malmstrom-missiles"],
     "EMPs weren't even a thing until the 70s, and no documents have ever suggested that the US has ever used them against our own active nuclear weapons with people in the vicinity."),
    ("rennenkampff-60ft-science-experiment-undetected", 70,
     "Merrick von Rennenkampff's refutation: WSJ suggests technicians moved a 60-foot science experiment to the front gate of an alert missile facility undetected. This is physically impossible — security team would have seen it.",
     "person-jesse-michels", "cited_from_document",
     ["person-merrick-von-rennenkampff", "document-wsj-pentagon-disinformation-article"],
     "As Merrick tweeted, the Wall Street Journal is suggesting that technicians somehow moved a 60-foot science experiment up to the front gate of an alert missile facility undetected and then they fried the active nukes. This is a joke, right?"),
    ("mills-malmstrom-1993-base-swarmed", 58,
     "John Mills, Malmstrom missile technician, saw UFOs returning to base in 1993; officers there said the base had been 'swarmed' — demonstrating pattern continues decades after Salas' 1967 event.",
     "person-jesse-michels", "cited_from_document",
     ["person-john-mills-malmstrom-1993", "location-malmstrom-afb"],
     "In 1993, a missile technician named John Mills stationed at Malmstrom also saw UFOs on his way back to the base. When he returned, officers there said the base had been swarmed."),
]

# V85 1iaH1a3A4Lk — Mick West debate
VID85 = "1iaH1a3A4Lk"
entities_85 = [
    P("mick-west", "Mick West", VID85, 85,
      "Retired video-game programmer; Metabunk debunker",
      "Retired video-game programmer who became a prominent UFO debunker via Metabunk.org (started 2007, UFO-focused since 2016-2017). Expertise in plane-tracking, image analysis, conspiracy-debunking. Controversial in UFO community but 'doing an honest job per Jesse.'",
      ["West"], "debunker",
      ["debunker", "skeptic"]),
    P("merrick-von-rennenkampff-extended", "Merrick von Rennenkampff (extended)", VID85, 85,
      "Pro-UAP-investigation journalist; former DoD employee",
      "Former DoD employee and journalist writing for The Hill on UAP topics. Took UAP seriously after 2019 Rogan-Fravor interview — 'as soon as you watched 5 minutes of Fravor, this guy's the real deal.' Originally corresponded with Mick West as a skeptic-advocate.",
      ["Rennenkampff"], "journalist",
      ["journalist", "DoD"]),
    document("metabunk-org", "Metabunk.org", "broadcast",
        [src(VID85, 107, "Mick West's conspiracy-investigation forum")],
        summary="Mick West's online forum started ~2007 as Chemtrails conspiracy investigation; pivoted toward UFO-focused content ~2016-2017. Includes 9/11, flat-earth, false-flag and UAP debunking threads.",
        author="Mick West"),
    event("2016-chilean-navy-ufo-video", "2016 Chilean Navy UFO Video", "publication", "2016-11-01",
        [src(VID85, 109, "Chilean Navy thermal video released by Alyssa Keane 2016-2017 Huffington Post")],
        summary="Chilean Navy UFO video released by Alyssa Keane in Huffington Post in 2016/2017. Mick West's first high-profile UFO-video analysis."),
]
claims_85 = [
    ("west-chemtrails-to-ufo-pivot", 107,
     "Mick West's investigation trajectory: started with Wikipedia edits (~18 years ago); chemtrails conspiracy debunking on blog; Metabunk.org forum evolved toward UFO focus in 2016-2017 around the Chilean Navy video case.",
     "person-mick-west", "personal_account",
     ["person-mick-west", "document-metabunk-org"],
     "I was on Wikipedia messing around with the chemtrail conspiracy theory. That blog kind of evolved into my current site metabunk.org. It really kind of took off in 2016 or 2017 with this case from Chile — Chilean Navy video."),
    ("rennenkampff-fraver-moment-of-conversion", 97,
     "von Rennenkampff's UAP-conversion moment: 2019 Rogan-Fravor interview. As former DoD with Navy aviator experience, 'as soon as I watched five minutes of Fravor, this guy's the real deal' — plus 3 other aviators corroborating.",
     "person-merrick-von-rennenkampff-extended", "personal_account",
     ["person-merrick-von-rennenkampff-extended", "person-david-fravor"],
     "I previously worked at the Pentagon. I worked with some naval aviators. As soon as I watched five minutes of Fravor, this guy's the real deal. Skipper of a storied squadron. Three other aviators out there. That was my ticket down the rabbit hole."),
    ("west-wrong-on-his-own-theories", 99,
     "von Rennenkampff: 'The deeper I dug into Mick's theories — from my perspective he was wrong about a lot of his theories. The deeper we dug, I'm like — there's something to this.' Dig through Mick's explanations strengthened his pro-investigation conviction.",
     "person-merrick-von-rennenkampff-extended", "personal_account",
     ["person-merrick-von-rennenkampff-extended", "person-mick-west"],
     "The deeper I dug into Mick's theories, from my perspective, he was wrong about a lot of his theories. And the deeper we dug, I'm like, my goodness, there's something to this."),
    ("jesse-west-stigma-challenge", 83,
     "Jesse challenges Mick West: 'The stigma that you promote is a big part of why they don't want to come out. These guys are fighting a stigma. I encourage them to come forward.' Frames Mick as accountable for the disclosure-suppression pattern.",
     "person-jesse-michels", "on_record_statement",
     ["person-mick-west", "concept-stigma-weaponization"],
     "You're very familiar with this theory of mine, America — the stigma that you promote is a big part of why they don't want to come out. These guys are fighting a stigma. I encourage them to come forward."),
]

# V86 q7Czo77qhHA — Big Pharma origins + UFOs
VID86 = "q7Czo77qhHA"
entities_86 = [
    P("brigham-buhler", "Brigham Buhler", VID86, 143,
      "Healthcare entrepreneur; founder Ways to Well",
      "American healthcare entrepreneur; founder of Ways to Well; pharma-industry insider exposing big-pharma corporate-capture of American healthcare system.",
      ["Buhler", "Bigham Buer"], "entrepreneur",
      ["entrepreneur", "healthcare", "whistleblower"]),
    P("john-d-rockefeller", "John D. Rockefeller", VID86, 132,
      "Standard Oil founder; architect of US pharmaceutical monopoly",
      "Richest man on earth via Standard Oil (now Exxon Mobile). Per Buhler: used Flexner Report (1910) to monopolize American medicine — shutting down half of US medical schools and promoting petrochemical-derived synthetic pharma.",
      ["Rockefeller"], "industrialist",
      ["industrialist", "historical"]),
    P("abraham-flexner", "Abraham Flexner", VID86, 134,
      "Author of the 1910 Flexner Report; set up AMA and FDA",
      "American educator; author of 1910 Flexner Report that condemned most American medical schools (~50% shut down). Per Buhler: founded the AMA and FDA on behalf of the Rockefeller Foundation (1908).",
      ["Flexner"], "educator",
      ["historical", "pharma"]),
    document("flexner-report-1910", "Flexner Report (1910)", "report",
        [src(VID86, 134, "1910 Carnegie/Rockefeller-backed report that shut down half of US medical schools")],
        summary="Abraham Flexner's 1910 report condemning most American medical schools, especially those teaching anything other than drug-based symptom-focused treatment. Backed by Rockefeller and Carnegie. Over half of US medical schools shut down; AMA becomes enforcer. Birth of modern US pharmaceutical system.",
        author="Abraham Flexner", year=1910),
    concept("sick-care-vs-health-care", "Sick-Care System vs Healthcare", "politics",
        [src(VID86, 143, "System designed to turn illness into profit")],
        summary="Buhler/Jesse framing: the modern US healthcare system is 'sick care' — turning illness into profit — engineered by Rockefeller-Flexner consolidation. Natural medicine and osteopath practices were 20-30% of doctors pre-1910; shut down because they couldn't scale patentable profits."),
    concept("blanket-of-deception-health-ufo", "Blanket-of-Deception Parallel (Health / UFO)", "politics",
        [src(VID86, 127, "Jesse's framing: same blanket hides UFO truth and health truth")],
        summary="Jesse's framing: the same suppression-blanket used by 'secret government programs in big business' to hide UFO truths has been used to disguise the truth about health — the 'classified breakthroughs in science and medicine' are adjacent to the classified UFO breakthroughs."),
]
claims_86 = [
    ("flexner-report-1910-shutdown-schools", 134,
     "1910 Flexner Report (Carnegie + Rockefeller funded, authored by Abraham Flexner) condemned most American medical schools teaching non-pharma approaches — over HALF of US medical schools shut down. AMA became enforcer. Birth of modern pharma system.",
     "person-brigham-buhler", "cited_from_document",
     ["person-brigham-buhler", "person-abraham-flexner", "person-john-d-rockefeller",
      "document-flexner-report-1910"],
     "In 1910, with backing from Rockefeller and fellow titan Andrew Carnegie, the Flexner report was released. Written by Abraham Flexner, it condemned most of America's medical schools. Over half the medical schools in the United States shut down. The AMA became the enforcer."),
    ("buhler-brown-brothers-cap-table", 139,
     "Buhler: the same investment firm that funded CIA formation — Brown Brothers Harriman — had the same people on the cap table of the Federal Reserve in the 1913 Payne-Aldrich Act. Pharma, CIA, and Fed share founding capital.",
     "person-brigham-buhler", "cited_from_document",
     ["person-brigham-buhler"],
     "The investment firm that funded the CIA basically formed it — a lot of the personnel came out of it — was called the Brown Brothers Harriman. Same people are on the cap table of that. Same people were on the cap table of the Federal Reserve in the 1913 Payne Aldrich Act. It's the same people."),
    ("buhler-20-30-percent-natural-medicine-pre-1910", 141,
     "Before 1910 Flexner Report: 20-30% of US doctors were osteopaths, homeopaths, and natural-medicine practitioners. Some were snake oil; others worked but couldn't scale as patentable profits. All shut out.",
     "person-brigham-buhler", "cited_from_document",
     ["person-brigham-buhler", "concept-sick-care-vs-health-care"],
     "Before this, 20 to 30% of doctors in the United States were osteopaths, homeopaths, people that worked with unconventional modalities. In certain cases these modalities were snake oil. But in others, they worked. They just couldn't scale."),
    ("buhler-sick-care-turn-illness-to-profit", 143,
     "Buhler characterization: 'It was never about health. It was about big business and it was about control. A system of sick care, not health care. A system designed to turn your illness into profit.'",
     "person-brigham-buhler", "on_record_statement",
     ["person-brigham-buhler", "concept-sick-care-vs-health-care"],
     "It was never about health. It was about big business and it was about control. A system of sick care, not health care. A system designed to turn your illness into profit."),
    ("jesse-blanket-health-ufo-parallel", 127,
     "Jesse's framework: 'The blanket similar to the one that has hidden truths about UFOs, non-human intelligences, and physics-redefining technologies has also been used to disguise the truth about health.'",
     "person-jesse-michels", "speculation",
     ["concept-blanket-of-deception-health-ufo", "concept-disclosure"],
     "It's not a wildly outlandish claim to suggest that a blanket similar to the one that has hidden truths about UFOs, non-human intelligences, and physics-redefining technologies has also been used to disguise the truth about health."),
]

# V87 9QMrhcpJq8I — Matthew Pines Psionics
VID87 = "9QMrhcpJq8I"
entities_87 = [
    concept("age-of-psionics", "Age of Psionics (Pines)", "metaphysics",
        [src(VID87, 155, "Pines' term for emerging mainstream of mind-physics / consciousness-based phenomena")],
        summary="Matthew Pines' framing: 2024+ is the 'Age of Psionics' — consciousness-based phenomena (NHI contact, remote viewing, light-beings, meditation, AI, Bitcoin) rediscovering ancient knowledge via modern frame. 'Pandora's box.' No guarantee knowledge is 'good knowledge.'"),
    concept("bitcoin-uap-trajectory-parallel", "Bitcoin/UAP Trajectory Parallel", "politics",
        [src(VID87, 167, "Pines parallel: Bitcoin and UAP both went from fringe to Overton-window mainstream")],
        summary="Pines' observation: Bitcoin culture and UAP culture share near-identical evolution arcs — fringe/taboo → heterodox-thinker attraction → insular cult-like community → conference/podcast ecosystem → gradual legitimization via legislation → normalization within Overton window. Gillibrand is a senator on both the pro-Bitcoin and pro-UAP legislation."),
]
claims_87 = [
    ("pines-fringe-to-normie-cycle", 155,
     "Pines notes: 'Fringe opinions on Bitcoin and UAPs four or five years ago are now increasingly normie. The reality of non-human intelligence was fully out there — now it's coming in. And now you got psionics.'",
     "person-matthew-pines-extended", "on_record_statement",
     ["person-matthew-pines-extended", "concept-age-of-psionics"],
     "Fringe opinions on Bitcoin and UAPs four or five years ago are now increasingly like normie. The reality of non-human intelligence was like fully out there. Now it's like coming in. And now you got psionics. Well, okay, that's the new thing out there. But that's probably also coming in."),
    ("pines-rediscovering-ancient-knowledge", 155,
     "Per Pines: consciousness, light beings, meditative practices — modern frame is rediscovering ancient knowledge via current vernacular; the content is ancient.",
     "person-matthew-pines-extended", "speculation",
     ["person-matthew-pines-extended", "concept-age-of-psionics"],
     "Consciousness and light beings and meditative practices. It's like we're rediscovering a lot of like ancient sort of knowledge, right? It's just being reinterpreted through our modern frame."),
    ("pines-bitcoin-uap-mirror-evolution", 167,
     "Pines' mirror-evolution framework: Bitcoin and UAP both transitioned from taboo-fringe (pre-2017 / pre-2010) → heterodox-thinker attraction → insular culture → gradual political legitimization. Gillibrand works both legislative fronts.",
     "person-matthew-pines-extended", "on_record_statement",
     ["person-matthew-pines-extended", "concept-bitcoin-uap-trajectory-parallel",
      "person-kirsten-gillibrand"],
     "Bitcoin culture and UAP topic share similar trajectory. Similar evolution. One of the senators involved in pro-crypto legislation, Senator Gillibrand, is also the same senator who's been involved in some of the initial UAP legislation."),
    ("pines-pandoras-box-not-guaranteed-good", 159,
     "Pines' warning on psionics disclosure: 'Pandora's box. There's no guarantee that the box of knowledge humanity is dipping its hand into is going to be like good knowledge.'",
     "person-matthew-pines-extended", "speculation",
     ["person-matthew-pines-extended", "concept-age-of-psionics"],
     "It does feel like this sort of Pandora's box. You have hope, but then there's like a whole lot of like bad stuff that comes with it. Not all knowledge is just, oh, this is a rainbow. Oh, this is like forever knowledge. There's no guarantee that the box of knowledge humanity is dipping its hand into is going to be like good knowledge."),
    ("pines-ai-quantum-bitcoin-strategic", 159,
     "Pines: 'Bitcoin and UAPs and AI — these are fully at the center of what's going to drive major strategic dynamics over the next few years.' Triangle governing geopolitical 2025-2030 window.",
     "person-matthew-pines-extended", "on_record_statement",
     ["person-matthew-pines-extended"],
     "Bitcoin and UAPs and AI like these are fully at the center of what's going to drive major strategic dynamics over the next few years."),
]

# V88 SZBI85yvV5A — Rogan appearance + golfer
VID88 = "SZBI85yvV5A"
entities_88 = [
    P("young-jamie", "Young Jamie", VID88, 192,
      "Joe Rogan Experience producer; UFO enthusiast",
      "Jamie Vernon — producer of the Joe Rogan Experience. UFO enthusiast who went down rabbit holes; friends with Jesse before Jesse's JRE appearance.",
      ["Vernon", "Jamie"], "producer",
      ["producer", "JRE"]),
    P("viktor-hovland", "Viktor Hovland", VID88, 192,
      "Norwegian top-10 professional golfer; Plato reader; UFO fan",
      "Top-10 professional golfer from Norway; humble, down-to-earth, reads Plato, learns about UFOs in his spare time. American Alchemy superfan.",
      ["Hovland", "Havlin"], "golfer",
      ["golfer", "athlete"]),
    P("jesse-michels-jre-guest", "Jesse Michels (JRE appearance)", VID88, 193,
      "American Alchemy host; JRE appearance",
      "Jesse Michels' appearance on Joe Rogan Experience — long-time Rogan fan realizing a decade-old dream. Rogan had been binging American Alchemy; interview covered AGI, black science, UFOs, tridactyl mummies, Townsend Brown.",
      [], "journalist", ["host", "interviewer"]),
]
claims_88 = [
    ("jesse-jre-dream-come-true", 193,
     "Jesse's Joe Rogan Experience appearance was a decade-long dream realized — Rogan had been binging American Alchemy and texting Jesse before the show; 'saying this was an honor would be a massive understatement.'",
     "person-jesse-michels-jre-guest", "personal_account",
     ["person-jesse-michels-jre-guest"],
     "Apparently, dreams do come true. I achieved one of mine when I went on the Joe Rogan Experience. I've been a super fan of Joe's show for the last decade. He had been texting me talking about binging our show American Alchemy and loving it."),
    ("jesse-agi-religions-black-science", 195,
     "On JRE Jesse argued: religions dedicated to AI are inevitable regardless of AGI achievement — 'without a doubt there'll be people worshiping certain branches of AI' — plus there is 'black technology and science' in super-secret DOE facilities.",
     "person-jesse-michels-jre-guest", "on_record_statement",
     ["person-jesse-michels-jre-guest"],
     "It doesn't matter whether AGI hits some perfectly turing-passable point. You're going to get these cult-like dynamics — religions dedicated to AI. There's technology that is black technology and science that is black science. Super secret DoE facilities which I think it's crazy to say that hasn't happened."),
    ("viktor-hovland-plato-ufo-fan", 192,
     "Viktor Hovland — top-10 golfer from Norway — reads Plato and studies UFOs in his spare time; reached out to Jesse as an American Alchemy fan.",
     "person-jesse-michels-jre-guest", "personal_account",
     ["person-viktor-hovland"],
     "Victor Hovland reached out to me last year because he's a huge fan of American Alchemy. Top 10 golfer in the world, the sensation from Norway is humble, down to earth, and super smart. In his spare time, he's reading Plato and learning about UFOs."),
    ("jesse-school-bus-craft-sighting", 200,
     "Jesse mentions seeing 'a thing that looked like a school bus — no visible propulsion, low humming noise, maybe 50-60-70 feet high above the treetops' — personal UAP sighting.",
     "person-jesse-michels-jre-guest", "personal_account",
     ["person-jesse-michels-jre-guest"],
     "I saw a thing that looked like a school bus. It looked like no visible propulsion. This like sort of low humming noise or whatever. It was maybe 50, 60, 70 feet high, like above the tree, right above the treetops."),
]

# V89 iPxbILOMQ08 — Roger Leir Implants
VID89 = "iPxbILOMQ08"
entities_89 = [
    P("roger-leir", "Dr. Roger Leir", VID89, 233,
      "California podiatrist who surgically removed alleged alien implants from 20+ year span",
      "Podiatrist in Ventura CA. Initially skeptic; recruited into alien-implant research by ufologist Derrel Sims. Over 20-year period surgically removed ~17 anomalous objects from people with UFO abduction histories. Died 2014; research carried on by living heir (unnamed in podcast).",
      ["Leir", "Leer"], "podiatrist / researcher",
      ["researcher", "implant-investigator"]),
    P("darrel-sims", "Derrel Sims", VID89, 237,
      "Ufologist who recruited Leir into implant research",
      "American ufologist who convinced Dr. Roger Leir to investigate alleged alien implants — reportedly 'the most knowledgeable ufologist' Leir ever met. Darl referred patients with implant-removal needs to Leir.",
      ["Sims", "Darl"], "ufologist",
      ["ufologist", "researcher"]),
    technology("leir-implant-t-shaped", "Leir T-Shaped Implant", "material",
        [src(VID89, 239, "T-shaped device with bone-like outer, metallic core, nerve cells, UV-emitting fiber optics")],
        summary="Typical object removed by Dr. Roger Leir over 20-year period: T-shaped ('T-shaped affair') composed of: outer layer like bone or pearl; metallic core with internal tubes; nerve cells surrounding. UV-light-emitting fiber optics. Isotope ratios suggesting extra-terrestrial material origin. No physiological immune response from host body."),
    concept("alien-implant-phenomenon", "Alien Implant Phenomenon", "biological",
        [src(VID89, 231, "~350,000 people with alleged alien implants per field estimate")],
        summary="Phenomenon reported by ~350,000 people (per field estimate): embedded objects in body tissue, inserted during alleged abduction events, often preceded by recalled craft interiors, regressive-hypnosis flashbacks, and lack of immune rejection response. Characteristic isotope ratios and nanotechnological sophistication."),
]
claims_89 = [
    ("leir-20-year-implant-removal-research", 237,
     "Over 20 years Dr. Roger Leir removed ~17 anomalous implants from people with alien-abduction histories — T-shaped devices with bone-like outer, metallic core, nerve-cell surrounding, UV-fiber-optic internals.",
     "person-jesse-michels", "cited_from_document",
     ["person-roger-leir", "technology-leir-implant-t-shaped",
      "concept-alien-implant-phenomenon"],
     "Dr. Roger Leer who everybody — Darl Sims tried to get him interested in alien implants at first. The research started, and he ended up taking out [implants] — a 20-year period. We found the object — a T-shaped affair, strange color and texture."),
    ("leir-350k-people-implanted", 231,
     "Per field estimate: approximately 350,000 people reportedly have alien implants inside of them — far broader population than popular Grey-alien abduction discourse reaches.",
     "person-jesse-michels", "speculation",
     ["concept-alien-implant-phenomenon"],
     "How many people have alien implants inside of them? 350,000 people."),
    ("leir-implant-isotope-other-galaxy", 245,
     "Leir's analyzed implants contained elements in non-terrestrial isotope ratios — 'probably came from another part of the galaxy' — and structure was proposed as sophisticated nanotechnological device.",
     "person-jesse-michels", "cited_from_document",
     ["person-roger-leir", "technology-leir-implant-t-shaped"],
     "Elements from different places — so that means it's from — it's not from from here. Be a sophisticated nanotechnological device. Probably came from another part of the galaxy."),
    ("leir-implant-no-immune-response", 249,
     "Leir's implants produced NO physiological immune response — 'foreign objects always produce a physiological immune response' — indicating intentional biocompatibility engineering.",
     "person-jesse-michels", "cited_from_document",
     ["person-roger-leir", "technology-leir-implant-t-shaped"],
     "These devices also produce no physiological — foreign objects always produce a physiological immune response, right?"),
    ("implantee-craft-interior-details", 253,
     "Under regressive hypnosis, implantees recall detailed craft interiors — airlock with human + alien spacesuits, four-quadrant craft, couch-on-wall for implant-insertion procedure, 'taller gray' medical operator, black-plastic-handle tool with quarter-inch piece implanted, UV-light burns.",
     "person-jesse-michels", "cited_from_document",
     ["concept-alien-implant-phenomenon"],
     "I underwent regressive hypnosis and remembered. The center of the craft — airlock that had human and alien space suits to the four quadrants. A couch that slid out of the wall to lie down. It was a taller gray. Black plastic handle with a piece of 1/4 inch — my toe — and pushed a button."),
]

# V90 5udx_SDdL3Y — Did Oppenheimer Work on UFOs?
VID90 = "5udx_SDdL3Y"
entities_90 = [
    concept("oppenheimer-ufo-secrecy-overlay", "Oppenheimer UFO-Secrecy Overlay Hypothesis", "politics",
        [src(VID90, 289, "Core theory connecting Manhattan Project secrecy framework to UFO classification")],
        summary="Hypothesis (via Grusch, Kissinger-Wang, Condon): J. Robert Oppenheimer, Kissinger, and Manhattan-Project-era atomic-secrecy architects established the classification framework subsequently overlaid onto UFO retrieval and reverse-engineering programs — resuscitation of a lost material-analysis approach."),
]
claims_90 = [
    ("oppenheimer-involved-ufos-kissinger", 289,
     "Multiple independent threads (Grusch's claim; Kissinger-Wang widow testimony; Condon's Manhattan Project placement) converge on a hypothesis that Oppenheimer and other Manhattan-Project architects were involved in early UFO programs and established the secrecy framework.",
     "person-jesse-michels", "speculation",
     ["person-robert-oppenheimer", "person-henry-kissinger",
      "concept-oppenheimer-ufo-secrecy-overlay", "concept-manhattan-project-clearance-system"],
     "You've all heard of people like Robert J. Oppenheimer, even Henry Kissinger who were involved with UFO — these people actually had something to do with UFO."),
    ("eminent-domain-uap-tech-legislation", 281,
     "The UAP Disclosure Act framework includes a provision for the US government to 'declare eminent domain' or ownership over any private-sector possession of NHI material — if enacted would be a huge breakthrough for material analysis.",
     "person-jesse-michels", "cited_from_document",
     ["document-schumer-rounds-amendment", "concept-reverse-engineering"],
     "To declare eminent domain or ownership over any possession — I think if that were passed it would be a huge breakthrough. Senator Rounds would create a board just like through the declassification."),
    ("johnson-diluted-wright-patterson-donors", 285,
     "Mike Johnson (House Speaker, Dayton Ohio district near Wright-Patterson) is identified as the person who 'had a huge part in diluting the wording' around UAP Disclosure Act — top campaign donors are major aerospace companies.",
     "person-jesse-michels", "speculation",
     ["person-mike-johnson-speaker", "document-schumer-rounds-amendment",
      "location-wright-patterson-afb"],
     "Had a huge part in diluting the wording — Dayton Ohio, which is where Wright Patterson Air Force Base is. Donate to the campaigns of the Congress people. Kill this bipartisan provision."),
    ("legacy-uap-studying-since-2017", 291,
     "UAP issue has been systematically studied by the government since 2017 (AATIP public disclosure) — specific historical programs span reports from 'all kinds and all of these programs.'",
     "person-jesse-michels", "cited_from_document",
     ["program-aatip"],
     "UFO issue they seem to be studying it since 2017. Reports that had come to us from all kinds and all of these programs."),
]

# V91 ZTIO-xAP0Dw — Weinstein UFO Physics
VID91 = "ZTIO-xAP0Dw"
entities_91 = [
    P("brett-weinstein", "Brett Weinstein", VID91, 305,
      "Evolutionary biologist; Eric Weinstein's brother",
      "Evolutionary biologist; Eric Weinstein's younger brother; member of the Intellectual Dark Web; frequently on YouTube 'most wanted list' for heterodox pandemic commentary.",
      ["Weinstein"], "biologist",
      ["scientist", "biologist", "IDW"]),
    concept("intellectual-dark-web", "Intellectual Dark Web (IDW)", "politics",
        [src(VID91, 303, "Eric Weinstein-coined movement of pro-reason centrist intellectuals")],
        summary="Eric Weinstein-coined movement ~2018: loose group of pro-reason, pro-democracy centrist intellectuals including Joe Rogan, Jordan Peterson, Sam Harris, Brett Weinstein, and Eric himself. 'Not as ominous as it sounds.'"),
    document("the-portal-podcast", "The Portal (Podcast)", "broadcast",
        [src(VID91, 307, "Eric Weinstein's podcast Jesse was producer on")],
        summary="Eric Weinstein's podcast 'The Portal' — Jesse Michels was producer; a year and a half of pestering Eric preceded launch.",
        author="Eric Weinstein"),
    concept("geometric-unity-theory-everything", "Geometric Unity / Theory of Everything", "physics",
        [src(VID91, 313, "Eric Weinstein's theory of everything in physics")],
        summary="Eric Weinstein's proposed theory of everything in physics; 14-dimensional observerse; extra temporal dimensions; explicitly entertained as framework reconciling UFO observations with new physics."),
    concept("gain-of-function-research", "Gain-of-Function Research (COVID)", "politics",
        [src(VID91, 313, "Obama-sunsetted; Fauci restarted 2017 via Wuhan Institute of Virology")],
        summary="Research creating novel pathogens artificially to preemptively develop cures. Obama sunsetted as too dangerous; Fauci restarted 2017 via NIH funding to Wuhan Institute of Virology (poor safety record). Context for Weinstein-Michels COVID-adjacent conversation."),
]
claims_91 = [
    ("weinstein-fringe-jessie-portal-producer", 307,
     "Jesse spent 18 months pestering Eric Weinstein to start a podcast; eventually resulted in 'The Portal'. Jesse served as its producer.",
     "person-jesse-michels", "personal_account",
     ["person-eric-weinstein", "document-the-portal-podcast"],
     "I thought more people should be aware of Eric. Thus began a year and a half of me hounding him to start a podcast, an effort that eventually became The Portal. I was a pain in the ass."),
    ("weinstein-idw-centrist-intellectuals", 303,
     "Eric Weinstein coined 'Intellectual Dark Web' — a bunch of pro-reason, pro-democracy centrist intellectuals including Joe Rogan, Jordan Peterson, Sam Harris, Brett Weinstein, and Eric.",
     "person-jesse-michels", "personal_account",
     ["person-eric-weinstein", "person-brett-weinstein", "concept-intellectual-dark-web"],
     "When I first met Eric, he had just started a movement called the intellectual dark web. A bunch of pro-reason, pro-democracy centrist intellectuals. Other members of the group included Joe Rogan, Jordan Peterson, Sam Harris, and Eric's brother, Brett Weinstein."),
    ("weinstein-elite-chair-not-elite", 331,
     "Weinstein's framing: 'Sitting in an elite chair does not make you elite any more than sitting in a pilot seat gives you the ability to fly.' Criticism of US managerial decay.",
     "person-eric-weinstein", "on_record_statement",
     ["person-eric-weinstein"],
     "Sitting in an elite chair does not make you elite any more than sitting in a pilot seat in a plane gives you the ability to fly it."),
    ("weinstein-two-china-one-doesnt-exist", 329,
     "Weinstein's geopolitical reframing: 'You're talking about a country that exists, China — and a country that has existed in the past that does not exist now. We're looking for a disaster to call us into being a country again.'",
     "person-eric-weinstein", "speculation",
     ["person-eric-weinstein"],
     "I don't think when you say the US and China you're talking about two countries. You're talking about a country that exists, which is China, and a country that has existed in the past that does not exist now. World War II had such coherence that the decay function took a long time to eradicate. Now we're looking for a disaster to call us into being a country again."),
    ("weinstein-private-co-tyranny-outsourced", 323,
     "Weinstein: government tyranny has been outsourced to private corporations — 'you don't want to hold secrets inside government because they're vulnerable to lawyer requests, so aerospace companies hold them. Tyranny of censorship runs through private platforms.'",
     "person-eric-weinstein", "on_record_statement",
     ["person-eric-weinstein"],
     "You might put your secrets inside of an aerospace company because you don't want to hold them inside of government. Likewise tyranny of censorship. You want that done through private corporations because the government is under requirements not to do that. We farmed out tyranny to private companies."),
]

# V92 -0g3lLGxNfc — Salas 10 Nukes
VID92 = "-0g3lLGxNfc"
entities_92 = [
    concept("30-missiles-lost-to-ufos-1966-67", "30 Missiles Lost to UFO Activity Sep 1966-Mar 1967", "politics",
        [src(VID92, 356, "Salas claim: 30 nuclear missiles lost to UFO activity 1966-1967")],
        summary="Per Robert Salas: between September 1966 and March 1967, the US Air Force lost 30 nuclear missiles to UFO activity. March 24 1967 Malmstrom incident was one of several."),
    P("bob-jameson", "Bob Jameson", VID92, 52,
      "Colleague of Robert Salas who corroborated 1967 Malmstrom UFO event",
      "USAF colleague of Robert Salas present at the March 24 1967 Malmstrom incident; corroborated Salas' testimony on record with Larry King.",
      ["Jameson"], "military veteran",
      ["witness", "Malmstrom", "USAF"]),
]
claims_92 = [
    ("salas-march-24-1967-10-missiles", 341,
     "March 24 1967 Malmstrom: Robert Salas (missile launch officer 60ft underground) received a call from a 'screaming, frightened' topside guard about a red orange pulsating UFO hovering just above the front gate; one missile went off alert, then all 10 went down one at a time.",
     "person-robert-salas", "personal_account",
     ["person-robert-salas", "incident-1967-malmstrom-missiles", "person-bob-jameson"],
     "They said 'we got all the guards out. They've got their weapons pointed at this red orange pulsating light.' One of the missiles went off alert status. And right after that one went down, all of them went down one at a time."),
    ("salas-30-missiles-lost-67", 356,
     "Salas claims between September 1966 and March 1967 the US lost 30 nuclear missiles to UFO activity — pattern not an isolated event.",
     "person-robert-salas", "on_record_statement",
     ["person-robert-salas", "concept-30-missiles-lost-to-ufos-1966-67"],
     "Between September of '66 and March of '67, we lost 30 missiles to UFO activity. 30. 30."),
    ("salas-wsj-hit-piece-nuclear-deterrence", 346,
     "Salas reframes WSJ hit piece motive: 'Nuclear deterrence is the backbone of our national security. You have Xi and Putin closer than they've ever been. Iran-Israel is really a proxy war for this larger global conflict. That could be a failed state at any moment.'",
     "person-robert-salas", "on_record_statement",
     ["person-robert-salas"],
     "Well, nuclear deterrence is the backbone of our national security. You have Xi and Putin closer than they've ever been. Iran and Israel is really a proxy war for this larger global conflict. You have Pakistan having nukes."),
    ("salas-explicit-disclosure-brink-crisis", 353,
     "Salas: 'If there was ever an explicit disclosure moment, it might occur around us being on the brink. If you have another kind of Cuban missile crisis' — weaponizing UAP disclosure as tension-release mechanism.",
     "person-robert-salas", "speculation",
     ["person-robert-salas", "concept-disclosure"],
     "If there was ever an explicit disclosure moment, it might occur around us being on the brink. If you have another kind of Cuban missile crisis between superpowers."),
    ("jameson-backed-salas-larry-king", 52,
     "Bob Jameson — Salas' USAF colleague present at the March 24 1967 Malmstrom event — backed up Salas' testimony on record in a Larry King interview; independent corroboration.",
     "person-jesse-michels", "cited_from_document",
     ["person-bob-jameson", "person-robert-salas", "incident-1967-malmstrom-missiles"],
     "Salas even had a colleague present named Bob Jameson who backed up his testimony on record with Larry King."),
]

# V93 RofQnByLwOo — Wargo prophecies
VID93 = "RofQnByLwOo"
entities_93 = [
    P("dean-koontz", "Dean Koontz", VID93, 383,
      "American fiction author; 1981 novel predicted COVID-adjacent Wuhan 400",
      "American fiction author; 1981 novel 'The Eyes of Darkness' featured 'Wuhan 400' bioweapon from a lab near Wuhan China, set in 2020.",
      ["Koontz"], "author", ["author"]),
    P("morgan-robertson", "Morgan Robertson", VID93, 383,
      "1898 author of Titanic-precog novella 'Futility'",
      "American author; 1898 novella 'Futility or Wreck of the Titan' featured a North-Atlantic ocean liner called 'Titan' — described as unsinkable — hitting an iceberg in April and sinking with insufficient lifeboats. 14 years before Titanic.",
      ["Robertson"], "author", ["author", "historical"]),
    P("michael-richards-sculptor", "Michael Richards", VID93, 393,
      "African-American sculptor; 9/11 death in Twin Towers studio",
      "African-American sculptor obsessed with flight; his signature self-portrait work 'Tar Baby vs Saint Sebastian' depicted him levitating as an airman being impaled by airplanes. Awarded studio space in the Twin Towers — he alone stayed the night of September 10 2001; killed morning of 9/11.",
      ["Richards"], "artist",
      ["artist", "historical"]),
    document("eyes-of-darkness-koontz", "The Eyes of Darkness", "book",
        [src(VID93, 383, "Dean Koontz 1981 novel featuring Wuhan 400 bioweapon")],
        summary="Dean Koontz's 1981 novel 'The Eyes of Darkness' — centered on secret Wuhan-400 bioweapon experiments at a lab near Wuhan China; set in 2020.",
        author="Dean Koontz", year=1981),
    document("futility-wreck-of-titan", "Futility, or the Wreck of the Titan", "book",
        [src(VID93, 385, "Morgan Robertson 1898 Titanic-precognition novella")],
        summary="Morgan Robertson's 1898 novella featuring Titan (largest unsinkable liner) hitting iceberg in April North Atlantic. 14 years before Titanic. Remarkable detail match: 800ft Titan vs 882ft Titanic, 24-25 knots, insufficient lifeboats.",
        author="Morgan Robertson", year=1898),
]
claims_93 = [
    ("koontz-1981-wuhan-400-precog", 383,
     "Dean Koontz's 1981 novel 'The Eyes of Darkness' featured 'Wuhan 400' bioweapon from a lab near Wuhan China, set in 2020 — decades before COVID-19.",
     "person-jesse-michels", "cited_from_document",
     ["person-dean-koontz", "document-eyes-of-darkness-koontz"],
     "American fiction author Dean Koontz wrote a novel called The Eyes of Darkness, centered on secret experiments involving the perfect bioweapon developed at a lab near Wuhan China called Wuhan 400. The novel is set in 2020, exactly like COVID. The only thing is the novel was written in 1981."),
    ("robertson-titan-1898-titanic-precog", 385,
     "Morgan Robertson's 1898 novella 'Futility' featured Titan — largest unsinkable North Atlantic ocean liner — hitting an iceberg in April, sinking with insufficient lifeboats. 14 years before the Titanic, nearly identical details.",
     "person-jesse-michels", "cited_from_document",
     ["person-morgan-robertson", "document-futility-wreck-of-titan"],
     "Wreck of the Titan was written about 14 years before the Titanic. Both ships were almost identical in size and features. Both traveling at high speeds around 24-25 knots crossing the North Atlantic in April at the time of their collision with an iceberg. Both disregarded ice warnings and both lacked sufficient lifeboats."),
    ("michael-richards-9-11-sculpture", 393,
     "Michael Richards — Black sculptor obsessed with flight — made a signature sculpture of himself as an airman impaled by airplanes. Awarded studio in the Twin Towers. He alone stayed the night of September 10 2001; killed morning of 9/11.",
     "person-jesse-michels", "cited_from_document",
     ["person-michael-richards-sculptor"],
     "Michael Richards, talented prolific African-American sculptor in New York. His sculptures obsessed with flight. His most famous self-portrait sculpture — he portrayed himself as an airman impaled by airplanes. Tar Baby versus St Sebastian. Awarded studio space in the Twin Towers. He alone among those artists had stayed in the studio the night of September 10th and was killed on the morning of September 11th."),
    ("stargate-remote-viewing-funded-until-1995", 405,
     "Stargate Program (CIA/DIA psychic-spy program) ran 1972 to 1995. Refunded every year because it was operationally useful. Hundreds of successful remote-viewing cases.",
     "person-jesse-michels", "cited_from_document",
     ["program-stargate-project", "person-joe-mcmoneagle"],
     "There was in fact a CIA and DIA backed program called Stargate which ran from 1972 to 1995. The official American psychic spy program. Every year it got refunded because it was useful. Hundreds of successful remote viewing cases."),
    ("twain-halleys-comet-predicted-death", 391,
     "Mark Twain predicted his own death: born November 30 1835 as Halley's Comet passed Earth, said he expected to 'go out with the comet upon its return.' Died 1910, one day after comet's closest approach to Earth.",
     "person-jesse-michels", "cited_from_document",
     ["person-eric-wargo"],
     "Mark Twain — born on November 30th 1835 just as Halley's Comet was passing by Earth. He would often say to people that he expected to go out with the comet upon its return. Just as he predicted he died in 1910 just one day after the comet made its closest approach to Earth."),
]

# V94 WBTqsbwJyqU — Greg Bishop Bennewitz
VID94 = "WBTqsbwJyqU"
entities_94 = [
    P("greg-bishop", "Greg Bishop", VID94, 420,
      "UFO journalist; Project Beta author; Bennewitz-case chronicler",
      "American UFO journalist; author of 'Project Beta' (on Paul Bennewitz AFOSI disinfo case) and 'It Defies Language' (most recent). Hard-headed reporter — 'sometimes reports on things that fly in the face of what believers want.'",
      ["Bishop"], "journalist",
      ["journalist", "investigator", "author"]),
    P("bill-moore-ufologist", "Bill Moore", VID94, 432,
      "UFO researcher who knew Bennewitz; per Bishop, involved in disinfo",
      "UFO researcher who knew Paul Bennewitz in the late 1970s-1980s. Per Greg Bishop: was complicit in the AFOSI disinfo operation against Bennewitz.",
      ["Moore"], "researcher",
      ["researcher", "disinfo"]),
    P("gabe-valdez-state-police", "Gabe Valdez", VID94, 432,
      "Dulce area NM state police officer who knew Bennewitz",
      "Area NM state police officer; one of three people Greg Bishop talked to who directly knew Paul Bennewitz.",
      ["Valdez"], "officer",
      ["witness", "researcher"]),
    P("paul-bennewitz-extended", "Paul Bennewitz (extended)", VID94, 420,
      "Kirtland-adjacent electronics entrepreneur; target of AFOSI disinfo campaign",
      "Electronics entrepreneur; Thunder Scientific company across the street from Kirtland AFB (Albuquerque). Owner of temperature/humidity instruments for military/aerospace. Already mentally unstable per Bishop before AFOSI AFOSI operation made it worse. Private pilot; acrobatic flying.",
      ["Bennewitz"], "entrepreneur",
      ["witness", "target-of-disinfo"]),
    document("project-beta-bishop", "Project Beta", "book",
        [src(VID94, 421, "Greg Bishop's book documenting Paul Bennewitz AFOSI disinfo case")],
        summary="Greg Bishop's book documenting the Paul Bennewitz case — AFOSI counterintelligence operation that exploited his pre-existing instability; Bennewitz receiving fabricated UFO material from Richard Doty led to mental breakdown. Demonstrates 'UFOs as Swiss Army knife for intelligence.'",
        author="Greg Bishop"),
    document("it-defies-language-bishop", "It Defies Language", "book",
        [src(VID94, 421, "Greg Bishop's most recent book on UFO phenomena")],
        summary="Greg Bishop's more recent book — 'It Defies Language' — on UFO phenomena.",
        author="Greg Bishop"),
]
claims_94 = [
    ("bishop-ufo-as-swiss-army-knife-intel", 415,
     "Bishop's framing: 'UFOs are a Swiss Army knife for intelligence. They can use them for anything.' The Bennewitz operation was a 24-hour-long stage play where Bennewitz was only briefly onstage.",
     "person-greg-bishop", "on_record_statement",
     ["person-greg-bishop", "document-project-beta-bishop",
      "event-1979-bennewitz-psyop"],
     "UFOs are a Swiss Army knife for intelligence. They can use them for anything. Imagine the Bennewitz operation as a 24-hour long stage play. Bennewitz is five minutes in one scene."),
    ("bishop-prosaic-cover-for-ufo-not-reverse", 419,
     "Bishop rejects the common 'UFOs are cover for classified prosaic tech' framing: 'It's the opposite. Prosaic technology is often used as a cover for UFO.' Often both operate simultaneously.",
     "person-greg-bishop", "on_record_statement",
     ["person-greg-bishop"],
     "The idea that UFOs are a cover for just prosaic technology is totally wrong. In fact, it's the opposite. Prosaic technology is often used as a cover for UFO. In fact, it's demonstrably both."),
    ("bishop-bennewitz-unstable-before", 425,
     "Bishop insists Bennewitz was already 'kind of unstable to begin with' before AFOSI operation. The AFOSI disinfo didn't CREATE his breakdown — they 'encouraged it and made it worse.' 'No excuse, but he was kind of heading down that road.'",
     "person-greg-bishop", "on_record_statement",
     ["person-greg-bishop", "person-paul-bennewitz-extended",
      "event-1979-bennewitz-psyop"],
     "Bennewitz wasn't perfectly okay — he was already kind of unstable to begin with. The Air Force AFOSI and other people just encouraged it and made it worse. There you go — which is no excuse, but everybody says, 'Oh, he was perfectly okay.' No, he was kind of heading down that road."),
    ("bennewitz-thunder-scientific-kirtland-across-street", 427,
     "Paul Bennewitz's Thunder Scientific company was across the street from Kirtland AFB (Albuquerque). Per Bishop: 'You could walk out his front door and down a street two minutes and be at the fence.' Still operational today with his son as president.",
     "person-greg-bishop", "cited_from_document",
     ["person-paul-bennewitz-extended"],
     "His office was near the Wyoming gate of Kirtland Air Force Base. At work or at home, he was always like right next to the [base]. The company's still there. If you go there, there's a sign that says Thunder Scientific. One of his sons is still the president."),
    ("bishop-bennewitz-aerial-phenomena-research-photo", 437,
     "Per Bishop: Bennewitz's APRO (Aerial Phenomena Research Organization) application photo shows him kind of mischievous and happy — contrary to Bishop's mental picture of him as scared and paranoid.",
     "person-greg-bishop", "personal_account",
     ["person-greg-bishop", "person-paul-bennewitz-extended"],
     "I've seen a picture of his application to APRO, Aerial Phenomena Research Organization, and he's just kind of standing there. He looks actually pretty happy and funny. I think of him as this scared, paranoid person, but in the picture he looks different."),
]

# V95 6WC4o2yY9Ws — Ryan Graves USAF pilot
VID95 = "6WC4o2yY9Ws"
entities_95 = [
    P("ryan-graves-extended", "Ryan Graves (extended)", VID95, 451,
      "Former USN F-18 pilot; UAP witness; AIP advocate",
      "Former US Navy F-18 pilot; UAP witness; co-testified with David Fravor at July 2023 Congressional hearing. Advocate for pilot-safety reporting and stigma reduction.",
      ["Graves"], "pilot",
      ["witness", "pilot", "US Navy"]),
    P("iya-whitley-psychologist", "Dr. Iya Whitley", VID95, 467,
      "Psychologist specializing in fighter pilots and astronauts",
      "Psychologist with career devoted to the psychology of both fighter pilots and astronauts. Interviewed Ryan Graves for her research.",
      ["Whitley"], "psychologist",
      ["psychologist", "aerospace"]),
    P("josh-waitzkin", "Josh Waitzkin", VID95, 475,
      "Inspiration for 'Searching for Bobby Fischer'; Tai Chi Push Hands champion",
      "American child chess prodigy (inspiration for the film 'Searching for Bobby Fischer'); later became world champion in Tai Chi push-hands. Author of 'The Art of Learning.'",
      ["Waitzkin", "Weightskin"], "chess master",
      ["prodigy", "author"]),
    document("art-of-learning-waitzkin", "The Art of Learning", "book",
        [src(VID95, 475, "Josh Waitzkin's book on learning across two disciplines")],
        summary="Josh Waitzkin's book about how to best learn; emphasizes that mental models must dissolve into embodied skill — 'a dog catching a Frisbee is not doing vector calculus.'",
        author="Josh Waitzkin"),
    technology("black-cube-in-clear-sphere", "Black-Cube-in-Clear-Sphere UAP", "craft",
        [src(VID95, 453, "UAP morphology: dark gray or black cube inside clear sphere")],
        summary="Specific UAP craft morphology reported by pilots: dark gray or black cube embedded inside a clear sphere. Came within ~50ft of cockpit. About 5-15 ft diameter. Multiple pilots independently confirm 'cubes and spheres — yeah, we saw those' in a room."),
]
claims_95 = [
    ("graves-cube-in-sphere-50ft-cockpit", 453,
     "Graves describes a reported UAP craft morphology: dark gray or black cube inside clear sphere, 5-15 ft diameter, coming within ~50ft of cockpit. Half the room of pilots raised hands confirming they had seen cubes and spheres.",
     "person-ryan-graves-extended", "personal_account",
     ["person-ryan-graves-extended", "technology-black-cube-in-clear-sphere"],
     "Came within about 50 feet of the cockpit. He described it as a dark gray or black cube inside of a clear sphere. About half the room raised their hand like, 'Oh yeah, the cubes and spheres, you know, we saw those.' About 5 to 15 ft in diameter."),
    ("graves-uap-routine-not-rare", 451,
     "Graves' Congressional testimony: 'UAP are in our airspace. These sightings are not rare or isolated. They are routine.'",
     "person-ryan-graves-extended", "testimony_under_oath",
     ["person-ryan-graves-extended", "event-2023-07-uap-hearing"],
     "As we convene here, UAP are in our airspace. These sightings are not rare or isolated. They are routine."),
    ("graves-objects-over-speed-of-sound", 453,
     "Graves' pilots observed UAPs solid on radar going over the speed of sound without sonic boom — 'as soon as they crossed that threshold, boom, object shoots down.'",
     "person-ryan-graves-extended", "testimony_under_oath",
     ["person-ryan-graves-extended", "concept-five-observables"],
     "Our assumption at first was that these were just radar errors. But they weren't behaving like false tracks. They were steady. They were solid. They were consistent. And some of these objects were even going over the speed of sound."),
    ("graves-jet-becomes-body-appendage", 465,
     "Graves describes the flight experience phenomenologically: 'The jet becomes like an appendage of your body. 100%. You think and the aircraft moves. It just feels like you're part of the jet.'",
     "person-ryan-graves-extended", "personal_account",
     ["person-ryan-graves-extended"],
     "It almost feels like the jet becomes like an appendage of your body. 100%. You're strapped in there. There's no it's not the jet and you — it's just you think and the aircraft moves. You become so synchronized."),
    ("graves-carrier-landing-peak-flow", 461,
     "Graves describes landing on an aircraft carrier at night as 'penultimate presence moment' — 'flying towards this singular little light in a sea of blackness and literally a sea.' Peak flow-state.",
     "person-ryan-graves-extended", "personal_account",
     ["person-ryan-graves-extended"],
     "The greatest example of peak presence — landing on the aircraft carrier, especially at night. It can be almost meditative — flying towards this singular little light in a sea of blackness and literally a sea as well."),
]

# V96 UrHLTFvdEZk — CIA MK-Ultra
VID96 = "UrHLTFvdEZk"
entities_96 = [
    P("colin-ross", "Dr. Colin Ross", VID96, 498,
      "Canadian psychiatrist; author of 'The CIA Doctors'",
      "Canadian psychiatrist; moved to US. Author of 'The CIA Doctors' — investigates psychiatrists who were employed by CIA for MK-Ultra-style mind-control experiments creating dissociated personalities, Manchurian candidates, couriers, and spies.",
      ["Ross"], "psychiatrist",
      ["psychiatrist", "investigator"]),
    P("lee-harvey-oswald-mk-ultra", "Lee Harvey Oswald (MK-Ultra subject)", VID96, 490,
      "Per Ross: JFK assassin was likely an MK-Ultra subject",
      "Alleged sole JFK assassin; per Colin Ross's investigation, was likely an MK-Ultra subject — consistent with repeated memory lapses under interrogation.",
      [], "alleged assassin",
      ["historical", "alleged-MK-subject"]),
    P("charles-manson-mk", "Charles Manson (MK subject)", VID96, 492,
      "Per Ross's investigation: Manson was an MK-Ultra subject",
      "American cult leader; per Colin Ross's investigation, was an MK-Ultra subject — explaining the mind-control hallmarks of his followers' horrific acts.",
      ["Manson"], "cult leader",
      ["historical", "alleged-MK-subject"]),
    program("mk-ultra", "Project MK-Ultra",
        [src(VID96, 488, "CIA mind-control program 1953-1973 using ~120 drugs + electric shock")],
        summary="CIA Project MK-Ultra (1953-1973) — 149 subprojects using ~120 different drugs for mind control, electric shock, dissociative-identity-disorder creation, Manchurian Candidate development. Paper trail 'goes dark in 1975 with reform.'",
        acronym="MK-Ultra"),
    program("tuskegee-syphilis-study", "Tuskegee Syphilis Study (1932+)",
        [src(VID96, 516, "Unethical US Public Health Service syphilis experiment on Black men")],
        summary="US Public Health Service experiment started 1932 — 'side effects of syphilis in the male' in Tuskegee context; 'all these top medical people were off on it.' Used as precedent for MK-Ultra ethical collapse."),
    document("cia-doctors-ross", "The CIA Doctors", "book",
        [src(VID96, 499, "Colin Ross's documentation of CIA-psychiatrist collaboration")],
        summary="Dr. Colin Ross's book documenting the psychiatrists who worked for CIA on MK-Ultra and related mind-control programs.",
        author="Colin Ross"),
]
claims_96 = [
    ("ross-120-drugs-mk-ultra", 488,
     "Per Dr. Colin Ross's documentation: MK-Ultra used approximately 120 different drugs across 149 subprojects for mind control, plus electric shock, creating the super spy / Manchurian Candidate framework.",
     "person-colin-ross", "cited_from_document",
     ["person-colin-ross", "program-mk-ultra", "document-cia-doctors-ross"],
     "Project MK Ultra and other kind of variations of that. This 120-ish different drugs that had been used for mind control. And multiple personalities, couriers and spies. They used whoever they could get their hands on."),
    ("ross-oswald-mk-subject", 490,
     "Per Ross: Lee Harvey Oswald was likely an MK-Ultra subject — consistent with his on-record memory lapses ('doesn't remember shooting') during interrogation.",
     "person-colin-ross", "speculation",
     ["person-colin-ross", "person-lee-harvey-oswald-mk-ultra", "program-mk-ultra"],
     "This guy is connected — Lee Harvey Oswald, who's the supposed lone gunman assassinating JFK. Jack Ruby killed Lee Harvey before having shot Lee Harvey Oswald. He doesn't to this day says that he has no recollection of shooting. Who's an MK Ultra patient."),
    ("ross-secure-facility-tour", 507,
     "Ross recounts being escorted inside a classified Northern Virginia government facility by a DIA contact; shown documents for all 149 MK-Ultra projects. Cab driver from Afghanistan unknowingly provided cover.",
     "person-colin-ross", "personal_account",
     ["person-colin-ross", "program-mk-ultra"],
     "I was down in Northern Virginia for a conference on MK Ultra. It turns out the taxi driver is from Afghanistan. The guy gives me a piece of paper. Walk over here through another door. Bunch of guys in uniform. The woman comes down, keys in a code. Another door, secure line DIA only. I got to read documents. A cart with all the 149 MK Ultra projects."),
    ("tuskegee-1932-prologue-mk", 516,
     "Tuskegee syphilis study (started 1932) provided ethical-collapse precedent for MK-Ultra — 'all these top medical people were off on it.' Demonstrates institutional willingness for large-scale unethical research.",
     "person-colin-ross", "cited_from_document",
     ["person-colin-ross", "program-tuskegee-syphilis-study", "program-mk-ultra"],
     "Tuskegee, 1932, the public health service was off on it. All these top medical people were off on it. It's called side effects of syphilis in the male context on just high level."),
    ("ross-mk-ultra-trail-dark-1975-reform", 514,
     "Ross notes the MK-Ultra paper trail 'goes dark in 1975 with reform' — public-facing paper trail ends, but operational successor programs continue.",
     "person-colin-ross", "on_record_statement",
     ["person-colin-ross", "program-mk-ultra"],
     "The trail goes dark in 1975 with reform. Let's go back to the very beginning."),
]

# V97 AVJEXCTAJUc — Jonah Hill / Phil Stutz family
VID97 = "AVJEXCTAJUc"
entities_97 = [
    P("phil-stutz", "Phil Stutz", VID97, 527,
      "Jungian-influenced psychiatrist; Riker's Island 5 yrs; Jonah Hill's Netflix subject",
      "American psychiatrist; Riker's Island prison psychiatrist for 5 years; afflicted with chronic fatigue syndrome in his 30s which became generative. Rudolph Steiner-influenced; Jungian-symbology therapy visualizations. Jesse's godfather. Jonah Hill's Netflix documentary 'Stutz' subject.",
      ["Stutz"], "psychiatrist",
      ["psychiatrist", "therapist"]),
    P("barry-michels", "Barry Michels", VID97, 533,
      "Jesse's father; Stutz's business partner; The Tools co-author",
      "Jesse Michels' father; longtime business partner of Phil Stutz. Co-developed and communicated Stutz's therapy-visualization framework. Co-author of 'The Tools' (NYT bestseller) and 'Coming Alive'. Treated CEOs, actors, producers, directors.",
      ["Michels"], "therapist",
      ["therapist", "author"]),
    P("jonah-hill", "Jonah Hill", VID97, 527,
      "American actor; directed Netflix documentary 'Stutz'",
      "American actor and filmmaker; directed Netflix documentary 'Stutz' (2022) about Jesse's godfather Phil Stutz.",
      ["Hill"], "actor / filmmaker",
      ["actor", "filmmaker"]),
    P("rudolph-steiner", "Rudolph Steiner", VID97, 531,
      "Austrian philosopher; anthroposophy founder; influenced Stutz",
      "Austrian philosopher (1861-1925); founder of anthroposophy; defining worldview influence on Phil Stutz during his chronic-fatigue recovery period.",
      ["Steiner"], "philosopher",
      ["philosopher", "historical"]),
    document("stutz-michels-the-tools", "The Tools", "book",
        [src(VID97, 537, "Phil Stutz and Barry Michels' NYT bestseller on mental visualization therapy")],
        summary="NYT bestselling book by Phil Stutz and Barry Michels on mental-visualization therapy — patient visualizations for everyday situations incorporating Jungian archetypal symbology. Works empirically in practice.",
        author="Phil Stutz & Barry Michels"),
    document("stutz-netflix-documentary", "Stutz (Netflix Documentary)", "broadcast",
        [src(VID97, 527, "Jonah Hill's Netflix documentary on Phil Stutz")],
        summary="Jonah Hill's Netflix documentary on Phil Stutz.",
        author="Jonah Hill"),
]
claims_97 = [
    ("stutz-rikers-island-5-years", 529,
     "Phil Stutz served as Riker's Island prison psychiatrist for 5 years — formative period where 'evaluating and helping people was almost a matter of life or death' from the start.",
     "person-jesse-michels", "personal_account",
     ["person-phil-stutz"],
     "Phil was also the Riker's Island prison psychiatrist for 5 years, so evaluating and helping people was almost a matter of life or death for him from the start."),
    ("stutz-chronic-fatigue-generative", 529,
     "In his early 30s Stutz was afflicted with chronic fatigue syndrome — 'bizarrely generative' breakdown. Led him to Rudolph Steiner and Jung, defining his worldview and practice.",
     "person-jesse-michels", "personal_account",
     ["person-phil-stutz", "person-rudolph-steiner"],
     "In his early 30s Phil became afflicted with a mysterious condition called chronic fatigue syndrome. This breakdown was bizarrely generative. He found a turn-of-the-century Austrian philosopher named Rudolph Steiner who came to define his worldview and influence his practice."),
    ("michels-stutz-business-partners", 533,
     "Barry Michels (Jesse's father) is Phil Stutz's longtime business partner — co-developed and communicated Stutz's framework; treats 'CEOs of billion-dollar companies, actors, producers, directors, some on the verge of self-destruction.'",
     "person-jesse-michels", "personal_account",
     ["person-barry-michels", "person-phil-stutz"],
     "I'm also talking about my dad Barry Michels — Phil's longtime business partner who helped develop Phil's ideas. He's turned around the lives of countless people — CEOs of billion dollar companies, actors, producers, directors, some of whom were on the verge of self-destruction."),
    ("stutz-michels-the-tools-bestseller", 537,
     "Phil Stutz and Barry Michels wrote NYT bestseller 'The Tools' and follow-up 'Coming Alive' — practice involves Jungian archetypal-symbology visualizations for daunting everyday situations. Unconventional but empirically works.",
     "person-jesse-michels", "on_record_statement",
     ["person-phil-stutz", "person-barry-michels", "document-stutz-michels-the-tools"],
     "Phil and my dad wrote A New York Times best-selling book called The Tools and a follow-up called Coming Alive. Their practice involves mental visualizations that incorporate archetypal Jungian symbology. Whatever they're doing empirically seems to work."),
    ("hill-stutz-netflix-doc", 527,
     "Jonah Hill directed Netflix documentary 'Stutz' (2022) about Jesse's godfather Phil Stutz — public platform for Stutz's unorthodox therapeutic methodology.",
     "person-jesse-michels", "on_record_statement",
     ["person-jonah-hill", "person-phil-stutz", "document-stutz-netflix-documentary"],
     "Jonah Hill made a Netflix documentary about him a year ago called Stutz."),
]

# V98 ePdH01pphbk — Pillsbury Rogin on China
VID98 = "ePdH01pphbk"
entities_98 = [
    P("michael-pillsbury", "Michael Pillsbury", VID98, 562,
      "US China-hawk strategist; The Hundred-Year Marathon author",
      "American strategist specializing in China; decades in US national security apparatus. Author of 'The Hundred-Year Marathon' on China's long-term plan to replace US as global superpower. Jesse Michels interview guest.",
      ["Pillsbury"], "strategist",
      ["strategist", "China-expert", "author"]),
    P("josh-rogin", "Josh Rogin", VID98, 562,
      "Washington Post columnist; CCP-scrutiny journalist",
      "Washington Post columnist; consistent public critic of CCP human rights abuses and US-China dynamics.",
      ["Rogin"], "journalist",
      ["journalist", "China-analyst"]),
    P("xi-jinping", "Xi Jinping", VID98, 562,
      "Chinese Communist Party General Secretary",
      "General Secretary of the Chinese Communist Party since 2012. Per Pillsbury: Chinese people see him as the leader who will restore China to 'its rightful place.'",
      ["Xi"], "politician",
      ["politician", "China", "CCP"]),
    P("bill-nelson-nasa", "Bill Nelson (NASA Administrator)", VID98, 574,
      "NASA Administrator; publicly befuddled by China Moon dark-side rovers",
      "Bill Nelson — NASA Administrator; publicly expressed confusion over China's decision to send rovers to the dark side of the moon — 'I have no idea why they made that decision.'",
      ["Nelson"], "official",
      ["NASA", "official"]),
    P("david-rocca", "David Rocca (EMP analyst)", VID98, 0,
      "EMP-threat analyst (contextual reference)",
      "Contextual expert on EMP-nuclear-grid threat scenarios referenced in the Pillsbury interview.",
      [], "analyst", ["analyst"]) if False else None,
    event("2023-chinese-spy-balloon", "2023 Chinese Spy Balloon (Billings Montana)", "sighting", "2023-01-28",
        [src(VID98, 578, "Chinese high-altitude surveillance balloon spotted over Billings MT Jan 2023")],
        summary="January 2023: Chinese surveillance balloon spotted over Billings Montana — flew over Aleutian island chain on approach (first line of US ICBM-radar defense). Possibly testing US radar detection limits. Possibly delivery mechanism for EMP."),
    concept("hundred-year-marathon", "The Hundred-Year Marathon (Pillsbury Thesis)", "politics",
        [src(VID98, 562, "Pillsbury's thesis on China's 100-year plan to replace US")],
        summary="Michael Pillsbury's thesis: the CCP has been executing a hundred-year marathon to replace the United States as global superpower by 2049 (centenary of founding of PRC). FBI now opening new China-related counterintelligence cases every ~10 hours."),
]
entities_98 = [e for e in entities_98 if e is not None]

claims_98 = [
    ("pillsbury-fbi-10-hours-china-case", 562,
     "Per Pillsbury: the FBI is opening a new China-related counterintelligence case approximately every 10 hours — quantitative pace-of-threat metric.",
     "person-jesse-michels", "cited_from_document",
     ["person-michael-pillsbury", "concept-hundred-year-marathon"],
     "The FBI is opening a new China related counterintelligence case about every 10 hours. Didn't you find that unusual? Yes, I found that quite unusual."),
    ("pillsbury-xi-restore-china", 562,
     "Pillsbury's framing: Chinese people see Xi Jinping as 'the guy who's going to restore China to its rightful place' — geopolitical vision driving hundred-year-marathon execution.",
     "person-jesse-michels", "cited_from_document",
     ["person-michael-pillsbury", "person-xi-jinping",
      "concept-hundred-year-marathon"],
     "Xi Jinping to Chinese as I understand it — they see him as the guy who's going to restore China to its rightful place."),
    ("ccp-recommending-three-body-problem-students", 568,
     "CCP and its education officials have been recommending The Three-Body Problem trilogy to Chinese students — despite the trilogy's depiction of Chinese Cultural Revolution brutalities and anti-government undercurrents. Possibly soft-disclosure of alien-threat framework.",
     "person-jesse-michels", "cited_from_document",
     ["person-michael-pillsbury", "document-three-body-problem"],
     "The CCP and its education officials have been recommending the three-body problem to students across China. Does the Chinese Communist Party believe in aliens? I don't know, maybe that's a way for the Chinese government to acclimatize the populace."),
    ("china-moon-dark-side-rovers", 574,
     "China sending rovers to the dark side of the moon — NASA Administrator Bill Nelson publicly admits 'I have no idea' why they made that decision. Strategic or UAP-related motivation unclear.",
     "person-jesse-michels", "cited_from_document",
     ["person-bill-nelson-nasa"],
     "They are sending Rovers to the dark side of the moon — a move that's even befuddling to NASA administrator Bill Nelson. Why do you think they made that decision? I'm curious. I have no idea."),
    ("china-spy-balloon-aleutian-path", 581,
     "January 2023 Chinese spy balloon flew over Aleutian island chain in Alaska before hitting Montana — the US's first line of ICBM-radar defense. Flight path suggests testing limits of US radar detection of high-altitude objects (modern spy balloons can reach 200,000 ft).",
     "person-jesse-michels", "speculation",
     ["event-2023-chinese-spy-balloon"],
     "Before hitting Montana, it flew over the Aleutian island chain in Alaska. This is the US's first line of defense, an ICBM radar system meant to detect foreign missiles. Modern spy balloons can now travel up to 200,000 ft. Could this spy balloon have been testing the limit of US radar detection capabilities?"),
    ("tiktok-bytedance-track-us-citizen", 585,
     "2022 revelation: ByteDance (TikTok parent) planned to use the app to monitor the location of specific American citizens — weaponized investigations team to collect data about a US citizen who was simply a TikTok consumer.",
     "person-jesse-michels", "cited_from_document",
     ["event-2023-chinese-spy-balloon"],
     "In 2022 it was revealed that ByteDance, the parent company of TikTok, planned to use the social media app to monitor the location of specific American citizens. The company weaponized an investigations team to collect data about the location of a US citizen."),
]


if __name__ == "__main__":
    print("Extending videos 83-98 (FINAL BATCH)...")
    extend(VID83, entities_83, claims_83)
    extend(VID84, entities_84, claims_84)
    extend(VID85, entities_85, claims_85)
    extend(VID86, entities_86, claims_86)
    extend(VID87, entities_87, claims_87)
    extend(VID88, entities_88, claims_88)
    extend(VID89, entities_89, claims_89)
    extend(VID90, entities_90, claims_90)
    extend(VID91, entities_91, claims_91)
    extend(VID92, entities_92, claims_92)
    extend(VID93, entities_93, claims_93)
    extend(VID94, entities_94, claims_94)
    extend(VID95, entities_95, claims_95)
    extend(VID96, entities_96, claims_96)
    extend(VID97, entities_97, claims_97)
    extend(VID98, entities_98, claims_98)
    print("ALL 98 VIDEOS COMPLETE.")
