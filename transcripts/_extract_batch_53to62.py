"""Deep claim extraction for videos 53-62."""
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


# V53 ABw7EsWh2Us — Jorjani Nazi UFO Pt 2
VID53 = "ABw7EsWh2Us"
entities_53 = [
    P("john-foster-dulles", "John Foster Dulles", VID53, 17,
      "US Secretary of State; brother of Allen Dulles; financier of Nazi rise",
      "US Secretary of State 1953-1959; brother of CIA director Allen Dulles. Per Jorjani, together with Allen, JP Morgan Chase, and Rockefeller, funded the rise of Nazi Germany.",
      ["Dulles"], "diplomat", ["historical", "official"]),
    concept("nazi-atlantean-thesis", "Nazi–Atlantean Continuity Thesis", "politics",
        [src(VID53, 7, "Jorjani thesis: surviving ice-age civilization informing modern politics")],
        summary="Jorjani's speculative thesis linking: Allen/John Foster Dulles and Rockefeller/Morgan funding of Nazi Germany; Nazi foo-fighter/saucer projects; pre-Roswell Spain-launched saucer sightings; Atlantean surviving-remnant groups; and time-travel self-actualization of future cultures."),
    incident("1946-mediterranean-sea-saucers", "1946 Mediterranean Saucers Launching From Spain", "sighting", "1946-01-01",
        [src(VID53, 19, "Saucer-shaped rocket-like things launched from Spain toward America pre-Roswell")],
        summary="Per Jorjani: rocket-like saucer-shaped things seen launched from Spain and the Mediterranean coast toward America in 1946 — one year before Roswell."),
]
claims_53 = [
    ("jorjani-dulles-rockefeller-nazi-funding", 17,
     "Jorjani asserts Allen Dulles and his brother John Foster Dulles — together with JP Morgan Chase and Rockefeller — funded the rise of Nazi Germany; implication is a continuing Nazi-sleeper-cell undergirding American politics.",
     "person-jason-jorjani", "cited_from_document",
     ["person-jason-jorjani", "person-allen-dulles", "person-john-foster-dulles",
      "concept-nazi-atlantean-thesis"],
     "Allen Dulles and his brother John Foster Dulles together with JP Morgan Chase and Rockefeller funded the rise of the Nazis. Is the implication that there's some sort of Nazi sleeper cell undergirling American politics today."),
    ("jorjani-1946-spain-saucers-preroswell", 19,
     "Per Jorjani: people were seeing rocket-like saucer-shaped things being launched from Spain and the Mediterranean coast toward America in 1946 — a year BEFORE Roswell.",
     "person-jason-jorjani", "cited_from_document",
     ["person-jason-jorjani", "incident-1946-mediterranean-sea-saucers"],
     "They were seeing these rocket-like things that were saucer shaped being launched from Spain, the Mediterranean coast over toward America. One year later, what happens? Roswell."),
    ("jorjani-future-culture-self-contact", 27,
     "Jorjani entertains: what we label NHI contact may be a future state of a specific terrestrial culture reaching back and contacting itself in the past — pulling the timeline toward its own actualization.",
     "person-jason-jorjani", "speculation",
     ["person-jason-jorjani", "concept-time-travel-hypothesis"],
     "For all we know, what's happening is that a future state of a certain culture is contacting itself in the past, trying to pull the timeline towards itself. Actualize itself, temporize itself."),
    ("jorjani-decline-of-philosophy", 37,
     "Jorjani argues civilizational decline in philosophy — reduced to academic scholasticism — prevents serious engagement with close-encounter data and parapsychology; invokes William James and Henri Bergson as early philosophical contributors to parapsychology.",
     "person-jason-jorjani", "on_record_statement",
     ["person-jason-jorjani"],
     "One of the most significant crises is the decline of philosophy. The reduction of philosophy to academic scholasticism. William James and Henri Bergson played a fundamental role in development of parapsychology at its outset."),
]

