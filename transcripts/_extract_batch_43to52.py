"""Deep claim extraction for videos 43-52."""
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
    return person(slug, label, [src(vid, t, None, quote)],
                  summary=summary, aliases=aliases or [], profession=prof, notability=notability or [])


# V43 Y7PLeu5rTv4 — Peter Levenda
VID43 = "Y7PLeu5rTv4"
entities_43 = [
    P("peter-levenda", "Peter Levenda", VID43, 7,
      "Author of Sinister Forces, Secret Machines, Unholy Alliance; CIA-historian scope",
      "American author researching Nazi occultism, deep politics, UFO/NHI history, and their intersections with government intelligence agencies. Author of Sinister Forces trilogy.",
      ["Levenda"], "author / historian",
      ["author", "researcher", "historian"]),
    P("e-howard-hunt-extended", "E. Howard Hunt (extended)", VID43, 35,
      "CIA officer; Bay of Pigs architect; Watergate burglar; occult novelist",
      "CIA officer, Bay of Pigs action officer; one of the Watergate burglars; author of at least 3 occult novels (one thinly-veiled attack on the Kennedys as Satan worshippers); lived on 'Witches Island'.",
      ["Hunt"], "intelligence officer / author",
      ["CIA", "historical", "Watergate", "novelist"]),
    document("sinister-forces", "Sinister Forces (trilogy)", "book",
        [src(VID43, 7, "Peter Levenda's landmark trilogy on deep politics + occultism")],
        summary="Peter Levenda's three-volume work tracing intersections of Nazi occultism, American deep politics (Watergate, Bay of Pigs), religion, mysticism, and paranormal phenomena.",
        author="Peter Levenda"),
    document("secret-machines", "Secret Machines", "book",
        [src(VID43, 7, "Peter Levenda's book on technology and the paranormal")],
        summary="Peter Levenda's book on the intersection of secret technology programs and paranormal phenomena.",
        author="Peter Levenda"),
    location("witches-island", "Witches Island (E. Howard Hunt residence)", "observation_site",
        [src(VID43, 43, "Location named 'Witches Island' where Hunt lived")],
        country="US"),
]
claims_43 = [
    ("levenda-hunt-occult-novels-jfk-satan", 39,
     "Levenda discovered E. Howard Hunt wrote at least 3 occult novels — one thinly-veiled attack framing the Kennedys as Satan worshippers, reflecting Hunt's Bay-of-Pigs-era vitriol.",
     "person-peter-levenda", "personal_account",
     ["person-peter-levenda", "person-e-howard-hunt-extended", "person-jfk"],
     "E. Howard Hunt wrote at least three occult novels. It's an attack on the Kennedys, the Kennedys as Satan worshippers, thinly veiled kind of a story about that. The vitriol that he had for the Kennedys over Bay of Pigs was palpable."),
    ("levenda-witches-island-hunt", 43,
     "E. Howard Hunt lived on a place literally named 'Witches Island' — an on-the-nose detail that reinforces Levenda's thesis that mundane American political history is suffused with occult structure.",
     "person-peter-levenda", "cited_from_document",
     ["person-peter-levenda", "person-e-howard-hunt-extended", "location-witches-island"],
     "He lived on a place called Witches Island."),
    ("levenda-crash-saucer-fight-club", 9,
     "Levenda posits: 'If we have a crash saucer from the 40s, and they have one too, there is an agreement between countries that says we're not going to talk about this — it's Fight Club.'",
     "person-peter-levenda", "speculation",
     ["person-peter-levenda", "concept-crash-retrieval"],
     "If we have a crash saucer from the '40s, I would say if we are in possession of it, and they're in possession of it, too, then there is an agreement between countries that says we're not going to talk about this. It's the Fight Club."),
    ("levenda-hunt-deathbed-jfk-conspiracy", 13,
     "Per Levenda: E. Howard Hunt on his deathbed admitted knowing about a conspiracy to kill Kennedy — placing Hunt among the last CIA voices confirming JFK was assassinated over 'the alien presence.'",
     "person-peter-levenda", "cited_from_document",
     ["person-peter-levenda", "person-e-howard-hunt-extended", "person-jfk"],
     "JFK was assassinated over quote unquote the alien presence. E. Howard Hunt on his deathbed did claim that there was a conspiracy to kill Kennedy that he knew about it."),
    ("levenda-illuminati-poster-dupont", 33,
     "Levenda recounts: on his first Watergate/Nazi-occultism research trip to the National Archives (1970s), his low-cost hotel off Dupont Circle DC had a huge Illuminati-eye-in-pyramid poster already on the wall — 'too on the nose' as a hint he was on the right thread.",
     "person-peter-levenda", "personal_account",
     ["person-peter-levenda", "document-sinister-forces"],
     "I rented a room in a low-cost hotel off Dupont Circle, and somebody had left this huge poster of the eye in the pyramid. I'm thinking this is a little bit too on the nose."),
]

