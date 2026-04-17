"""Deep claim extraction for videos 3-5: Charles Hall, Weinstein/Puthoff, Hancock.

Extends existing pattern-matched entities with focused claim nodes drawn from
reading the cleaned transcripts. Idempotent.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _extract_v1_builders import src, claim, edge, person, incident, technology, concept, document, event
from _extract_helpers import write_output


def extend(vid: str, dur: float, new_entities: list[dict],
           claims_data: list[tuple]) -> None:
    path = Path(__file__).parent / "entities" / f"{vid}.json"
    existing = json.loads(path.read_text())
    nodes: list[dict] = list(existing["nodes"])
    edges_list: list[dict] = list(existing["edges"])
    ids = {n["id"] for n in nodes}

    def S(t=0, q=""):
        return [src(vid, t, None, q)]

    for e in new_entities:
        if e["id"] not in ids:
            nodes.append(e)
            ids.add(e["id"])

    for slug, t, stmt, asserter, assertability, subs, quote in claims_data:
        cl = claim(slug, stmt, asserter, vid, t, assertability, subs,
                   S(t, quote), quote=quote)
        nodes = [n for n in nodes if n["id"] != cl["id"]]
        ids.discard(cl["id"])
        nodes.append(cl)
        ids.add(cl["id"])
        edges_list.append(edge(asserter, cl["id"], "ASSERTED",
                              S(t, stmt[:200]), 0.95))
        edges_list.append(edge(f"video-{vid}", cl["id"], "REFERENCES",
                              S(t), 0.95))
        for subj in subs:
            if subj != asserter and subj != f"video-{vid}":
                edges_list.append(edge(cl["id"], subj, "REFERENCES",
                                      S(t), 0.85))

    out = {"video_id": vid, "nodes": nodes, "edges": edges_list}
    write_output(out, vid)
    print(f"  {vid}: {len(nodes)} nodes, {len(edges_list)} edges")


def build_person(slug, label, sources, summary, aliases=None, prof="",
                 notability=None):
    return person(slug, label, sources, summary=summary,
                  aliases=aliases or [], profession=prof,
                  notability=notability or [])


# =====================================================================
# VIDEO 3: QgxjtDS2sIQ — Charles Hall, Tall Whites
# =====================================================================
VID3 = "QgxjtDS2sIQ"
DUR3 = 8506.0  # 2:21:46

S3 = lambda t=0, q="": [src(VID3, t, None, q)]

entities_3 = [
    build_person("charles-hall", "Charles Hall",
        S3(10, "USAF Air Force weather observer stationed at Nellis AFB"),
        summary="USAF weather observer at Nellis AFB Indian Springs Gunnery Range 1965-1967. Claims 2+ years of direct interactions with extraterrestrial 'Tall Whites'. Authored the 'Millennial Hospitality' series and 'whole photon theory'.",
        aliases=["Hall"], prof="military veteran / author",
        notability=["witness", "USAF", "experiencer", "author"]),
    build_person("timothy-taylor-nasa", "Timothy Taylor",
        S3(13, "NASA researcher with interest in experiencers"),
        summary="NASA scientist with research interest in experiencer phenomena; friend of Charles Hall.",
        aliases=["Taylor"], prof="scientist",
        notability=["NASA", "researcher"]),
    concept("whole-photon-theory", "Whole Photon Theory", "physics",
        S3(37, "First copyrighted whole photon theory in 1997"),
        summary="Charles Hall's subatomic-particle theory proposing many more particles and force fields exist than relativity accounts for; reportedly developed after observing Tall White craft exceeding speed of light."),
    technology("tall-white-craft", "Tall White Craft", "craft",
        S3(66, "Egg-shaped craft used by the Tall Whites"),
        summary="Smooth, rounded, ellipsoidal egg-shaped craft per Hall; resembling Tic Tac / Nimitz morphology; faster-than-light capability."),
    technology("gray-craft", "Gray Craft", "craft",
        S3(52, "Craft used by Grays, lesser technology but more numerous"),
        summary="Per Hall, 90% of extraterrestrial craft sightings are Gray technology; origin claimed to be a star closer than the Tall Whites' system."),
    build_person("amal-marzac", "Amal Marzac",
        S3(36, "Filmmaker who made Walking With The Tall Whites Aftermath with Hall"),
        summary="Documentary filmmaker; collaborated with Charles Hall on 'Walking with the Tall Whites Aftermath'.",
        aliases=[], prof="filmmaker",
        notability=["filmmaker"]),
]

claims_3 = [
    ("hall-nellis-1965-1967", 22,
     "Charles Hall served as a USAF weather observer at Nellis AFB's Indian Springs Gunnery Range from March 1965 to May 1967.",
     "person-charles-hall", "personal_account",
     ["person-charles-hall", "organization-us-air-force", "location-nellis-air-force-base"],
     "I was a weather observer in the US Air Force and I was stationed at Nellis Air Force Base from March of 1965 until May of 1967."),
    ("hall-tall-whites-interactions", 28,
     "Hall claims years of direct interactions with extraterrestrial 'Tall Whites' at Indian Springs, developing trust and recognizing family groups (parents, children, elders).",
     "person-charles-hall", "personal_account",
     ["person-charles-hall", "concept-nhi"],
     "He saw family groups, parents, children, elders. He would even end up referring to one of them as something like a brother."),
    ("hall-three-species", 30,
     "Hall describes encountering three distinct extraterrestrial species: Tall Whites, Grays (more numerous, closer origin), and Nordics (most diplomatic).",
     "person-charles-hall", "personal_account",
     ["person-charles-hall", "concept-nhi"],
     "The tall white technology was better than the technology of the grays. The grays come from a planet that's closer. Then there are the Nordics."),
    ("hall-einstein-wrong", 46,
     "Hall asserts the shock of his Air Force experience was not that extraterrestrials existed, but that Einstein's relativity was wrong — the craft he observed exceeded light speed many times over.",
     "person-charles-hall", "personal_account",
     ["person-charles-hall", "concept-whole-photon-theory"],
     "The biggest shock that I felt was discovering that Einstein was wrong about relativity. The craft could easily exceed the speed of light by many times."),
    ("hall-arcturus-trip", 60,
     "Hall recounts a 2-month period in 1965 where he believed his Tall White interlocutors had traveled to a star near Arcturus (~36 light years), requiring craft capable of ~44× light speed minimum.",
     "person-charles-hall", "personal_account",
     ["person-charles-hall", "concept-whole-photon-theory"],
     "A reasonable guess would have been the star Arcturus. Arcturus is 36 light years away. To go anywhere and come back in 2 months, the craft had to travel quite a few times faster than the speed of light, like 44 times."),
    ("hall-craft-morphology", 68,
     "Hall describes Tall White craft as smooth ellipsoidal egg-shaped, comparable to a Tic Tac or engine of a passenger train with rounded features — morphology later popularized by the 2004 Nimitz Tic Tac incident.",
     "person-charles-hall", "personal_account",
     ["person-charles-hall", "technology-tall-white-craft", "technology-tic-tac"],
     "Like tic tacs. Like white eggs. They were eggshaped. Smooth and round like a round. It was ellipsoidal."),
    ("hall-hieroglyphics-writing", 74,
     "Hall claims Tall White writing resembled Egyptian hieroglyphics, leading some other rangemen to hypothesize they were ancient Egyptians trapped in Indian Springs Valley.",
     "person-charles-hall", "personal_account",
     ["person-charles-hall", "technology-tall-white-craft"],
     "A couple of the other rangemen thought that they were ancient Egyptians who had somehow or another gotten into Indian Springs Valley."),
    ("hall-underground-facility-indian-springs", 29,
     "Hall claims the Tall Whites lived in underground facilities with hangars at the north end of Indian Springs Valley, a story strikingly parallel to Bob Lazar's S-4 account.",
     "person-jesse-michels", "cited_from_document",
     ["person-charles-hall", "location-s4-papoose", "person-bob-lazar"],
     "Hall claims that the tall whites lived in underground facilities at the north end of Indian Springs Valley, complete with hangers for their craft, a story bearing striking resemblance to that of Bob Lazar."),
    ("hall-dreamland-area-53-54", 50,
     "Hall asserts that the real 'Dreamland' was Areas 53 and 54 (northern Indian Springs Valley and Dog Bone Valley), not Area 51 / Groom Lake which was merely the entry area in 1965.",
     "person-charles-hall", "personal_account",
     ["person-charles-hall", "location-groom-lake"],
     "Area 51 was not actually Dreamland itself. It was merely Groom Lake. Dreamland was area 53 and 54, which was the northern half of Indian Springs Valley."),
    ("hall-nasa-timothy-taylor", 12,
     "NASA scientist Timothy Taylor has a deep research interest in UAP experiencers and is a personal friend of Charles Hall.",
     "person-jesse-michels", "on_record_statement",
     ["person-timothy-taylor-nasa", "person-charles-hall", "organization-nasa"],
     "There's a guy at NASA who has a deep interest in these sorts of things, experiencers. His name is Timothy Taylor."),
]

# =====================================================================
# VIDEO 4: iQOibpIDx-4 — Eric Weinstein Debates Hal Puthoff
# =====================================================================
VID4 = "iQOibpIDx-4"
DUR4 = 3502.0  # 58:22

S4 = lambda t=0, q="": [src(VID4, t, None, q)]

entities_4 = [
    build_person("hal-puthoff", "Hal Puthoff",
        S4(10, "Senior advisor to AAWSAP/AATIP 2007-2012 via Bigelow Aerospace"),
        summary="Harold E. Puthoff. Stanford Research Institute physicist who co-led the CIA/DIA Stargate remote-viewing program. Later senior advisor to AAWSAP/AATIP (2007-2012) via Bigelow Aerospace's BAASS. Author of the 'Polarizable Vacuum' approach to general relativity.",
        aliases=["Puthoff", "Harold Puthoff", "Harold E. Puthoff"],
        prof="physicist",
        notability=["physicist", "SRI", "CIA", "AATIP", "Stargate"]),
    concept("polarizable-vacuum", "Polarizable Vacuum", "physics",
        S4(64, "Puthoff's mathematical approach to manipulating general relativity via vacuum dielectric constants"),
        summary="Puthoff's published physics approach: treating general relativity with polarizable vacuum (epsilon, mu) so the Einstein metric becomes a function rather than a constant, potentially enabling engineered gravity manipulation."),
    concept("geometric-unity", "Geometric Unity", "physics",
        S4(68, "Weinstein's unified theory proposing 14-dimensional spacetime"),
        summary="Eric Weinstein's unified theory proposing a 14-dimensional 'observerse' with extra temporal dimensions; claimed as more fundamental framework than Einstein's GR."),
    concept("aharonov-bohm-effect", "Aharonov-Bohm Effect", "physics",
        S4(54, "Electromagnetic four-potential has physical meaning beyond E/B fields"),
        summary="Quantum effect where an electron acquires a measurable phase shift from traveling around a solenoid, despite no electromagnetic fields outside. Puthoff cites this to argue the electromagnetic four-potential is physically fundamental."),
    concept("stigma-weaponization", "Stigma Weaponization", "politics",
        S4(80, "Use of social stigma by government to protect covert programs"),
        summary="Weinstein's argument: the US government has systematically wielded social stigma as a tool to deter academic and journalistic investigation of UAP-adjacent physics and research."),
    document("puthoff-polarizable-vacuum-paper", "Polarizable Vacuum Approach to General Relativity", "paper",
        S4(64, "Puthoff's peer-reviewed physics paper on PV-GR"),
        summary="Puthoff's published paper on an alternative formulation of general relativity using a polarizable vacuum with variable epsilon and mu.",
        author="Hal Puthoff"),
]

claims_4 = [
    ("puthoff-aatip-senior-advisor", 10,
     "Hal Puthoff served as senior advisor to AATIP from 2007 to 2012, operating out of Bigelow Aerospace's BAASS.",
     "person-jesse-michels", "on_record_statement",
     ["person-hal-puthoff", "program-aatip", "organization-baass", "organization-bigelow"],
     "Hal was a senior advisor to AATIP that ran from 2007 to 2012 out of Bigelow Aerospace."),
    ("puthoff-stargate-sri", 10,
     "Puthoff was a physicist on the CIA/DIA Stargate remote-viewing program conducted out of Stanford Research Institute (SRI).",
     "person-jesse-michels", "on_record_statement",
     ["person-hal-puthoff", "program-stargate-project", "organization-cia"],
     "He was called Stargate out of Stanford Research Institute."),
    ("weinstein-stigma-argument", 78,
     "Weinstein argues the US government systematically uses manufactured stigma to protect covert programs from outside scientific inquiry.",
     "person-eric-weinstein", "personal_account",
     ["person-eric-weinstein", "concept-stigma-weaponization"],
     "The government have a protocol to wield stigma. The first government that would do anything to protect itself would wield stigma as a tool."),
    ("anti-gravity-went-black", 22,
     "Weinstein and Puthoff converge on the thesis that 1950s antigravity research moved into classified black programs after the Chapel Hill conference and public-facing work stopped.",
     "person-jesse-michels", "on_record_statement",
     ["person-eric-weinstein", "person-hal-puthoff", "concept-antigravity", "event-1957-chapel-hill-conference"],
     "It went black. It quieted down because nobody ever got anywhere — or it got somewhere and it went black."),
    ("puthoff-polarizable-vacuum", 62,
     "Puthoff published an alternative formulation of general relativity treating the vacuum as polarizable (variable epsilon and mu), which he argues could enable engineered gravity control.",
     "person-hal-puthoff", "on_record_statement",
     ["person-hal-puthoff", "concept-polarizable-vacuum", "document-puthoff-polarizable-vacuum-paper"],
     "I have two patents by the way dealing with vector and scalar potentials. Epsilon and mu values — associated with all of the general relativity approach which I published in physics journal."),
    ("weinstein-geometric-unity-extra-time", 68,
     "Weinstein's geometric unity proposes extra temporal dimensions (total 14-D observerse), offering a framework where faster-than-light transit could happen by hacking the extra temporal dimension rather than violating causality in ordinary 4-D spacetime.",
     "person-eric-weinstein", "on_record_statement",
     ["person-eric-weinstein", "concept-geometric-unity"],
     "Strong versions of geometric unity in one case. 14 dimensions. Temporal dimension hacking which sort of makes it materialize and dematerialize."),
    ("puthoff-scientology-mind-control", 76,
     "Puthoff acknowledges involvement with Scientology in the era when 'checking into everything' about mind-control techniques was part of his research portfolio.",
     "person-hal-puthoff", "on_record_statement",
     ["person-hal-puthoff"],
     "At that time we were doing you know checking into everything. Mind control techniques were definitely of value."),
    ("ed-witten-string-theory-bridge", 40,
     "Weinstein privately concedes that string theory — heavily driven by Louis Witten's son Ed Witten — both allowed physics to appear to progress while breaking no new ground in the physical world, leaving the field frozen.",
     "person-eric-weinstein", "speculation",
     ["person-ed-witten", "person-louis-witten"],
     "String theory was a very odd development because it both allowed physics to proceed as new ground without actually breaking new ground in the physical world in which we live."),
    ("lockheed-martin-antigravity-lineage", 36,
     "Weinstein and Puthoff trace a physical-infrastructure lineage from the Glenn Martin Company through Martin Marietta / RIAS to modern Lockheed Martin — with Louis Witten employed and Wright-Patterson AFB linkages implicating antigravity research.",
     "person-eric-weinstein", "cited_from_document",
     ["person-louis-witten", "organization-martin-corporation", "organization-lockheed-martin", "organization-rias", "location-wright-patterson-afb"],
     "Glenn Martin company from the time of the Wright brothers — Marietta later becomes Lockheed Martin. Employing Lewis Whitton — Edward Whitton's dad."),
]

# =====================================================================
# VIDEO 5: dfPfPB601hw — Graham Hancock
# =====================================================================
VID5 = "dfPfPB601hw"
DUR5 = 4682.0  # 1:18:02

S5 = lambda t=0, q="": [src(VID5, t, None, q)]

entities_5 = [
    concept("younger-dryas-impact", "Younger Dryas Impact Theory", "physics",
        S5(14, "Asteroid/comet impact ~12,800 years ago causing global cataclysm"),
        summary="Hypothesis that a Torrid-meteor-stream impact ~12,800 years ago caused a global cataclysm wiping out an advanced ice-age civilization — Hancock's preferred framing for the mechanism of a civilizational reset."),
    concept("torrid-meteor-stream", "Taurid Meteor Stream", "physics",
        S5(58, "Ongoing cometary debris stream containing civilization-destroying potential"),
        summary="Annual meteor streams (Northern and Southern Taurids) from a disintegrated parent comet ~20,000 years ago. Hancock argues the next 30 years include a dangerous 'lumpy' crossing period."),
    document("fingerprints-of-the-gods", "Fingerprints of the Gods", "book",
        S5(10, "Hancock's 1995 cult classic on lost civilizations"),
        summary="Graham Hancock's 1995 book proposing that a sophisticated civilization predates Mesopotamian origins and left a worldwide legacy.",
        author="Graham Hancock", year=1995),
    document("ancient-apocalypse-netflix", "Ancient Apocalypse", "broadcast",
        S5(10, "Hancock's 2022+ Netflix docuseries"),
        summary="Graham Hancock's Netflix docuseries examining archaeological evidence for a lost pre-Younger-Dryas civilization.",
        author="Graham Hancock"),
    document("hancock-supernatural", "Supernatural", "book",
        S5(30, "Hancock's 2005 book on DMT, ayahuasca, and alien contact"),
        summary="Hancock's 2005 book on psychedelics, consciousness, and the 'other beings' encountered during ayahuasca and DMT use.",
        author="Graham Hancock", year=2005),
    document("gobekli-tepe-record", "Göbekli Tepe Archaeological Record", "report",
        S5(20, "Pre-agricultural megalithic complex in Turkey dating to ~9000 BC"),
        summary="Excavated from the 1990s; ~9000 BC megalithic complex in modern Turkey with 50-ton blocks, predating agricultural revolution and complicating the standard civilization timeline."),
    event("shoemaker-levy-9-jupiter", "Shoemaker-Levy 9 Jupiter Impact", "other", "1994-07-01",
        S5(62, "Half-mile-wide comet impact on Jupiter equivalent to 6M megatons"),
        summary="1994 comet impact on Jupiter; Hancock cites its 6M-megaton equivalent (600× Earth's nuclear arsenal) as evidence of ongoing cometary threat."),
    event("tunguska-1908", "Tunguska Event", "other", "1908-06-30",
        S5(62, "Taurid-stream airburst flattening 2,000 sq miles of Siberian forest"),
        summary="1908-06-30 airburst in Siberia — flattened ~2,000 square miles of forest; timing suggests Taurid meteor stream origin per Hancock."),
    build_person("michael-shermer", "Michael Shermer",
        S5(38, "Skeptic who debated Hancock on JRE 2017 and later conceded ground"),
        summary="Founder of Skeptic Magazine; debated Hancock on Joe Rogan Experience 2017; later acknowledged Hancock's case for a missing ice-age chapter of human history.",
        aliases=["Shermer"], prof="author",
        notability=["skeptic", "author"]),
    build_person("allan-west", "Allan West",
        S5(68, "Comet Research Group scientist warning of Taurid danger"),
        summary="Comet Research Group scientist cited by Hancock as warning that the next 30 years are dangerous for Taurid-stream encounters.",
        aliases=[], prof="scientist",
        notability=["scientist", "comet-research-group"]),
    build_person("randall-carlson", "Randall Carlson",
        S5(6, "Geologist and Younger Dryas Impact proponent; opens the video with Hancock"),
        summary="American geologist and Younger Dryas Impact Theory proponent; frequent Hancock collaborator.",
        aliases=["Randall"], prof="geologist",
        notability=["researcher", "geologist"]),
]

claims_5 = [
    ("hancock-younger-dryas-thesis", 14,
     "Hancock's central thesis: an asteroid/comet impact ~12,800 years ago (Younger Dryas boundary) triggered a global cataclysm and destroyed an advanced civilization, preserved only in ~2,000 flood myths and transmitted technical knowledge.",
     "person-graham-hancock", "on_record_statement",
     ["person-graham-hancock", "concept-younger-dryas-impact", "concept-torrid-meteor-stream"],
     "This hypothesis known as the younger dryas impact theory sustains that an asteroid from the torrid meteor stream hit the earth causing a global cataclysm."),
    ("gobekli-tepe-challenges-timeline", 20,
     "Gobekli Tepe (~9000 BC, 50-ton blocks, pre-agricultural) demonstrates hunter-gatherers could organize megalithic construction, overturning the standard Fertile-Crescent civilization-origin model.",
     "person-graham-hancock", "cited_from_document",
     ["person-graham-hancock", "document-gobekli-tepe-record"],
     "Gobekli Tepe an ancient burial site in modern Turkey dating as far back as 9000 BC and involving the complex assembly of 50 ton blocks. It's not something that you're a hunter-gatherer and you wake up one morning and think oh I'm just going to build the largest megalithic site."),
    ("hancock-2000-flood-myths", 26,
     "Hancock claims ~2,000 flood myths across unconnected cultures corroborate a global flooding event at the end of the last ice age.",
     "person-graham-hancock", "cited_from_document",
     ["person-graham-hancock", "concept-younger-dryas-impact"],
     "That story is one of approximately 2,000 flood conditions found all around the world, clearly documenting a global phenomenon."),
    ("taurid-stream-ongoing-threat", 58,
     "Hancock cites Alan West (Comet Research Group) warning the next 30 years include a 'lumpy and dangerous' Taurid-stream crossing period.",
     "person-graham-hancock", "cited_from_document",
     ["person-graham-hancock", "person-allan-west", "concept-torrid-meteor-stream"],
     "Dr Alan West one of the scientists from the comet research group points that out that the next 30 years are a danger time."),
    ("shoemaker-levy-scale", 62,
     "Shoemaker-Levy 9's 1994 Jupiter impact released ~6 million megatons — 600× the destructive force of Earth's entire nuclear arsenal — despite being only half a mile wide.",
     "person-graham-hancock", "cited_from_document",
     ["event-shoemaker-levy-9-jupiter"],
     "Its impact on Jupiter was the equivalent to 6 million megatons of TNT or 600 times the destructive force of the entire Earth nuclear Arsenal."),
    ("tunguska-taurid-origin", 64,
     "Tunguska 1908 (30 June) airburst's timing coincides with the Taurid-stream peak, suggesting Taurid origin per Hancock.",
     "person-graham-hancock", "speculation",
     ["event-tunguska-1908", "concept-torrid-meteor-stream"],
     "The fact that it occurred on the 30th of June suggests very strongly that it was part of the Taurid meteor stream because that is the peak of the Taurids in June."),
    ("shermer-concession-hancock", 42,
     "Michael Shermer — once a dogmatic Hancock skeptic — privately conceded by email that Hancock's Ancient Apocalypse made a good case for a forgotten ice-age civilization chapter.",
     "person-graham-hancock", "personal_account",
     ["person-graham-hancock", "person-michael-shermer"],
     "I had an email from him concerning my ancient Apocalypse series on Netflix where he kindly said that he felt I'd made a good case for my basic proposition."),
    ("nasa-dart-comet-deflection", 66,
     "NASA's DART mission (2021-2022) successfully altered asteroid Dimorphos' orbit, proving human ability to deflect small objects — but Dimorphos' 200m diameter is far below civilization-threatening scale.",
     "person-jesse-michels", "cited_from_document",
     ["organization-nasa", "concept-torrid-meteor-stream"],
     "NASA's DART program aimed to prove that humans can deflect asteroids with satellites. Dimorphos has a diameter of 200 meters, not even close to the half mile width of Shoemaker Levy."),
    ("hancock-skeptic-reaction-dogmatic", 48,
     "Hancock argues mainstream archaeology reflexively dismisses pre-Younger-Dryas civilization evidence because it dovetails with biblical flood narratives, which researchers feel they must oppose as unscientific.",
     "person-graham-hancock", "speculation",
     ["person-graham-hancock"],
     "Why they reflexively might deny this is because it interestingly dovetails with stories in the Bible and other religious texts around great floods."),
    ("supernatural-dmt-alien-contact", 30,
     "Hancock's 2005 book Supernatural documents his argument that DMT / ayahuasca states access the same class of 'other beings' classically interpreted as aliens or spirits across cultures.",
     "person-graham-hancock", "on_record_statement",
     ["person-graham-hancock", "document-hancock-supernatural", "concept-nhi"],
     "His fascinating beliefs on aliens which he writes about in his 2005 hitbook Supernatural."),
]


if __name__ == "__main__":
    print("Extending videos 3-5 with deep claim extractions...")
    extend(VID3, DUR3, entities_3, claims_3)
    extend(VID4, DUR4, entities_4, claims_4)
    extend(VID5, DUR5, entities_5, claims_5)
    print("Done.")