# V54 JGE1NIGhBzw — Randall Carlson Moon
VID54 = "JGE1NIGhBzw"
entities_54 = [
    P("randall-carlson-extended", "Randall Carlson (extended)", VID54, 61,
      "Geologist; Younger Dryas Impact researcher; Hancock collaborator",
      "Master builder and geologist; proponent of Younger Dryas Impact hypothesis; Graham Hancock's frequent research collaborator.",
      ["Carlson"], "geologist / researcher",
      ["researcher", "geologist"]),
    concept("moon-as-engineered", "Moon as Engineered Object Hypothesis", "metaphysics",
        [src(VID54, 51, "Moon may be geoengineered — mass, density, orbit anomalies")],
        summary="Randall Carlson's entertained hypothesis: the Moon may be a geoengineered object. Insufficient spherical deformation despite sufficient mass; predates Earth despite alleged Earth-origin; anomalous 10x+ vibrational train post-impact; rare refractory metals (U-236, chromium, titanium); tidal locking suspiciously perfect."),
    location("chimney-rock-chacoan", "Chimney Rock (Chacoan Site, Colorado)", "observation_site",
        [src(VID54, 79, "Ancient astronomical observatory tied to 18.6-year lunar cycle")],
        country="US", state="Colorado"),
    concept("lunar-major-standstill-18-6", "18.6-Year Lunar Standstill Cycle", "physics",
        [src(VID54, 77, "Full lunar maximum/minimum rising/setting cycle")],
        summary="The 18.6-year cycle between the Moon's maximum and minimum rising and setting points — tracked by ancient astronomy observatories worldwide (including Chimney Rock Chacoan outlier)."),
]
claims_54 = [
    ("carlson-moon-less-dense-predates-earth", 69,
     "Per Carlson: the Moon is less dense than Earth yet allegedly formed FROM Earth via impact; the moon's material is claimed to predate Earth itself — a contradiction.",
     "person-randall-carlson-extended", "on_record_statement",
     ["person-randall-carlson-extended", "concept-moon-as-engineered"],
     "It is way less dense than the Earth. The material predates the Earth and yet it's supposed to have come from the Earth itself from some sort of asteroid impact. So that doesn't make sense."),
    ("carlson-moon-rings-10x-earth", 71,
     "When Apollo 12 and 13 landers struck the Moon, NASA-placed seismometers recorded vibrational trains 10× or more longer than Earth equivalents — consistent with hollow or hollow-engineered body.",
     "person-randall-carlson-extended", "cited_from_document",
     ["person-randall-carlson-extended", "concept-moon-as-engineered"],
     "There were reverberations when the lunar lander hit it both in Apollo 12 and Apollo 13 you had ringing. The moon has a long vibrational train after, like 10 times or more that of say the earth."),
    ("carlson-u236-refractory-metals", 71,
     "The Moon contains Uranium-236, chromium, and titanium — rare high-refractory metals — inconsistent with the standard Earth-ejecta-origin hypothesis.",
     "person-randall-carlson-extended", "cited_from_document",
     ["person-randall-carlson-extended", "concept-moon-as-engineered"],
     "You have uranium 236 and chromium and chromium and titanium on the moon. These are sort of rather rare high refractory metals."),
    ("carlson-atlantis-mid-atlantic-ridge", 49,
     "Carlson argues marine geology and oceanography of the Atlantic Ocean basin show overwhelming evidence of major subsidence — especially along Mid-Atlantic Ridge — consistent with Atlantis hypothesis; current islands are mountain tops of submerged ranges.",
     "person-randall-carlson-extended", "on_record_statement",
     ["person-randall-carlson-extended", "concept-younger-dryas-impact"],
     "You can interpret the evidence that there is a strong case for the existence of Atlantis. I've studied the marine geology and oceanography of the Atlantic Ocean basin. Overwhelming evidence of major subsidence on the floor of the Atlantic Ocean, particularly concentrated along the Mid-Atlantic ridge. Those islands are the tops of mountains."),
    ("carlson-imperial-mammoth-giants", 53,
     "Carlson notes mammalian megafauna (Imperial Mammoth 16ft, Ursus spelaeus bear 12ft standing) were oversized in the ice age — asks why not humans too? Ties to giants tradition across cultures.",
     "person-randall-carlson-extended", "speculation",
     ["person-randall-carlson-extended", "concept-watchers-nephilim"],
     "The Imperial Mammoth stood 16 ft tall. The Ursus Spalius bear stood 6 feet at shoulder and 12 feet on hind legs. If you had all of these mammalian megafauna oversized compared to today, why not people? There were giants."),
    ("carlson-chimney-rock-18-6-year-cycle", 79,
     "Chimney Rock (Chacoan civilization outlier in Colorado) is one of many ancient astronomy observatories built to track the 18.6-year lunar-standstill cycle — reflecting obsessive ancient interest in the Moon that modern culture lacks.",
     "person-randall-carlson-extended", "cited_from_document",
     ["person-randall-carlson-extended", "location-chimney-rock-chacoan",
      "concept-lunar-major-standstill-18-6"],
     "Our ancestors all over the ancient world paid obsessive attention to the moon. They built huge structures dedicated to observing the motions of the moon. Track the 18.6 year lunar cycle. There's a place called Chimney Rock in Colorado."),
]