# V44 mOWwdIuyaQA — NASA Chief (likely Charles Buhler or similar) antigravity
VID44 = "mOWwdIuyaQA"
entities_44 = [
    P("charles-buhler", "Charles Buhler (NASA antigravity researcher)", VID44, 59,
      "Former NASA electrostatic-force propulsion engineer who claims to have built working antigravity lifters",
      "Former NASA chief scientist (electrostatics/propulsion); spent 20 years investigating 'hidden momentum'. Claims to have built laboratory lifters generating ~200 microns of persistent force — with no Newton's-third-law-consistent explanation. ~2000 experimental variations conducted.",
      ["Buhler"], "scientist",
      ["scientist", "NASA", "antigravity"]),
    technology("buhler-lifters", "Buhler Lifters (Electrostatic Propulsion)", "propulsion",
        [src(VID44, 61, "Static-charge propulsion devices generating persistent force")],
        summary="Charles Buhler's electrostatic propulsion devices ('lifters'). Placed inside sealed plastic boxes on scales; when powered, lift and weight flat-lines with ~200 microns persistent force — continue exerting thrust even with power off. ~2000 experimental variations run across 2 test articles."),
]
claims_44 = [
    ("buhler-lifters-200-microns-persist", 61,
     "Buhler's lifter experiments: place inside sealed plastic box on scale, turn on, thing lifts and weight flat-lines; turn power off and ~200 microns of persistent thrust remain — unexplainable to the scientific community.",
     "person-charles-buhler", "personal_account",
     ["person-charles-buhler", "technology-buhler-lifters", "concept-antigravity"],
     "I take those lifters and I put them in a plastic box and put on a scale. You turn it on, the thing lifts up and the weight flat lines. Still about 200 microns of force still inside. Can't explain that to the scientific community. I just can't."),
    ("buhler-2000-variations-conducted", 65,
     "Buhler has conducted approximately 2,000 experimental variations across 2 test articles — multi-decade systematic replication producing anomalous thrust.",
     "person-charles-buhler", "personal_account",
     ["person-charles-buhler", "technology-buhler-lifters"],
     "We are close to 2,000. 2,000 variations. Two test articles. Each one is tested multiple times."),
    ("buhler-satellite-acceleration-off-power", 75,
     "If Buhler's lifter were deployed on a satellite in zero-G space, it would accelerate with the power OFF — the implication being a persistent thrust mode not explained by any conventional propulsion model.",
     "person-charles-buhler", "speculation",
     ["person-charles-buhler", "technology-buhler-lifters"],
     "If you were to apply that to like a satellite in space in a zero gravity environment, it would accelerate with the power off."),
    ("musk-newton-third-law-wall", 103,
     "Elon Musk has publicly insisted Newton's third law is the end-all-be-all for space travel — framing a closed-minded position against alternative propulsion per Jesse's narrative.",
     "person-jesse-michels", "cited_from_document",
     ["concept-antigravity"],
     "Elon Musk has publicly stated that Newton's laws are the end all be all for space travel. For some reason, he's quite adamant about that."),
]

# V45 JpLThEF2dTM — Joe McMoneagle remote viewing Mars
VID45 = "JpLThEF2dTM"
entities_45 = [
    P("joe-mcmoneagle", "Joe McMoneagle", VID45, 119,
      "Remote Viewer #1; Stargate Project legend; Legion of Merit awardee",
      "US Army Stargate Project original remote viewer ('Remote Viewer #1'). Legion of Merit for 200+ contributions to military intelligence. Current teacher of remote viewing protocols. Has produced ~60+ photographs of alleged alien structures on Mars via remote viewing.",
      ["McMoneagle", "Monagle"], "remote viewer / psychic",
      ["psychic", "remote-viewer", "Stargate", "military"]),
    P("julian-jaynes", "Julian Jaynes", VID45, 135,
      "Author of 'The Origin of Consciousness in the Breakdown of the Bicameral Mind'",
      "American psychologist; author of 'The Origin of Consciousness in the Breakdown of the Bicameral Mind' (1976) — thesis that pre-modern humans operated with bicameral (two-chambered) minds with hallucinated voices.",
      ["Jaynes"], "psychologist", ["psychologist", "academic", "historical"]),
    P("kim-peek", "Kim Peek", VID45, 137,
      "Savant 'megasavant' who inspired Rain Man",
      "American megasavant whose condition inspired 'Rain Man' (1988). Per McMoneagle, Peek's uniquely-formed corpus callosum enabled cloud-like information downloads.",
      ["Peek"], "", ["savant", "historical"]),
    concept("bicameral-mind-jaynes", "Bicameral Mind (Jaynes)", "psychology",
        [src(VID45, 135, "Pre-modern humans' two-chambered consciousness with hallucinated voices")],
        summary="Julian Jaynes' hypothesis: pre-modern humans operated with a two-chambered ('bicameral') mind where the right hemisphere produced hallucinated voices the left hemisphere obeyed. Collapse of this structure is origin of modern consciousness."),
    concept("corpus-callosum-filter", "Corpus Callosum as Psi Filter", "psychology",
        [src(VID45, 133, "McMoneagle-Jesse proposal: CC evolved as filter on psychic information")],
        summary="Hypothesis that the corpus callosum (brain hemisphere bridge) evolved as a filter on direct psi/telepathic information — pre-language humans had direct mind-reading and needed evolutionary throttling."),
    document("mars-structures-photos-mcmoneagle", "McMoneagle Mars Structures Photos", "report",
        [src(VID45, 111, "Remote-viewing derived photos of Mars structures")],
        summary="~60+ photographs McMoneagle has catalogued of what he identifies as alien structures on Mars — square structures, pyramidal hibernation chambers."),
]
claims_45 = [
    ("mcmoneagle-60-mars-photos", 111,
     "McMoneagle claims ~60 photographs of what he identifies as alien-civilization structures on Mars — including a 'square' ~3ft long and pyramidal hibernation chambers.",
     "person-joe-mcmoneagle", "personal_account",
     ["person-joe-mcmoneagle", "document-mars-structures-photos-mcmoneagle",
      "concept-sidonia-mars-ruins"],
     "I have probably somewhere in the neighborhood of 60 something photographs of things on Mars that are clearly alien. These pyramidal places are like hibernation chambers they're trying to survive until somebody comes to save them."),
    ("mcmoneagle-legion-merit-200-instances", 121,
     "McMoneagle received the Legion of Merit for 200+ instances of remote-viewing contributions to US military intelligence.",
     "person-jesse-michels", "cited_from_document",
     ["person-joe-mcmoneagle", "program-stargate-project"],
     "You won the Legion of Merit for over 200 instances in which you added to Military Intelligence. You've saved countless lives."),
    ("mcmoneagle-language-traded-psi", 129,
     "McMoneagle's hypothesis: language development created 'opportunity cost' with direct psi/telepathic communication — modern telepathic autistic children (The Telepathy Tapes) may represent reversion to primordial communication mode.",
     "person-joe-mcmoneagle", "speculation",
     ["person-joe-mcmoneagle", "concept-autistic-telepathy", "concept-corpus-callosum-filter"],
     "One has to wonder is there opportunity cost with the language that we have developed and when you're not relying on that language do you revert back to a more primordial form of communication?"),
    ("mcmoneagle-shaman-evolutionary-scout", 153,
     "Per McMoneagle: shamans (often physically sickly) were group-selection adaptive for tribes — essential for 'scouting' probabilistic future dangers despite individual vulnerability.",
     "person-joe-mcmoneagle", "on_record_statement",
     ["person-joe-mcmoneagle"],
     "The people who kept small tribes of humans alive were shamans. Shamans make all the decisions. They might be sickly but extremely adaptive for the tribe because they're essential for scouting what might come around the bend."),
]

# V46 Sct30Qijfv8 — Randy Anderson Green Beret / NSWC Crane
VID46 = "Sct30Qijfv8"
entities_46 = [
    P("randy-anderson-green-beret", "Randy Anderson", VID46, 167,
      "Green Beret Weapons Sergeant 18B who saw off-world tech at NSWC Crane",
      "US Army Green Beret Weapons Sergeant (18B). Completed SEAR and Q-course Special Forces qualification. Worked at Area 51 test site. In March 2014, taken to a secret 'Off-World Technology Division' at Naval Surface Warfare Center Crane where he witnessed a metallic basketball-sized sphere levitating above a podium with hieroglyphic symbols appearing on a display screen.",
      ["Anderson"], "Green Beret",
      ["witness", "military", "Green Beret", "NSWC"]),
    location("nswc-crane", "Naval Surface Warfare Center Crane (Indiana)", "military_base",
        [src(VID46, 171, "Indiana naval facility housing alleged Off-World Technology Division")],
        country="US", state="Indiana"),
    program("off-world-technology-division", "Off-World Technology Division (NSWC Crane)",
        [src(VID46, 165, "Underground division at Crane storing alleged off-world tech")],
        summary="Per Randy Anderson: an underground facility at NSWC Crane with a hallway-wall marking 'Off-World Technology Division' containing a levitating metallic sphere and display screens showing appearing-hieroglyphic symbols. March 2014."),
    technology("levitating-metallic-sphere", "Levitating Metallic Sphere (NSWC Crane)", "material",
        [src(VID46, 165, "Basketball-size metallic sphere levitating above podium with mirage effect")],
        summary="Anderson describes a metallic basketball-sized sphere levitating above a podium at NSWC Crane's Off-World Technology Division; appeared to have a mirage-like effect; display screen above it showed hieroglyphic symbols materializing."),
]
claims_46 = [
    ("anderson-off-world-tech-division-2014", 165,
     "In March 2014, Randy Anderson was taken to an underground facility at NSWC Crane where a hallway wall marking read 'Off-World Technology Division' — he witnessed a metallic basketball-sized sphere levitating above a podium with hieroglyphic symbols materializing on display screens.",
     "person-randy-anderson-green-beret", "personal_account",
     ["person-randy-anderson-green-beret", "program-off-world-technology-division",
      "location-nswc-crane", "technology-levitating-metallic-sphere"],
     "In March of 2014, Randy was taken to a secret underground facility called the Off-World Technology Division at Naval Surface Warfare Center Crane. Metallic basketball-sized sphere looked like it was just levitating above the podium. Above that display screen were these hieroglyphic symbols that I started to see appear."),
    ("anderson-gerb-introduction", 177,
     "Randy Anderson and Jesse were introduced by UAP researcher Sammy 'UAPGerb' Gerb, who independently dug up substantial information on the NSWC Crane training facility.",
     "person-jesse-michels", "personal_account",
     ["person-randy-anderson-green-beret"],
     "We have a mutual friend - he goes by UAP Gerb - incredible channel, one of the deepest researchers I've ever met. He was thoroughly impressed with the amount of stuff he dug up on the place that I did the training at."),
    ("anderson-green-beret-vs-seal-culture", 185,
     "Anderson articulates Green Beret cultural identity: 'we like being the true quiet professionals' — explicitly different from SEAL public-facing culture; going on camera is 'super uncomfortable.'",
     "person-randy-anderson-green-beret", "personal_account",
     ["person-randy-anderson-green-beret"],
     "We like being the true quiet professionals. It's a cultural thing. In Special Forces Army particularly, it's not very popular to talk about what you do. That's why this is super uncomfortable for me to talk about it publicly."),
    ("anderson-area-51-test-site-occasional", 163,
     "Anderson states he 'occasionally still works at Area 51' — referring to the broader Nevada Test and Training Range of which Area 51 is one component of a huge sprawling compound.",
     "person-randy-anderson-green-beret", "on_record_statement",
     ["person-randy-anderson-green-beret", "location-groom-lake"],
     "You occasionally still work at Area 51 right? We call it the test site or the test range. Area 51 is just one component of that entire huge sprawling compound."),
]