# V55 IWui5cBkwoE — Kevin Knuth NASA whistleblower
VID55 = "IWui5cBkwoE"
entities_55 = [
    P("kevin-knuth", "Kevin Knuth", VID55, 105,
      "Physicist, University at Albany; former NASA; UFO physics researcher",
      "Physicist at SUNY Albany; former NASA; studies how UAP crafts actually fly and how to detect them. In 1988 at Montana State University encountered a Bozeman cattle mutilation coinciding with UFO reports — formative experience.",
      ["Knuth"], "physicist",
      ["scientist", "NASA", "researcher", "academic"]),
    P("alan-bean", "Alan Bean", VID55, 93,
      "Apollo 12 astronaut; Skylab commander who photographed UFO",
      "American astronaut; fourth person on moon (Apollo 12, 1969); Skylab commander; told Knuth that on Skylab they photographed a red flashing light — 'nobody puts lights on satellites.'",
      ["Bean"], "astronaut",
      ["astronaut", "NASA", "witness"]),
    P("story-musgrave", "Story Musgrave", VID55, 99,
      "Shuttle astronaut who witnessed 'snake-like objects' in space",
      "American astronaut; shuttle pilot; reported seeing 'snake-like objects writhing around in space' during missions.",
      ["Musgrave"], "astronaut",
      ["astronaut", "NASA", "witness"]),
    incident("1988-bozeman-cattle-mutilation", "1988 Bozeman Cattle Mutilation + UFO Reports", "sighting", "1988-09-01",
        [src(VID55, 119, "Two cows surgically manipulated with cylindrical core sample; hundreds of UFO reports same night")],
        summary="September 1988 incident at Montana ranch near Bozeman — two cows killed, blood drained, sensory organs and genitals removed, one with a cylindrical-core-sample hole punched through it. Hundreds of UFO reports in the county same night. Knuth's formative UAP encounter."),
    concept("underwater-uap-bases-hypothesis", "Underwater UAP Bases Hypothesis", "physics",
        [src(VID55, 103, "UAP phenomena around water suggest underwater bases")],
        summary="Hypothesis (per Knuth and many witnesses): UAPs emerging from water, following ships, centuries of sightings — most likely explanation is UAP bases underwater."),
]
claims_55 = [
    ("bean-skylab-red-flashing-light", 93,
     "Apollo 12 and Skylab astronaut Alan Bean told Knuth that on Skylab they actually photographed a red flashing light — 'nobody puts lights on satellites, you don't need them, it's more weight.'",
     "person-kevin-knuth", "cited_from_document",
     ["person-kevin-knuth", "person-alan-bean"],
     "I talked to Alan Bean. He was from Apollo 12. When he went up to Skylab, they actually photographed a red flashing light. Nobody puts lights on satellites."),
    ("knuth-cosmonaut-craft-alongside", 99,
     "Per Knuth: a Russian cosmonaut drew a picture of an object that pulled up alongside his craft and matched their orbit.",
     "person-kevin-knuth", "cited_from_document",
     ["person-kevin-knuth"],
     "They actually had a craft pull up alongside of them. They had their orbit. And the cosmonaut drew a picture of the object."),
    ("musgrave-snakes-in-space", 99,
     "Shuttle astronaut Story Musgrave reported seeing 'snakes writhing around in space' during missions — anomalous observation with no conventional explanation.",
     "person-kevin-knuth", "cited_from_document",
     ["person-kevin-knuth", "person-story-musgrave"],
     "Story Musgrave, a shuttle pilot, also talked about seeing things like snakes writhing around in space."),
    ("knuth-1988-cattle-mutilation-ufo-reports", 119,
     "Knuth's formative UAP experience: September 1988 at Montana State University — two ranch cows surgically manipulated (cylindrical core sample, blood drained, organs removed), coincident with hundreds of UFO reports in the county same night.",
     "person-kevin-knuth", "personal_account",
     ["person-kevin-knuth", "incident-1988-bozeman-cattle-mutilation"],
     "Our first week or two there, there was a cattle mutilation. Two cows were killed and surgically manipulated. The blood was drained, the sensory organs removed, the genitals removed. One of them had like a core sample. A cylindrical hole punched through it. There were UFO reports in the county that night, hundreds of reports."),
    ("knuth-underwater-bases-bet", 103,
     "Knuth: UAPs emerging from water, hovering by ships, and flying into clouds has been documented since the 1800s — 'that's why I think there's probably bases underwater is your best bet.'",
     "person-kevin-knuth", "speculation",
     ["person-kevin-knuth", "concept-underwater-uap-bases-hypothesis"],
     "This is a phenomena that people have seen for centuries. Balls of light coming out of the water, hovering next to the ship, following the ship, and then taking off into the clouds. I think there's probably bases underwater is your best bet."),
    ("knuth-nasa-nocommission-astronauts", 93,
     "Knuth asks: why, when the NASA UAP commission convened, was there no section on what astronauts have seen in space — despite well-documented astronaut UFO accounts?",
     "person-kevin-knuth", "on_record_statement",
     ["person-kevin-knuth", "organization-nasa"],
     "Why when we had the NASA commission, why was there no section on what astronauts have seen in space?"),
]

# V56 yAvD5UTziTo — John Blitch DARPA
VID56 = "yAvD5UTziTo"
entities_56 = [
    P("john-blitch", "Lt Col John Blitch", VID56, 135,
      "Former Delta Force, DARPA program manager, cognitive psychology PhD",
      "US Army Lieutenant Colonel; former Delta Force operator; long-term DARPA program manager (including rubble-search robotics); cognitive psychology PhD from Colorado School of Mines. Supports Jake Barber's crash-retrieval team's testimony — personally interviewed all four members.",
      ["Blitch"], "military / scientist",
      ["military", "Delta", "DARPA", "scientist"]),
    concept("bug-alien-flesh-tearing", "Bug-Alien Flesh-Tearing Experience (Blitch)", "psychic",
        [src(VID56, 133, "Blitch's alien-bug soul-integrity encounter")],
        summary="Blitch's personal encounter: a large 'bug' with triangular face opened jaws and tore flesh from his cheeks and shoulders — message was 'they could rip me to shreds if they wanted to but couldn't get to my soul.'"),
    P("sensei-daughter-blitch", "Blitch's Sensei's Daughter", VID56, 167,
      "Martial artist who broke Blitch's nose in black-belt test",
      "18-year-old martial artist who broke John Blitch's nose during his black-belt qualification test (5-on-1 against five black belts).",
      [], "martial artist", ["martial-artist"]),
    incident("blitch-fuel-truck-red-flannel", "Blitch Fuel-Truck / Red Flannel Abduction Fragment", "abduction", "1990-01-01",
        [src(VID56, 137, "Gushing bloody nose while biking; fuzzy fuel-truck / red-flannel man memory")],
        summary="Blitch's anomalous fragment memory: while biking, unexplained gushing bloody nose; fuzzy memory of 'fuel truck' with a man in red plaid/flannel shirt in the cab — missing-time/screen-memory signatures of an abduction event not previously discussed publicly."),
]
claims_56 = [
    ("blitch-alien-bug-soul-integrity", 133,
     "Blitch recounts a bug-like entity with a triangular face opening jaws and tearing flesh from his cheeks and shoulders — the message conveyed was 'they could rip me to shreds if they wanted to but couldn't get to my soul.'",
     "person-john-blitch", "personal_account",
     ["person-john-blitch", "concept-bug-alien-flesh-tearing"],
     "This big bug came through the screen door on our deck and his little triangle face opens up and these jaws open up and he starts tugging chunks of flesh off of me — from my cheeks, my shoulders. He wanted me to know that they could rip me to shreds if they wanted to but they couldn't get to my soul."),
    ("blitch-barber-team-validation", 161,
     "Blitch personally interviewed all four members of Jake Barber's crash-retrieval team looking for tradecraft-level inconsistencies between their accounts — found no hint of a red flag; this collaborative validation is core to why he believes them.",
     "person-john-blitch", "personal_account",
     ["person-john-blitch", "person-jake-barber"],
     "When we first met, I made all four of us, his full team of four. I was looking for inconsistencies between those folks. It was me against these four guys. I was looking for the slightest little glance between eyes. Never saw the slightest hint of a red flag."),
    ("blitch-barber-cct-records-verified", 155,
     "Blitch verified Jake Barber's records in the pre-CCT (Combat Control Team) training program — grounded in physical documentation rather than testimony alone.",
     "person-john-blitch", "personal_account",
     ["person-john-blitch", "person-jake-barber", "program-gte-air-force-10year"],
     "What I was able to verify was his track record in a pre-CCT training program. That's as far as I was able to validate by his records."),
    ("blitch-ss-no-flannel-fragment", 137,
     "Blitch discloses a previously-unspoken anomalous memory fragment: biking, unexplained gushing bloody nose, then fuzzy memory of a fuel truck with a man in a red plaid flannel — classic missing-time / screen-memory signatures of an abduction event.",
     "person-john-blitch", "personal_account",
     ["person-john-blitch", "incident-blitch-fuel-truck-red-flannel",
      "phenomenon-lost-time"],
     "A drop lands on my hand. I realize it's blood. There was no reason for me to have this gushing bloody nose. I have this fuzzy memory of a fuel truck — in the cab is this guy with a red plaid shirt — the guy in the flannel, the Red Flannel."),
    ("blitch-darpa-rubble-robotics", 143,
     "Blitch managed a DARPA rubble-search robotics program as his original academic-military focus — science underpinning before moving toward UAP-adjacent work.",
     "person-john-blitch", "personal_account",
     ["person-john-blitch"],
     "My first thesis was I built an expert system to recommend which robot to pick to go into rubble."),
]

# V57 D2tKCFmJjks — Herrera Indonesia (re-extraction)
VID57 = "D2tKCFmJjks"
entities_57 = [
    P("mark-mccandish", "Mark McCandish", VID57, 177,
      "UFO researcher behind 'Flux Liner' reverse-engineering story; died of cancer",
      "UFO researcher and illustrator; documented the 'Flux Liner' anti-gravity reverse-engineering story. Per Jesse, diagnosed with aggressive cancer and died ~3 weeks after his documentary work with James Allen.",
      ["McCandish"], "researcher / illustrator",
      ["researcher", "historical"]),
    P("james-allen-mccandish-doc", "James Allen (Mark McCandish documentarian)", VID57, 177,
      "Documentarian of Mark McCandish's Flux Liner account",
      "Documentarian who made the Mark McCandish Flex Liner documentary chronicling an alleged Navy reverse-engineering demonstration.",
      ["Allen"], "filmmaker", ["filmmaker"]),
    technology("flex-liner-alien-rep-vehicle", "Flex Liner / Alien Reproduction Vehicle (ARV)", "craft",
        [src(VID57, 177, "Classified alien-reverse-engineered anti-gravity craft per Mark McCandish")],
        summary="Classified Alien Reproduction Vehicle documented by Mark McCandish — US reverse-engineered anti-gravity aircraft allegedly demonstrated at a Navy facility in the 1980s."),
    event("operation-katsana-humanitarian-2009", "Operation Katsana (Humanitarian 2009)", "other", "2009-10-01",
        [src(VID57, 203, "31st Marine Expeditionary Unit humanitarian operation in Philippines")],
        summary="2009 humanitarian-assistance operation by the 31st Marine Expeditionary Unit, USS Denver — officially Philippines disaster response. Herrera's USS Denver was rerouted to western Sumatra in Indonesia where he encountered the UAP incident and Obama family relatives were reportedly being secured."),
    incident("2009-indonesia-herrera-octagon", "2009 Indonesia Herrera Octagon UAP Encounter", "sighting", "2009-10-15",
        [src(VID57, 179, "~300ft vantablack octagonal UAP over jungle; elite team intercept")],
        summary="2009 Herrera USMC 31st MEU encounter: ~300ft vantablack octagonal UAP hovering above Indonesian jungle treetops near western Sumatra. Unit intercepted by elite paramilitary team with bioscanners; DOE hazmat; threatened. Craft merged via platform with another craft."),
]
claims_57 = [
    ("herrera-greer-2018-boulder-card", 193,
     "In 2018 Herrera attended a Steven Greer Boulder CO event; Greer stopped the room, stood up and handed Herrera his card when he mentioned the Indonesia drug-running operation encounter.",
     "person-michael-herrera", "personal_account",
     ["person-michael-herrera", "person-steven-greer-full"],
     "Greer told everybody to shut up and he stood up and handed me his card and he was like, 'Don't tell anybody this information. Contact me when you're ready.'"),
    ("herrera-obama-relatives-indonesia-2009", 205,
     "Per Herrera: USS Denver was rerouted to western Sumatra Indonesia in 2009 because Obama family members were there — Obama lived there age 6-10 — SEAL team ready to extract relatives during unrest.",
     "person-michael-herrera", "personal_account",
     ["person-michael-herrera", "event-operation-katsana-humanitarian-2009"],
     "There was speculation, and we got briefed that there was some Obama's family members that were there. They had some SEAL team that was going to be there to retrieve those people. Obama lived there from age 6 to 10."),
    ("herrera-mccandish-died-3-weeks-cancer", 177,
     "Mark McCandish — the documentarian of the Flex Liner alien-reproduction-vehicle story — was diagnosed with aggressive cancer and dead within approximately 3 weeks. Jesse raises this as a pattern of fatal suppression.",
     "person-jesse-michels", "cited_from_document",
     ["person-mark-mccandish", "person-james-allen-mccandish-doc",
      "technology-flex-liner-alien-rep-vehicle"],
     "James Allen, the documentary of Mark McCandish and the Flex Liner story, he was diagnosed and dead of an aggressive form of cancer in about 3 weeks."),
    ("herrera-consciousness-summons-craft", 175,
     "Herrera's hypothesis: the vantablack octagonal craft's arrival was summoned by consciousness operations — 'summoning essentially technology that has consciousness to it.'",
     "person-michael-herrera", "speculation",
     ["person-michael-herrera", "concept-nhi"],
     "It's not like trying to summon a spirit. You're summoning essentially technology that has consciousness to it. That platform came into that craft itself."),
    ("herrera-smoke-or-kill-discussion", 175,
     "Herrera reports two of the intercepting paramilitary operators discussed whether to 'smoke' (kill) the Marines on the spot — indicating lethal-force discretion embedded in the retrieval team's operations.",
     "person-michael-herrera", "personal_account",
     ["person-michael-herrera", "incident-2009-indonesia-herrera-octagon"],
     "Two of the guys were actually talking about either, hey, should we smoke these guys right now? You know, that's what they kept saying."),
]