# V47 u7g5Sn1DJF4 — UAPGerb Pentagon Program
VID47 = "u7g5Sn1DJF4"
entities_47 = [
    P("sammy-uap-gerb", "Sammy 'UAPGerb' Gerb", VID47, 229,
      "YouTube UFO researcher famous for acronym-detail knowledge of UFO programs",
      "YouTube UFO researcher ('UAPGerb' channel) with exceptionally detailed knowledge of US government UFO-program acronyms, personalities, and program structures. Investigated Michael Herrera and Jonathan Wagant cases.",
      ["UAPGerb", "Gerb"], "researcher", ["researcher", "journalist"]),
    P("doug-wolf", "Doug Wolf", VID47, 245,
      "First Director of Office of Global Access (OGA)",
      "Intelligence executive: 16 years NRO; executive assistant to NRO Director; CIA DS&T Deputy Director; started the Office of Global Access (OGA); DDNI ATNF (Deputy Director for National Intelligence, Acquisition Technology and Facilities) with direct oversight over NRO acquisitions.",
      ["Wolf"], "intelligence executive",
      ["intelligence", "NRO", "CIA"]),
    P("jonathan-wagant", "Jonathan Wagant", VID47, 215,
      "1997 USMC UAP crash-retrieval witness in Peru",
      "US Marine Corps Lance Corporal stationed in Peru 1997 under Operation Laser Strike. Encountered a downed egg-shaped craft with arm/four-fingers hanging out; syrup-like purplish-green liquid dripping; telepathic contact with being.",
      ["Wagant", "Wayant"], "military veteran",
      ["witness", "USMC", "experiencer"]),
    P("michael-herrera", "Michael Herrera", VID47, 505,
      "USMC Indonesia 2009 encounter witness",
      "US Marine Corps veteran who in 2009 encountered a vanta-black octagonal craft over Indonesian treetops; his unit intercepted by elite paramilitary team with bioscanners; possibly tied to psionic-asset trafficking scheme via crash-retrieval program.",
      ["Herrera"], "military veteran",
      ["witness", "USMC", "experiencer"]),
    program("oga-office-global-access", "Office of Global Access (OGA)",
        [src(VID47, 245, "CIA-DS&T successor organization first directed by Doug Wolf")],
        summary="Office of Global Access (OGA): CIA directorate of science & technology successor organization first directed by Doug Wolf; acquisitions authority relevant to NRO-adjacent UAP programs.",
        acronym="OGA"),
    program("looking-glass", "Project Looking Glass",
        [src(VID47, 253, "Timeline-manipulation program allegedly briefed to Bob Lazar")],
        summary="Alleged program involving manipulation of timelines / parallel-universe probing, combining Planck-scale temporal framing with many-worlds quantum interpretation. Bob Lazar was reportedly briefed on it.",
        acronym="Looking Glass"),
    event("operation-laser-strike-1997", "Operation Laser Strike (Peru 1997)", "other", "1997-01-01",
        [src(VID47, 493, "US counter-narcotics operation in Peru where Wagant encountered UAP")],
        summary="1997 US anti-narco operation in Peru; ground-based radar systems tracking drug-running planes. Lance Corporal Jonathan Wagant was sent to investigate what was presented as a downed friendly plane — encountered a crashed UAP."),
    incident("1997-peru-wagant-ufo-crash", "Peru 1997 UFO Crash (Wagant)", "crash_retrieval", "1997-06-01",
        [src(VID47, 215, "Egg-shaped craft embedded in cliff face with alien arm visible")],
        summary="1997 Peru crash witnessed by Jonathan Wagant (USMC Lance Corporal) under Operation Laser Strike. Egg-shaped/teardrop craft embedded in cliff face, hatch open, four-fingered arm hanging out, purplish-green liquid dripping, being telepathically asking for help."),
]
claims_47 = [
    ("gerb-tim-taylor-timeline-bureau", 255,
     "UAPGerb notes Tim Taylor thinks of himself as an 'Adjustment Bureau timeline-management person' — sphere used to 'coagulate time onto Planck scale' and view parallel timelines via many-worlds interpretation.",
     "person-sammy-uap-gerb", "cited_from_document",
     ["person-sammy-uap-gerb", "person-tim-taylor-cape-canaveral",
      "program-looking-glass", "concept-many-worlds-everett"],
     "You have Tim Taylor. He kind of thinks of himself as like an Adjustment Bureau timeline management person. This sphere was basically used to coagulate time onto the Planck scale, viewing time as frames of Planck scale and combined with the many worlds interpretation of quantum physics to view parallel timelines."),
    ("wagant-peru-1997-egg-craft", 215,
     "In 1997 Peru under Operation Laser Strike, Marine Lance Corporal Jonathan Wagant encountered a crashed egg-shaped craft embedded in a cliff face with an open hatch, four-fingered arm dangling out, and dripping purplish-green syrup-like liquid.",
     "person-sammy-uap-gerb", "cited_from_document",
     ["person-jonathan-wagant", "incident-1997-peru-wagant-ufo-crash",
      "event-operation-laser-strike-1997"],
     "There's an enormous egg-shaped, teardrop-shaped craft embedded in the cliff face, and there seemed to be a hatch open with an arm hanging out with four fingers. It was dripping this syrup-like liquid. It was a purplish green color."),
    ("wagant-telepathic-plea-help", 221,
     "Wagant reports a being communicated to him telepathically during the Peru 1997 encounter — 'not going to harm me, everything will be all right, help us get out of here.'",
     "person-jonathan-wagant", "personal_account",
     ["person-jonathan-wagant", "incident-1997-peru-wagant-ufo-crash",
      "phenomenon-alien-telepathy"],
     "He feels like a being is communicating to him in his mind, telling him not to be scared, but also asking for help. They were not going to harm me. Just help us get out of here."),
    ("8-to-12-operators-black-no-insignia", 225,
     "Common thread across three independent crash-retrieval witnesses: intercepted by 8-12 operators in all black with no insignia / name tags, held at gunpoint, and dosed with what they were told were 'anthrax vaccine boosters.'",
     "person-sammy-uap-gerb", "cited_from_document",
     ["person-sammy-uap-gerb", "person-jonathan-wagant", "person-michael-herrera",
      "person-jake-barber"],
     "They're immediately intercepted by between 8 and 12 operators in all black, no insignia, no name tags, held at gunpoint. All three of these men directly after their encounters were given what they were told were anthrax vaccine boosters."),
    ("gerb-doug-wolf-nro-oga", 245,
     "Doug Wolf: 16 years NRO, executive assistant to the NRO director, CIA DS&T Deputy Director, started the OGA, DDNI ATNF — holds direct oversight over NRO acquisitions.",
     "person-sammy-uap-gerb", "cited_from_document",
     ["person-sammy-uap-gerb", "person-doug-wolf", "program-oga-office-global-access",
      "organization-nro"],
     "Doug Wolf spent 16 years in the NRO. He was the executive assistant to the director of the NRO. He was CIA DS&T deputy director. He started the OGA. He was the DDNI ATNF — deputy director for national intelligence for acquisition technology and facilities — has direct oversight over NRO acquisitions."),
    ("looking-glass-lazar-briefed", 253,
     "Per Jesse: Bob Lazar was briefed on Project Looking Glass — timeline manipulation via Planck-scale time frames combined with many-worlds quantum mechanics.",
     "person-sammy-uap-gerb", "cited_from_document",
     ["person-bob-lazar-extended", "program-looking-glass"],
     "Obviously Bob Lazar was briefed on project Looking Glass. Which is like the manipulation of timelines."),
]