# V58 8TYMQOUDQBo — Salvatore Pais Navy Scientist
VID58 = "8TYMQOUDQBo"
entities_58 = [
    P("salvatore-pais", "Salvatore Pais", VID58, 229,
      "US Navy scientist; filed patents on UFO-like propulsion",
      "US Navy and former US Space Force scientist. Filed patents (2017+) on 'Hybrid Aerospace-Underwater Craft Using Inertial Mass Modification' and related UFO-adjacent technologies. The 'Pais Effect' is named after him.",
      ["Pais", "Sal Pais"], "physicist / engineer",
      ["scientist", "Navy", "Space Force"]),
    concept("pais-effect", "Pais Effect", "physics",
        [src(VID58, 219, "Inertial-mass modification via controlled electromagnetic fields")],
        summary="Salvatore Pais' proposed effect: modifying inertial/gravitational mass of an object via controlled electromagnetic fields (based on Oliver Heaviside's formulation of Maxwell's equations). If real, enables non-Newtonian propulsion."),
    document("pais-patents", "Pais Navy UFO Patents", "patent",
        [src(VID58, 225, "2017+ Navy patents on mass-modification hybrid craft")],
        summary="Patents filed by Salvatore Pais through the US Navy: Hybrid Aerospace-Underwater Craft Using Inertial Mass Modification Device; Room Temperature Superconductor; Force-Field Generator; High-Frequency Gravitational-Wave Generator.",
        author="Salvatore Pais"),
    incident("mh370-pais-effect-sighting", "MH370 Pais-Effect Sighting", "sighting", "2014-03-08",
        [src(VID58, 217, "Pais attributes MH370 disappearance to Pais-Effect signature")],
        summary="Pais claims the Malaysian Airlines MH370 2014 disappearance videos show a craft opening up which he identifies as the Pais Effect in action — i.e., NHI craft intervention."),
]
claims_58 = [
    ("pais-mh370-sighting", 217,
     "Pais states publicly that he saw the Pais Effect in the MH370 disappearance videos — 'when I saw that thing open up, I saw the Pais Effect, man. This is the Pais Effect. I'm gone.'",
     "person-salvatore-pais", "personal_account",
     ["person-salvatore-pais", "concept-pais-effect", "incident-mh370-pais-effect-sighting"],
     "You have spoken publicly with these MH370 videos. When I saw that thing open up, I saw the Pais Effect, man. This is the Pais Effect. I'm gone."),
    ("pais-external-enemy-warning", 217,
     "Pais warns: 'We must unite the factions because one day we shall have an external enemy — and by external I mean very external, ni. Think of the earth, we are a very yummy apple.'",
     "person-salvatore-pais", "on_record_statement",
     ["person-salvatore-pais"],
     "I truly think that one day we must unite the factions because one day we shall have an external enemy and by external enemy I mean very external. Think of the earth, we are a very yummy apple."),
    ("pais-remote-action-at-distance", 217,
     "Pais contends 'remote action is possible — can you imagine stopping a heart just by thinking about it, say from Qatar? That's some scary stuff.'",
     "person-salvatore-pais", "speculation",
     ["person-salvatore-pais"],
     "I think remote action is possible. Can you imagine stopping a heart just by thinking about it? Say from Qatar? That's some scary stuff."),
    ("pais-patents-maxwell-heaviside", 251,
     "Pais' patents are based on Oliver Heaviside's four-equation-four-unknown formulation of Maxwell's equations (not the original 21-variable quaternion formalism) — engineering reality of non-Newtonian propulsion via field manipulation.",
     "person-salvatore-pais", "on_record_statement",
     ["person-salvatore-pais", "document-pais-patents", "concept-pais-effect"],
     "Everything I've done is really based on Oliver Heaviside's version of Maxwell's equations. The four equation four unknowns that electrical engineers have grown up to love and use."),
    ("pais-expected-classified-contact", 249,
     "Pais expected to be contacted by classified US programs after filing his patents — his lack of contact leads him to conclude the programs already have this technology figured out and operational.",
     "person-salvatore-pais", "speculation",
     ["person-salvatore-pais", "document-pais-patents", "concept-reverse-engineering"],
     "At one point in time, I almost expected to be contacted. The idea occurred to me almost instantaneously that they must have this somewhere — they've already figured it out and they're already operating certain devices."),
]

# V59 51N8OxqZIWY — Epstein & Aliens
VID59 = "51N8OxqZIWY"
entities_59 = [
    P("jay-anderson", "Jay Anderson", VID59, 253,
      "Project Unity host and UFO researcher",
      "UFO researcher; podcast host; deep investigator of global cabal / Epstein / NHI intersections.",
      ["Anderson"], "researcher", ["researcher", "journalist"]),
    P("kurt-metzger", "Kurt Metzger", VID59, 253,
      "Comedian and conspiracy commentator",
      "American comedian with deep familiarity in conspiracy-theory discourse.",
      ["Metzger"], "comedian", ["comedian"]),
    P("jeffrey-epstein", "Jeffrey Epstein", VID59, 275,
      "Financier and convicted sex trafficker; global compromise/blackmail operation",
      "American financier; convicted sex trafficker; central to an international compromise/blackmail operation of elites. Officially died in prison 2019; circumstances disputed.",
      ["Epstein"], "financier",
      ["historical", "compromise-operation"]),
    P("ghislaine-maxwell", "Ghislaine Maxwell", VID59, 275,
      "Epstein's handler; currently imprisoned for sex trafficking",
      "British socialite; Epstein's handler in the compromise operation; currently imprisoned in US for sex trafficking. No 'clients' of hers have been publicly prosecuted.",
      ["Maxwell"], "socialite", ["historical", "imprisoned"]),
    P("robert-maxwell", "Robert Maxwell", VID59, 275,
      "British media mogul; Ghislaine's father; Mossad ties alleged",
      "British media mogul; father of Ghislaine Maxwell; widely alleged Mossad operative. Died 1991 under suspicious circumstances.",
      ["Maxwell Sr"], "media mogul",
      ["historical", "intelligence"]),
    organization("knights-of-malta", "Knights of Malta")  if False else None,
]
entities_59 = [e for e in entities_59 if e is not None]

claims_59 = [
    ("epstein-cell-video-metadata-edited", 289,
     "Wired magazine revealed metadata from Jeffrey Epstein's prison-cell video (the supposed proof of suicide) had been edited with Adobe Premiere — a full minute was missing from the original release.",
     "person-jesse-michels", "cited_from_document",
     ["person-jeffrey-epstein"],
     "Wired magazine just revealed that the metadata from Jeffrey Epstein's prison cell video that was supposed to point to a suicide had been edited, likely using Adobe Premiere. When it was originally released, a whole minute was missing."),
    ("epstein-clients-unprosecuted", 291,
     "Ghislaine Maxwell is imprisoned for sex trafficking but NO clients of her operation have been publicly prosecuted — a fundamental logical fallacy, indicating suppressed documents protecting specific individuals.",
     "person-jesse-michels", "on_record_statement",
     ["person-jeffrey-epstein", "person-ghislaine-maxwell"],
     "Ghislaine Maxwell is in jail right now for sex trafficking, but there are no perpetrators of the actual crime. Who were her clients? You have all these women, these victims coming out, but you have no clients. That's a basic logical fallacy."),
    ("anderson-metzger-vatican-city-london", 259,
     "Jay Anderson and Kurt Metzger: disproportionate global power is held by entities like the Vatican, City of London, and Knights of Malta — systems that align cleanly with Catherine Klov's deep-power-structure framings.",
     "person-jesse-michels", "speculation",
     ["person-jay-anderson", "person-kurt-metzger"],
     "The Vatican, City of London, you know, Knights of Malta. Do you think any of these groups have disproportionate power today? Oh yeah, like I would agree with Klov."),
    ("jfk-lone-shooter-epstein-lone-actor-parallel", 285,
     "Jesse parallels the JFK 'lone shooter' (Oswald) theory with the Epstein 'lone sex-trafficker' theory — both obviously fail the 'no accomplices' test, and both are disbelieved by the public via social media.",
     "person-jesse-michels", "on_record_statement",
     ["person-jeffrey-epstein", "person-jfk"],
     "Just like you have the lone shooter theory with JFK — you have the lone sex trafficker theory with Jeffrey Epstein. Nobody believes the state line here. And this time, due to social media, nobody believes anybody else believes this."),
]

# V60 Qe8br8yYEDM — Richard Barth Vandenberg 1964
VID60 = "Qe8br8yYEDM"
entities_60 = [
    P("richard-barth", "Richard Barth", VID60, 303,
      "USAF security guard at Vandenberg 1964 close-encounter abductee",
      "USAF Air Policeman stationed at Vandenberg AFB in September 1964; assigned to Minuteman missile on night shift; experienced a close encounter and abduction by a being emerging from fog — lost time, out-of-body view of Vandenberg from craft, received telepathic message aligning with other nuclear-base encounters.",
      ["Barth", "Bart"], "military veteran",
      ["witness", "abductee", "USAF", "Vandenberg"]),
    incident("1964-vandenberg-barth-abduction", "1964 Vandenberg Barth Abduction", "abduction", "1964-09-15",
        [src(VID60, 301, "Air Policeman Barth abducted at missile site in September 1964")],
        summary="September 1964 at Vandenberg AFB: USAF Air Policeman Richard Barth assigned to Minuteman missile on night shift; figure emerged from fog; Barth lost control and lost time; woke up on flying saucer with several beings observing Vandenberg from above; received telepathic message. Same month as Bob Jacobs' photographed UFO-Atlas-V incident."),
]
claims_60 = [
    ("barth-fog-figure-telepathic-control", 301,
     "Barth describes a figure emerging from the fog at his Minuteman missile post in September 1964; the being 'started grabbing hold of me' telepathically; Barth lost control and lost time.",
     "person-richard-barth", "personal_account",
     ["person-richard-barth", "incident-1964-vandenberg-barth-abduction"],
     "I see this shadow emerge from the fog. As it got closer, I realized this was not what it was. I could feel it in my mind. It started grabbing hold of me."),
    ("barth-saucer-hovering-vandenberg", 307,
     "Barth woke up on a flying saucer with a few beings overlooking the entire Vandenberg base — received a message directly connecting to other alien encounters by nuclear-base personnel.",
     "person-richard-barth", "personal_account",
     ["person-richard-barth", "incident-1964-vandenberg-barth-abduction",
      "location-vandenberg-afb"],
     "Richard is taken. He wakes up hovering on a flying saucer with a few more beings overlooking the entire Vandenberg base. Richard is given a message, one that directly connects with other alien encounters by nuclear base employees."),
    ("barth-same-month-jacobs-atlas-missile", 309,
     "Barth's September 1964 encounter occurred the same month as Bob Jacobs' photo-instrumentation capture of a UFO intercepting an Atlas missile test — implying coordinated NHI activity against Vandenberg's nuclear program.",
     "person-jesse-michels", "on_record_statement",
     ["person-richard-barth", "person-bob-jacobs", "incident-1964-big-sur-atlas"],
     "Richard had his encounter in September of 1964. That same month, Bob Jacobs caught video of a UFO that seemed to encircle an Atlas missile. Something else was testing missile defense and deterrence."),
    ("barth-coast-to-coast-compelled-call", 329,
     "Barth decided to come forward after hearing Robert Hastings on Coast to Coast AM; something 'just compelled' him to call in — ended up getting through, sharing half his story before the call mysteriously cut off.",
     "person-richard-barth", "personal_account",
     ["person-richard-barth", "person-robert-hastings"],
     "I was listening to Coast to Coast one night and it happened to be Robert Hastings. Something just compelled me to call in. We got through about half my story and then we got cut off somehow."),
    ("barth-2003-2005-vandenberg-incidents", 319,
     "Between 2003 and 2005, five UAP incidents occurred at Vandenberg AFB — Vandenberg remains an active UAP hotspot decades after Barth's encounter.",
     "person-jesse-michels", "cited_from_document",
     ["location-vandenberg-afb"],
     "Between 2003 and 2005, five UAP incidents occurred at Vandenberg Air Force Base."),
]