# V48 zjpvfDFc4fg — NASA Pagan Rituals
VID48 = "zjpvfDFc4fg"
entities_48 = [
    P("buzz-aldrin", "Buzz Aldrin", VID48, 277,
      "Apollo 11 astronaut; 33rd-degree Mason; performed first lunar communion",
      "American astronaut; second man on moon (Apollo 11, 1969). 33rd-degree Scottish Rite Mason. Performed first religious ceremony on moon — Scottish Rite communion with silk flag.",
      ["Aldrin"], "astronaut",
      ["astronaut", "NASA", "Mason", "historical"]),
    P("neil-armstrong", "Neil Armstrong", VID48, 277,
      "Apollo 11 astronaut; first man on moon",
      "American astronaut and naval aviator; first person to walk on the moon (Apollo 11, 1969).",
      ["Armstrong"], "astronaut",
      ["astronaut", "NASA", "historical"]),
    concept("scottish-rite-freemasonry", "Scottish Rite Freemasonry", "metaphysics",
        [src(VID48, 293, "Esoteric branch of Freemasonry with 33 degrees tied to spinal chakras")],
        summary="Esoteric branch of Freemasonry with 33 degrees symbolically tied to the 33 vertebrae of the spine culminating in the crown chakra (divine insight gateway). Buzz Aldrin held the 33rd degree."),
    concept("overview-effect", "The Overview Effect", "psychology",
        [src(VID48, 305, "Astronauts' spiritual transformation from seeing Earth from space")],
        summary="Spiritual/cognitive shift astronauts report from seeing Earth from space; first identified via Edgar Mitchell — Earth's dynamic too beautiful to be accidental, implying a creator 'above the religions.'"),
    program("institute-of-noetic-sciences", "Institute of Noetic Sciences (IONS)",
        [src(VID48, 307, "Edgar Mitchell's think tank for consciousness research")],
        summary="Think tank dedicated to consciousness, psychic phenomena, and metaphysics founded by Apollo 14 astronaut Edgar Mitchell. Wernher von Braun attended early fundraising dinners and encouraged the effort.",
        acronym="IONS"),
]
claims_48 = [
    ("aldrin-scottish-rite-moon-flag", 291,
     "Buzz Aldrin carried a small silk flag hand-stitched with the Scottish Rite symbol of Freemasonry to the moon; Masonic Grand Lodge of Ohio claims Apollo 11 established an appendant body of Freemasonry on the moon.",
     "person-jesse-michels", "cited_from_document",
     ["person-buzz-aldrin", "concept-scottish-rite-freemasonry"],
     "Among his belongings was a small silk flag hand-stitched with the symbol of the Scottish Rite of Freemasonry. According to the Masonic Grand Lodge of Ohio, the Apollo 11 mission even established an appendant body of the Masonic Lodge on the moon."),
    ("aldrin-communion-moon-first-liquid", 285,
     "Buzz Aldrin performed the first religious ceremony on the moon — communion with wine, bread, and silver chalice before his first moonwalk. The wine curled 'slowly and gracefully' up the side of the cup.",
     "person-jesse-michels", "cited_from_document",
     ["person-buzz-aldrin", "person-neil-armstrong"],
     "Aldrin then proceeded to carry out the first religious ceremony ever conducted on the moon. Using a small silver chalice, a bit of wine, and a piece of bread. He recalled the wine curling slowly and gracefully up the side of the cup."),
    ("mitchell-esp-on-moon", 301,
     "On Apollo 14, Edgar Mitchell ran a private ESP experiment attempting to send mental images back to Earth using cards; results were scored better than chance.",
     "person-jesse-michels", "cited_from_document",
     ["person-ed-mitchell", "program-institute-of-noetic-sciences"],
     "On his journey to the moon, Mitchell conducted a private ESP experiment attempting to send mental images back to Earth using a set of cards. The results scored by colleagues back on Earth were better than chance."),
    ("mitchell-vonbraun-consciousness-study", 305,
     "Per Jesse: von Braun deeply supported Mitchell's consciousness/psi interests and encouraged him to find a site within NASA to study consciousness further; von Braun attended early fundraising dinners for Mitchell's Institute of Noetic Sciences.",
     "person-jesse-michels", "cited_from_document",
     ["person-ed-mitchell", "person-wernher-von-braun",
      "program-institute-of-noetic-sciences"],
     "Warner von Braun — according to Mitchell, deeply supportive, even encouraging Mitchell to find a site within NASA to study consciousness further. Von Braun attended one of its early fundraising dinners."),
    ("mitchell-overview-effect-spiritual", 309,
     "Mitchell's Overview Effect framing: Earth from space is 'too much purpose, too much logic, too beautiful to have happened by accident. There has to be a creator of the universe who stands above the religions.'",
     "person-ed-mitchell", "personal_account",
     ["person-ed-mitchell", "concept-overview-effect"],
     "The Earth dynamic, overwhelming — it was just too beautiful to have happened by accident. There has to be a creator of the universe who stands above the religions that we ourselves create to govern our lives."),
]

# V49 TNtlzEnl8rA — Greg Rogers NASA Doctor
VID49 = "TNtlzEnl8rA"
entities_49 = [
    P("greg-rogers", "Dr. Gregory Rogers", VID49, 347,
      "Retired Chief Flight Surgeon NASA & USAF; 1992 saucer witness",
      "Recently retired Chief Flight Surgeon for NASA and USAF; former Chief of Aerospace Medicine at 45th Space Wing (Cape Canaveral, Patrick AFB, Eastern Missile Range). In 1992 a colleague showed him a ~20ft saucer-shape craft marked 'US Air Force' in a hangar; told it was retro-engineered from non-human origin.",
      ["Rogers", "Dr. Rogers"], "flight surgeon",
      ["witness", "NASA", "USAF", "medical"]),
    P("chris-leto-letto-files", "Chris Leto (Leto Files)", VID49, 351,
      "UFO interviewer; former pilot",
      "Former pilot and host of the Leto Files podcast on UFOs. Introduced Greg Rogers to Jesse Michels.",
      ["Leto"], "pilot / podcaster", ["interviewer", "pilot"]),
    location("cape-canaveral-afs", "Cape Canaveral Air Force Station (Patrick AFB region)", "military_base",
        [src(VID49, 359, "Rogers' primary assignment at 45th Space Wing")],
        country="US", state="Florida"),
    technology("usaf-reverse-engineered-saucer", "USAF Reverse-Engineered Saucer", "craft",
        [src(VID49, 325, "~20ft modified-egg saucer with 'US Air Force' marking per Rogers")],
        summary="Per Rogers' 1992 hangar sighting: ~20ft saucer-shape craft resembling a modified egg, no rivets or seams, rotated on demand, marked 'US Air Force' — colleague claimed it was reverse-engineered from retrieved NHI craft."),
]
claims_49 = [
    ("rogers-1992-saucer-hangar", 325,
     "In 1992, as Chief of Aerospace Medicine at the 45th Space Wing, Greg Rogers was shown a ~20ft saucer-shape craft in a hangar — no rivets, no seams, rotating on demand, marked 'US Air Force' — colleague said 'we got it from them' referring to NHI.",
     "person-greg-rogers", "personal_account",
     ["person-greg-rogers", "technology-usaf-reverse-engineered-saucer",
      "concept-reverse-engineering"],
     "1992. I was the chief of aerospace medicine and he said, 'I've got something to show you.' A saucer 20 ft across was sort of like a modified egg. There were no rivets, no seams, but then later on it rotated. It said US Air Force. But when I said 'why would we build it in a design like this?' He looked at me and went, 'We got it from them.'"),
    ("rogers-45deg-attack-no-movement", 327,
     "Rogers — F-16 and helicopter pilot — asserts no vehicle he has ever known of could obtain a 45° angle of attack without moving, as he witnessed the craft do.",
     "person-greg-rogers", "personal_account",
     ["person-greg-rogers", "technology-usaf-reverse-engineered-saucer"],
     "I flew helicopters and I flew F-16s. No vehicle I have ever known of could obtain a 45° angle of attack without moving."),
    ("rogers-fancy-tech-distraction", 327,
     "Rogers' framing: 'When companies say look we made this fancy thing — that's to get people's attention so they don't look at the OTHER thing they're spending all the money on.'",
     "person-greg-rogers", "on_record_statement",
     ["person-greg-rogers"],
     "So when these companies say, 'Look, we made this thing. Look at how fancy it is' — that's to get the people's attention so they don't look at this other thing that they're spending all the money on."),
    ("rogers-has-grush-six", 343,
     "Rogers decided to come forward publicly to 'cover Grusch's six o'clock' — corroborate Grusch's Congressional testimony with firsthand visual evidence Grusch did not claim to have.",
     "person-greg-rogers", "personal_account",
     ["person-greg-rogers", "person-david-grusch"],
     "I thought I've got his six o'clock covered. To stand up in a similar way with all of the risk of reputation and bravely break his silence about what he had seen."),
]