# V61 ABOP8ZJsyIk — Whitley Strieber
VID61 = "ABOP8ZJsyIk"
entities_61 = [
    P("whitley-strieber-extended", "Whitley Strieber (extended)", VID61, 347,
      "Author of Communion; canonical abductee experiencer; implant carrier",
      "American author; 'Communion' (1987) defined modern alien-abduction mythology and imagery of the Grays. Currently has alleged alien implant in body that activates every 2-3 years. Uncle (Mickey) worked with General Exxon at Air Material Command in 1947.",
      ["Strieber"], "author",
      ["author", "experiencer", "abductee", "implant-carrier"]),
    P("david-webb-nasa", "David W. Webb", VID61, 367,
      "Space scientist well-connected in intelligence community; supportive of Strieber",
      "NASA-adjacent space scientist; deeply connected in the US intelligence community; came into Strieber's life through Stanton Friedman; supported Strieber's work and visited his cabin.",
      ["Webb"], "scientist",
      ["scientist", "NASA", "intelligence"]),
    P("strieber-uncle-mickey", "Uncle Mickey (Strieber)", VID61, 375,
      "Air Material Command 1947 insider; Strieber family pipeline",
      "Whitley Strieber's uncle; worked at Air Material Command at Wright-Patterson in 1947 alongside General James 'Stan' Exxon during Roswell era.",
      [], "military", ["historical"]),
    document("communion-strieber", "Communion", "book",
        [src(VID61, 347, "Whitley Strieber's 1987 abduction-experience memoir")],
        summary="Whitley Strieber's 1987 memoir that defined modern alien-abduction imagery; sold millions of copies; inspired a 1989 Christopher Walken film; the cover's 'Gray' illustration established the visual mythology.",
        author="Whitley Strieber", year=1987),
    document("top-secret-friedman", "Top Secret (Stanton Friedman)", "book",
        [src(VID61, 349, "Stanton Friedman book on Majestic 12 with Strieber foreword")],
        summary="Stanton Friedman's book on the Majestic 12 leaked documents; Whitley Strieber wrote the foreword.",
        author="Stanton Friedman"),
    technology("strieber-implant", "Strieber Alien Implant", "material",
        [src(VID61, 345, "Alleged alien implant in Strieber's body; activates every 2-3 years")],
        summary="Alleged alien implant in Whitley Strieber's body that activates cyclically every 2-3 years with physiological heat. CT-scannable. Strieber demonstrated it on camera."),
]
claims_61 = [
    ("strieber-communion-1987-jumped-publish", 361,
     "Per Strieber: boxes of Communion appeared in bookstores ~2 weeks before the declared publication date without warning; his editor said 'we felt there was some kind of resistance' — unclear whether resistance from the publisher or external.",
     "person-whitley-strieber-extended", "personal_account",
     ["person-whitley-strieber-extended", "document-communion-strieber"],
     "I was told a publication date and then all of a sudden the books were in bookstores. My editor was very coy about I said, 'What? You jumped it.' Boxes of books appeared without warning at bookstores all over the country. He said, 'Well, we felt like there was some kind of resistance.'"),
    ("strieber-active-implant-demonstration", 345,
     "Strieber has an alleged alien implant that activates every 2-3 years with physiological heat; he demonstrates it on camera — can be touched, palpable, runs warm during active cycles. CT scan available.",
     "person-whitley-strieber-extended", "personal_account",
     ["person-whitley-strieber-extended", "technology-strieber-implant"],
     "There's something in your body that you believe is an implant. You can touch it. I feel like might be a little hot because it's been working two-three years ago. I can give you a CT scan of it."),
    ("strieber-uncle-airmaterial-1947", 375,
     "Strieber reveals: his uncle Mickey worked at Air Material Command at Wright-Patterson in 1947 alongside General Exxon — during the Roswell era — providing a family-pipeline explanation for why Strieber was 'chosen' for contact.",
     "person-whitley-strieber-extended", "personal_account",
     ["person-whitley-strieber-extended", "person-strieber-uncle-mickey",
      "location-wright-patterson-afb", "incident-1947-roswell"],
     "One of my uncles was heavily involved in this at Wright-Patt — General Exxon. No, it's my uncle Mickey and General Exxon were — worked at the Air Material Command in 47."),
    ("strieber-david-webb-intel-support", 367,
     "Per Strieber: space scientist David W. Webb (introduced through Stanton Friedman) was well-connected in the intelligence community and very supportive of Strieber's work — visited Strieber's cabin; the government 'was aware of this whole abduction scenario' even then.",
     "person-whitley-strieber-extended", "personal_account",
     ["person-whitley-strieber-extended", "person-david-webb-nasa",
      "person-stanton-friedman"],
     "I had met a space scientist David W. Webb who had come into our lives through Stanton Friedman, and he was very well-connected in the intelligence community and very supportive. So I knew the government was aware of this whole abduction scenario."),
    ("strieber-family-affair-chosen", 375,
     "Strieber states he knows precisely why 'they' (NHI) chose him — 'it's a family affair.' Multiple family members with 1947-era insider positions; childhood incidents he attributes to same phenomenon.",
     "person-whitley-strieber-extended", "personal_account",
     ["person-whitley-strieber-extended", "person-strieber-uncle-mickey"],
     "I know exactly why they chose me. First, it's a family affair. One of my uncles was involved in this. My father was apparently involved."),
]