# V50 hXYdkcv5TtY — Eric Wargo Time Loops
VID50 = "hXYdkcv5TtY"
entities_50 = [
    P("eric-wargo", "Eric Wargo", VID50, 371,
      "Author of Time Loops and From Nowhere; precognition researcher",
      "American theorist and author of 'Time Loops' (2018) and 'From Nowhere' — presents a new theory of precognition, block-universe causation, and prophetic dreams as information-transmission from future self to past self.",
      ["Wargo"], "author / theorist",
      ["author", "researcher"]),
    P("sigmund-freud", "Sigmund Freud", VID50, 409,
      "Psychoanalyst who denied precognition yet lived out Oedipus",
      "Founder of psychoanalysis; per Wargo, denied precognition while himself living out the Oedipus myth — his 1895 dream contained premonitory elements of his later oral cancer (caused by smoking) which he failed to heed.",
      ["Freud"], "psychoanalyst",
      ["psychoanalyst", "historical"]),
    P("carl-jung-patient-scarab", "Carl Jung (scarab patient)", VID50, 395,
      "Psychiatrist whose golden-scarab synchronicity is canonical Time Loop example",
      "Swiss psychiatrist. Central Wargo example: Jung's hyper-rationalist patient dreamed of being gifted a golden scarab beetle; the next day Jung gifted her an actual scarab beetle that flew into his office — paradigm-shifting synchronicity.",
      [], "psychiatrist",
      ["psychiatrist", "historical"]),
    document("time-loops-wargo", "Time Loops", "book",
        [src(VID50, 371, "Wargo's theory of self-fulfilling prophecies via information time-travel")],
        summary="Eric Wargo's 'Time Loops' (2018) — theory that precognitive dreams transmit information backward from the future, causing behavioral changes that self-fulfill the prophecy. Based on closed-timelike-curve mathematics.",
        author="Eric Wargo", year=2018),
    document("from-nowhere-wargo", "From Nowhere", "book",
        [src(VID50, 371, "Wargo's follow-up theory on creativity and precognition")],
        summary="Eric Wargo's follow-up book extending Time Loops into creativity, artistic inspiration, and information coming 'from nowhere' as psi-phenomena.",
        author="Eric Wargo"),
    concept("closed-timelike-curve", "Closed Timelike Curve", "physics",
        [src(VID50, 381, "Mathematical result: wormhole-paradox attempts always self-resolve")],
        summary="Physics mathematics (1980s): particles sent through wormholes to deflect themselves away always self-deflect INTO the wormhole — universe is self-consistent, no paradox possible. Basis of Wargo's block-universe time-loop causation model."),
]
claims_50 = [
    ("wargo-jung-scarab-example", 397,
     "Wargo's canonical Time Loop example: Jung's hyper-rationalist patient dreamed of receiving a golden scarab beetle; the next day in Jung's office a real scarab flew in, Jung gifted it to her, breaking her paradigm — the dream's knowledge led to the attentional state that produced the event.",
     "person-eric-wargo", "cited_from_document",
     ["person-eric-wargo", "person-carl-jung-patient-scarab", "document-time-loops-wargo"],
     "Her dream changes her reaction and being aware of that dream actually caused the whole thing to happen. That's my favorite example of a Time Loop. It shows exactly how a dream changes behavior and the behavior leads to the outcome in an unforeseen way."),
    ("wargo-freud-oral-cancer-premonition", 411,
     "Wargo demonstrates Freud's 1895 landmark dream (analyzed in 14 pages of Interpretation of Dreams) contained premonitory elements of his 1923 oral cancer — caused by Freud's smoking; Freud denied precognition and never acknowledged the dream as warning.",
     "person-eric-wargo", "cited_from_document",
     ["person-eric-wargo", "person-sigmund-freud"],
     "He had a famous 1895 dream. Like 28 years later he developed an oral cancer. All these key elements in that dream he'd had almost three decades earlier came true in his life. Had he paid attention to this dream as a warning from his future, he might have quit smoking."),
    ("wargo-closed-timelike-self-consistent", 381,
     "Wargo: 1980s physicists' mathematics of closed timelike curves showed the universe is self-consistent — any attempt to use wormhole/time-travel to prevent an event actually causes the event. No paradox possible.",
     "person-eric-wargo", "cited_from_document",
     ["person-eric-wargo", "concept-closed-timelike-curve"],
     "Physicists in the 80s did the math. They got interested in wormholes. If you send a billiard ball through a wormhole and try to deflect it away, it fails — you're always going to deflect yourself into the wormhole."),
    ("wargo-prophecy-self-fulfilling", 377,
     "Wargo's core thesis: all prophecies are self-fulfilling; you are already the product of information reflexing from your future and influencing your past — 'you now are the product of time-traveling information already.'",
     "person-eric-wargo", "on_record_statement",
     ["person-eric-wargo", "document-time-loops-wargo"],
     "Prophecies have to be self-fulfilling. You now are the product of information reflexing from your future and influencing your past and influencing your present."),
    ("wargo-oedipus-time-loop", 407,
     "Wargo frames Oedipus as the archetypal Time Loop — the prophecy's flight fulfills it (flees home, kills father at crossroads, marries mother) — yet Freud paradoxically denied precognition in his psychoanalytic reading of the same myth.",
     "person-eric-wargo", "on_record_statement",
     ["person-eric-wargo", "person-sigmund-freud"],
     "He fulfills the prophecy exactly in his efforts to evade the prophecy. Freud was only interested in that incestuous idea — he denied precognition and denied the rest of the story about the prophecy."),
]