# V62 UkKwa4jU0fc — Varginha surgeon
VID62 = "UkKwa4jU0fc"
entities_62 = [
    P("varginha-neurosurgeon", "Varginha 1996 Neurosurgeon (anonymous)", VID62, 389,
      "Brazilian neurosurgeon who spent 3-4 minutes face-to-face with recovering ET",
      "Brazilian neurosurgeon who was 3-4 minutes face-to-face with an extraterrestrial being recovering in a Varginha hospital bed after the January 1996 crash. A concert pianist in addition to his medical practice. Says being appeared highly intelligent, not afraid.",
      [], "neurosurgeon",
      ["witness", "medical", "Varginha"]),
    P("varginha-autopsy-lead-doctor", "Varginha 1996 Autopsy Lead Doctor (anonymous)", VID62, 393,
      "Lead doctor who performed autopsy on soldier wounded by alien being",
      "Lead doctor who performed autopsy on a Brazilian soldier likely wounded by an alien being during the Varginha 1996 incident.",
      [], "medical examiner",
      ["medical", "Varginha"]),
    incident("1996-varginha-neurosurgeon-contact", "1996 Varginha Neurosurgeon ET Contact", "close_encounter", "1996-01-13",
        [src(VID62, 389, "Brazilian neurosurgeon observed recovering ET in hospital bed")],
        summary="January 1996 Varginha hospital: a Brazilian neurosurgeon spent 3-4 minutes face-to-face with a recovering extraterrestrial being in a hospital bed. Notes the being appeared to have control of the room, was highly intelligent, not afraid. Alien had forearm with three fingers."),
]
claims_62 = [
    ("varginha-surgeon-face-to-face-3min", 387,
     "The Varginha neurosurgeon spent 3-4 minutes face-to-face with an extraterrestrial being in a hospital bed; being had forearm with three fingers; 'felt the being had control of the room, was highly intelligent, not afraid.'",
     "person-varginha-neurosurgeon", "personal_account",
     ["person-varginha-neurosurgeon", "incident-1996-varginha-neurosurgeon-contact",
      "incident-1996-varginha-brazil"],
     "A neurosurgeon who was face-to-face with an extraterrestrial being for three to four minutes while it was recovering in a hospital bed. The feeling was that he understood what was happening. He wasn't afraid. He was highly intelligent — at least more than I was."),
    ("varginha-carlos-memory-metal", 403,
     "UFO material held by Carlos de Souza after the Varginha 1996 crash behaved EXACTLY like Roswell material: light, tinfoil-like, crumpled and immediately returned to original shape — classic memory-metal signature.",
     "person-jesse-michels", "cited_from_document",
     ["person-carlos-dusa", "technology-memory-metal",
      "incident-1996-varginha-brazil", "incident-1947-roswell"],
     "The UFO material held by one of our guests today, Carlos Dosoza, sounds exactly like the crash material at Roswell. Light, tinfoily, and when he bent it, it would immediately go back into its original shape, like some sort of memory metal."),
    ("varginha-us-air-force-unauthorized", 411,
     "The Varginha crash retrieval involved a secret US Air Force plane that landed in Brazil WITHOUT the Brazilian government's authorization — paralleling American pattern of jurisdiction-overriding retrievals.",
     "person-jesse-michels", "cited_from_document",
     ["incident-1996-varginha-brazil", "organization-us-air-force",
      "organization-cia"],
     "How does he know that the Americans were involved? Because they landed without the authorization of the Brazilian government. It was a secret mission and it was a US Air Force plane."),
    ("varginha-12-15-ship-5-body-witnesses", 395,
     "James Fox has interviewed approximately 12-15 witnesses of the Varginha ships and 5 witnesses of the alien bodies — most extensively-documented post-Roswell case in the Western hemisphere.",
     "person-jesse-michels", "cited_from_document",
     ["person-james-fox", "incident-1996-varginha-brazil",
      "incident-1996-varginha-neurosurgeon-contact"],
     "James, how many witnesses? Ship, maybe 12 to 15. And then the alien body, I think it's up to five. It's literally a modern Roswell but in Brazil in 1996."),
    ("varginha-operating-on-alien-tape", 417,
     "Per Fox: there is alleged video footage of the Brazilian surgeon operating on the alien being; the tape is believed to still be in private civilian hands (the surgeon's house).",
     "person-jesse-michels", "hearsay",
     ["person-james-fox", "person-varginha-neurosurgeon",
      "incident-1996-varginha-neurosurgeon-contact"],
     "You've mentioned multiple times that there is a video of him essentially performing surgery on this alien. If you had to guess, do you think that the tape is lying around in private civilian hands? You think it's in his house still? Yes, I believe so."),
]


if __name__ == "__main__":
    print("Extending videos 53-62...")
    extend(VID53, entities_53, claims_53)
    extend(VID54, entities_54, claims_54)
    extend(VID55, entities_55, claims_55)
    extend(VID56, entities_56, claims_56)
    extend(VID57, entities_57, claims_57)
    extend(VID58, entities_58, claims_58)
    extend(VID59, entities_59, claims_59)
    extend(VID60, entities_60, claims_60)
    extend(VID61, entities_61, claims_61)
    extend(VID62, entities_62, claims_62)
    print("Done.")