# V51 dzTZbSNsKV8 — Gary Nolan UFO parts
VID51 = "dzTZbSNsKV8"
entities_51 = [
    P("gary-nolan-extended", "Gary Nolan (extended)", VID51, 423,
      "Stanford microbiologist; CIA-tasked UFO researcher; UFO parts custodian",
      "Wellington Nolan Research Lab at Stanford. Microbiologist & geneticist; spun up multiple nine-figure-exit companies. Has UFO parts in locked bank account. CIA tasked him with analyzing MRIs of UAP experiencers and Havana-syndrome cases — found distinctive caudate-putamen neural density pattern.",
      ["Nolan"], "microbiologist",
      ["scientist", "Stanford", "researcher"]),
    concept("caudate-putamen-uap-experiencer", "Caudate-Putamen UAP-Experiencer Pattern", "biology",
        [src(VID51, 449, "Distinctive brain structure in UAP experiencers and Havana-syndrome cases")],
        summary="Distinctive structural pattern Nolan identified between the caudate nucleus head and putamen — increased neural density, larger than normal — found across UAP experiencers, Havana-syndrome cases, and highly intelligent intuitive decision-makers. Genetically inherited (family members show pattern)."),
    concept("sensory-reduction-filter", "Sensory Organs As Reductive Filter", "psychology",
        [src(VID51, 455, "Nolan's model: senses as reductive filter on greater omniscience")],
        summary="Nolan's hypothesis (shared with Jesse): the sensory organs are not productive but REDUCTIVE on a default state of near-omniscience — filter preventing brain overwhelm. UAP perception anomaly may be a widening of this filter."),
    concept("invisible-college-vallee", "The Invisible College (Vallee / UFO science network)", "politics",
        [src(VID51, 447, "Vallee's term for the UFO-research informal scientific network")],
        summary="Jacques Vallee's term (from his 1975 book) for the informal network of credentialed UFO researchers working outside mainstream academia — including Vallee, Puthoff, Davis, Bigelow, Kolm Kelleher, Nolan."),
]
claims_51 = [
    ("nolan-ufo-parts-bank-account", 427,
     "Nolan states on camera he has UFO parts in a locked bank account — from cases like a fisherman witnessing a glowing object that exploded.",
     "person-gary-nolan-extended", "on_record_statement",
     ["person-gary-nolan-extended", "concept-crash-retrieval"],
     "I mean, I have some in a locked bank account. A fisherman saw a glowing object and it just suddenly exploded."),
    ("nolan-cia-tasked-havana-uap", 445,
     "CIA tasked Nolan with analyzing MRIs of UAP experiencers alongside Havana-syndrome cases — he found a common increased caudate-putamen neural density pattern across both populations.",
     "person-gary-nolan-extended", "personal_account",
     ["person-gary-nolan-extended", "organization-cia", "concept-caudate-putamen-uap-experiencer",
      "phenomenon-havana-syndrome-em"],
     "The CIA came to my office. They said we had asked around and everybody said you've built the best tool called CITO. They showed me MRIs of some of these people. Most of those people had interactions with UFOs. We noticed an area of the brain that seemed to be disturbed — between the head of the caudate and the putamen, increased neural density."),
    ("nolan-caudate-genetic-family", 451,
     "The caudate-putamen pattern is heritable — Nolan found the same pattern in experiencers' family members, indicating a genetic component to the predisposition for UAP perception.",
     "person-gary-nolan-extended", "personal_account",
     ["person-gary-nolan-extended", "concept-caudate-putamen-uap-experiencer"],
     "Surprisingly, when we looked in the family members, we found that the family members had it. Which was fascinating. So that means that structure had a genetic component."),
    ("nolan-invisible-college-members", 447,
     "Upon CIA contact, Nolan was 'introduced to others — what you people call the invisible college' — a network including Jacques Vallee, Hal Puthoff, Eric Davis, Robert Bigelow, and Colm Kelleher.",
     "person-gary-nolan-extended", "personal_account",
     ["person-gary-nolan-extended", "concept-invisible-college-vallee",
      "person-jacques-vallee", "person-hal-puthoff", "person-eric-davis"],
     "I was introduced to others who were I think you people call them the invisible college. It was people like Jacques, people like Hal Puthoff, Eric Davis and Robert Bigelow and Colm Kelleher."),
    ("nolan-sensory-reductive-model", 455,
     "Nolan endorses the 'sensory organs as reductive filter' model — default state is near-omniscient, limited perception protects us from cognitive overwhelm; UAP perception = filter widening.",
     "person-gary-nolan-extended", "on_record_statement",
     ["person-gary-nolan-extended", "concept-sensory-reduction-filter"],
     "Our senses are a filter to stop our brains from being overwhelmed with reality. The sensory organs are not necessarily productive. They're reductive on a default state of almost greater omniscience but an inability to make sense of right things."),
    ("nolan-atip-underfunded-22m", 443,
     "Nolan notes AATIP's $22M budget contrasts absurdly with ~$100B fighter-jet budgets — discovering NHI and propulsion science gets < 1% of F-35 spending.",
     "person-jesse-michels", "cited_from_document",
     ["person-gary-nolan-extended", "program-aatip"],
     "AATIP has a $22 million budget. Just compare that to fighter jet budgets which often exceed hundred billion. Discovering extraterrestrial life and propulsion gets less than 1% of the current F-35 budget."),
]

# V52 nTiFs8LudUo — UAPGerb Utah
VID52 = "nTiFs8LudUo"
entities_52 = [
    P("sammy-gerb-extended", "Sammy 'UAPGerb' Gerb (Utah episode)", VID52, 479,
      "UAPGerb re-extension; this episode deep on Jake Barber, Skywatcher, NEST teams",
      "UAPGerb channel operator; in this episode deep-dives JSOC Tier One teams (Delta, SEAL Team 6, ISA, 24th STS) and DOE-NEST crash-retrieval team structure.",
      ["UAPGerb", "Gerb"], "researcher", ["researcher"]),
    program("nest-nuclear-emergency-search-team", "Nuclear Emergency Search Team (NEST)",
        [src(VID52, 513, "DOE specialized team containing biologics spillage at crash sites")],
        summary="Department of Energy Nuclear Emergency Search Team (NEST) — elite operators responding to nuclear-technology/secret events. Per Gerb, NEST teams work crash retrievals containing hazardous biological or radiological material and have EG&G contractor support.",
        acronym="NEST"),
    P("eggg-contractor", "EG&G (Contractor)", VID52, 517,
      "Private contractor supporting NEST teams and UAP programs",
      "Private defense contractor supporting US Nuclear Emergency Search Teams and UAP-adjacent programs (Wilson-Davis memo, Bob Lazar, Edgar Fouche).",
      ["EG&G", "Edgerton Germeshausen Grier"], "contractor",
      ["contractor", "historical"]),
    incident("1974-coyame-mexico-crash", "1974 Coyame Mexico UFO Crash", "crash_retrieval", "1974-08-25",
        [src(VID52, 515, "Alleged UFO crash in Coyame Mexico with toxic biological seepage")],
        summary="Alleged August 1974 UFO crash near Coyame Chihuahua Mexico; per Gerb and the 'Majestic' documents, toxic elements seeped from the crash site — explaining NEST-style hazmat response protocol."),
    program("sdi-star-wars", "Strategic Defense Initiative (SDI) / Star Wars",
        [src(VID52, 476, "Reagan 1983 anti-ICBM program possibly back-door to UAP programs")],
        summary="Ronald Reagan's 1983 Strategic Defense Initiative — anti-Soviet-ICBM program. Per Gerb, 'Star Wars' likely had a back door to fund UAP programs and act offensively against UAPs.",
        acronym="SDI"),
]
claims_52 = [
    ("gerb-jsoc-tier-one-crash-retrieval", 519,
     "Per Gerb: the crash-retrieval team Barber and Herrera encountered is deep-black former JSOC Tier One — former Delta, SEAL Team 6, ISA (Gray Fox), and 24th STS operators willing to use force against civilians.",
     "person-sammy-gerb-extended", "speculation",
     ["person-sammy-gerb-extended", "program-gray-fox-isa", "person-jake-barber",
      "person-michael-herrera", "concept-crash-retrieval"],
     "This is likely a deep black former JSOC Joint Special Operations Command, Tier One Operators, former Delta, SEAL Team 6, Intelligence Support Activity, 24th STS. These guys are bad eggs who are okay with hurting people."),
    ("gerb-sdi-star-wars-uap-backdoor", 477,
     "Gerb posits Reagan's 1983 SDI ('Star Wars') likely had a back door to fund UAP programs and act offensively against UAP — not just against Soviet ICBMs.",
     "person-sammy-gerb-extended", "speculation",
     ["person-sammy-gerb-extended", "program-sdi-star-wars"],
     "There's also stories about the 1983 strategic defense initiative instituted by Ronald Reagan, which was to act against Soviet ICBMs. Star Wars. This likely had a back door to fund UAP programs and act offensively against UAP."),
    ("gerb-army-icbm-brainwave", 475,
     "Gerb notes the golden age of Army R&D investigated using human brain waves to guide ICBM missiles via recovered NHI technology — mind-machine interface applied to strategic weapons.",
     "person-sammy-gerb-extended", "cited_from_document",
     ["person-sammy-gerb-extended", "concept-reverse-engineering"],
     "The foreign technology division was trying to use recovered technology to use human brain waves to guide ICBM missiles. And wow, it is not only possible, it is essential."),
    ("gerb-nest-doe-hazmat-team", 513,
     "The crash-retrieval team Wagant encountered (DOE rain jackets, hazmat suits) matches DOE's NEST (Nuclear Emergency Search Team) profile — which handles nuclear-and-NHI-hazard containment.",
     "person-sammy-gerb-extended", "speculation",
     ["person-sammy-gerb-extended", "person-jonathan-wagant",
      "program-nest-nuclear-emergency-search-team"],
     "Some of them wore DOE lettered rain jackets and there were other military operators in black fatigues. This must have been a specialized crash retrieval team to contain biologics spillage. I think this is likely a DOE NEST team, nuclear emergency search teams."),
    ("gerb-herrera-psionic-asset-trafficking", 503,
     "Herrera's core hypothesis: UFO legacy programs engage in 'psionic asset trafficking' — kidnapping citizens of third-world countries (Indonesia in his 2009 case) and transporting them to US to summon NHI craft.",
     "person-sammy-gerb-extended", "hearsay",
     ["person-sammy-gerb-extended", "person-michael-herrera"],
     "He thinks that this whole thing is part of some sort of psionic asset trafficking scheme where UFO legacy programs are actually taking people in third world countries like Indonesia back to the US in order to summon craft."),
    ("gerb-herrera-2009-vantablack-octagon", 501,
     "Michael Herrera 2009 Indonesia: saw 'vantablack octagon' craft hovering above treetops; his unit intercepted by elite paramilitary team carrying advanced M4 rifles with bioscanners (foreshadowing iPhone-like technology at that time).",
     "person-sammy-gerb-extended", "cited_from_document",
     ["person-sammy-gerb-extended", "person-michael-herrera"],
     "Michael Herrera is this case in Indonesia with this marine unit and they see this vantablack octagon shape craft hovering above the treetops. These men back in 2009 had really advanced M4 rifles with beautiful rangefinders and bioscanners. Like a modern cell phone to scan their identification."),
]


if __name__ == "__main__":
    print("Extending videos 43-52...")
    extend(VID43, entities_43, claims_43)
    extend(VID44, entities_44, claims_44)
    extend(VID45, entities_45, claims_45)
    extend(VID46, entities_46, claims_46)
    extend(VID47, entities_47, claims_47)
    extend(VID48, entities_48, claims_48)
    extend(VID49, entities_49, claims_49)
    extend(VID50, entities_50, claims_50)
    extend(VID51, entities_51, claims_51)
    extend(VID52, entities_52, claims_52)
    print("Done.")
