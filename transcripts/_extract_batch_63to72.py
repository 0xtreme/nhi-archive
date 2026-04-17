"""Deep claim extraction for videos 63-72."""
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


# V63 GQlWf54K_7Y — Richard Dolan / Forrestal
VID63 = "GQlWf54K_7Y"
entities_63 = [
    P("richard-dolan-extended", "Richard Dolan (extended)", VID63, 13,
      "UFO historian; UFOs and the National Security State; PhD-level academic exit",
      "American UFO historian; two unfinished history PhDs (German diplomatic history / US national security strategy 1950). Left academia after reading Timothy Good's 'Above Top Secret' in 1994 at age ~32. Author of UFOs and the National Security State.",
      ["Dolan"], "historian", ["historian", "researcher", "author"]),
    P("james-forrestal", "James Forrestal", VID63, 8,
      "First US Secretary of Defense; died May 1949 under suspicious circumstances",
      "First US Secretary of Defense (1947-1949). Developed unusual nervous tics; reported being followed by 'strange foreign-looking men'; drank only distilled water. Died May 1949 — official ruling suicide via 16th-floor hospital window; Dolan argues 'two big tough Navy guys grabbed him and threw him out the window.'",
      ["Forrestal", "Forrestal Defense Secretary"], "politician",
      ["DoD", "historical", "UFO-related death"]),
    incident("forrestal-1949-death", "James Forrestal 'Suicide' (1949)", "other", "1949-05-22",
        [src(VID63, 8, "First SecDef murder framed as suicide per Dolan")],
        summary="May 22 1949: James Forrestal, first US Secretary of Defense, dies falling from 16th floor Bethesda naval hospital. Official ruling: suicide. Dolan asserts he was thrown by Navy men — his nervous ticks and statements about being followed preceded UFO-era discussions."),
    document("above-top-secret-timothy-good", "Above Top Secret (Timothy Good)", "book",
        [src(VID63, 27, "Timothy Good's 1987 foundational UFO investigative work")],
        summary="Timothy Good's seminal 1987 UFO book 'Above Top Secret: The Worldwide UFO Cover-Up' — the book that drew Richard Dolan out of academia into UFO research.",
        author="Timothy Good", year=1987),
]
claims_63 = [
    ("dolan-forrestal-thrown-not-suicide", 9,
     "Per Dolan: two Navy men grabbed Forrestal and threw him out the 16th-floor window — his 'suicide' was murder, linked to UFO-era secrecy he was opposing.",
     "person-richard-dolan-extended", "speculation",
     ["person-richard-dolan-extended", "person-james-forrestal",
      "incident-forrestal-1949-death"],
     "A couple of big tough Navy guys grab him and throw him the hell out the window. I'm absolutely convinced that's what happened."),
    ("dolan-1980s-flood-the-zone-strategy", 11,
     "Dolan characterizes US UAP information strategy shift in the 1980s: from secrecy/denial to 'flood the zone' — pushing out many partial truths simultaneously to obscure core truth rather than deny.",
     "person-richard-dolan-extended", "speculation",
     ["person-richard-dolan-extended"],
     "In the 80s it felt like maybe the US moved from a strategy of secrecy and denial to flood the zone. Flood the zone doesn't mean put out BS. It means put out partial truths and put out a lot."),
    ("dolan-1825-sea-orange-sphere-diary", 13,
     "Dolan cites 1825-08-12 ship diary: at 3:30 AM night watch reported an orange spherical object rising from the ocean — centuries-old evidence of the UAP-from-water phenomenon.",
     "person-richard-dolan-extended", "cited_from_document",
     ["person-richard-dolan-extended", "concept-underwater-uap-bases-hypothesis"],
     "He writes in his diary at 3:30 a.m. on August 12th, 1825 — the Night Watch reported this orange spherical object rise from the ocean."),
    ("dolan-timothy-good-1994-academic-exit", 27,
     "Dolan's academic exit catalyst: reading Timothy Good's 'Above Top Secret' in 1994 at age ~32 — two years obsessed in bed staring at the ceiling with 'if then' questions about Truman, Eisenhower, Kennedy administrations he had been studying.",
     "person-richard-dolan-extended", "personal_account",
     ["person-richard-dolan-extended", "document-above-top-secret-timothy-good"],
     "I saw a copy of Timothy Good's Above Top Secret. My question was simply: how come I never read about it in any academic history book? I left the University of Rochester. For an entire year I'd lie in bed staring at the ceiling thinking all of these if-thens."),
]

# V64 p0S0BfoZy0w — John Brandenburg Mars nuclear war
VID64 = "p0S0BfoZy0w"
entities_64 = [
    P("john-brandenburg", "Dr. John Brandenburg", VID64, 53,
      "Plasma physicist; GEM theory; Mars nuclear-war evidence",
      "Plasma physicist. PhD; worked at Lawrence Livermore (fusion research under Edward Teller), then Sandia National Labs (directed energy weapons). Author of GEM (Gravity-Electromagnetism) unified-field theory. Discovered isotopic evidence for ancient thermonuclear-scale event on Mars.",
      ["Brandenburg"], "physicist",
      ["scientist", "physicist", "Mars-researcher"]),
    concept("gem-gravity-em-theory", "GEM Theory (Gravity-Electromagnetism)", "physics",
        [src(VID64, 57, "Brandenburg's unified-field framework marrying gravity and EM")],
        summary="John Brandenburg's GEM (Gravity-Electromagnetism) theoretical framework attempting to marry gravity and electromagnetism from experimental perspective — extending Townsend Brown's work into a formal unified theory."),
    concept("mars-nuclear-war-isotopes", "Mars Thermonuclear-Holocaust Hypothesis", "physics",
        [src(VID64, 53, "Isotopic evidence for ancient Mars nuclear event per Brandenburg")],
        summary="Brandenburg's hypothesis: isotopic evidence (Xenon-129 enrichment) on Mars indicates an ancient thermonuclear-scale event that destroyed a Martian civilization. 'When it all hit me I wept like a child.'"),
    location("cydonia-mensae-mars", "Cydonia Mensae (Mars)", "region",
        [src(VID64, 51, "Mars site containing the Face, five-sided pyramid, and alleged ocean evidence")],
        country="MARS"),
    location("lawrence-livermore", "Lawrence Livermore National Lab", "research_facility",
        [src(VID64, 63, "Fusion research + H-bomb development; Brandenburg's first lab")],
        country="US", state="California"),
    location("sandia-national-lab", "Sandia National Laboratories", "research_facility",
        [src(VID64, 65, "Directed-energy weapons lab; Brandenburg's second lab")],
        country="US", state="New Mexico"),
    event("able-archer-1983-crisis", "Able Archer 1983 Nuclear Crisis", "other", "1983-11-02",
        [src(VID64, 67, "Classified near-nuclear-war event Brandenburg lived through")],
        summary="November 1983 classified nuclear war brinkmanship during NATO Able Archer exercise — US was as close to nuclear war as during Cuban Missile Crisis. Only lab-fence personnel knew at the time."),
]
claims_64 = [
    ("brandenburg-mars-xenon-isotopes", 53,
     "Brandenburg analyzed Mars isotopic evidence — Xenon-129 enrichment consistent with ancient thermonuclear-scale event — corroborating a dead-civilization-destroyed-by-nuclear-war hypothesis. 'I wept like a child.'",
     "person-john-brandenburg", "personal_account",
     ["person-john-brandenburg", "concept-mars-nuclear-war-isotopes",
      "location-cydonia-mensae-mars"],
     "I found and digested the isotopic evidence and when it all hit me I wept like a child. It looked like a thermonuclear holocaust. We were so afraid it would happen on Earth."),
    ("brandenburg-martian-ocean-discovery", 51,
     "Brandenburg was the researcher who found evidence of a Martian ocean: 'Mars was covered with liquid water. I was the one to find the Martian ocean.'",
     "person-john-brandenburg", "personal_account",
     ["person-john-brandenburg", "location-cydonia-mensae-mars"],
     "Mars was covered with liquid water. I was the one to find the Martian ocean."),
    ("brandenburg-cydonia-face-pyramid-suppressed", 51,
     "Per Brandenburg: NASA never shows the 'Face' on Mars and the five-sided pyramid together in public photos — because juxtaposition makes archaeological origin obvious. Brandenburg saw Carl Sagan push him on the evidence when colleagues mocked it.",
     "person-john-brandenburg", "on_record_statement",
     ["person-john-brandenburg", "location-cydonia-mensae-mars", "person-carl-sagan",
      "organization-nasa"],
     "Cydonia Mensae is a site where there's the face and then there's a five-sided pyramid. NASA never shows that picture of the face beside the pyramid together in any of their public photos. Carl Sagan is trying to get hold of me and I said, 'What you think of the pictures? Why are you causing this trouble?'"),
    ("brandenburg-joint-chiefs-staff-confirm", 77,
     "At a staff level of the Joint Chiefs during the Reagan administration, a colonel Brandenburg knew directly confirmed: 'Is there really a UFO coverup? Yes. That's all I can tell you. The rest you can figure out for yourself.'",
     "person-john-brandenburg", "hearsay",
     ["person-john-brandenburg"],
     "A friend of a friend worked for the Joint Chiefs of Staff. He was a colonel. I asked this fellow, 'Is there really a UFO cover up?' And he said, 'Yes. And that's all I can tell you. The rest you can figure out for yourself.'"),
    ("brandenburg-able-archer-1983", 67,
     "Brandenburg lived through the classified November 1983 Able Archer near-nuclear-war crisis at Sandia — 'only people on the lab premises inside the fence knew how bad things were.'",
     "person-john-brandenburg", "personal_account",
     ["person-john-brandenburg", "event-able-archer-1983-crisis",
      "location-sandia-national-lab"],
     "The Able Archer crisis of 1983 which was classified. We were as close to a nuclear war as we were during the Cuban missile crisis but it was secret. Only people on the lab premises inside the fence knew how bad things were."),
    ("brandenburg-teller-conscience", 83,
     "Brandenburg personally knew Edward Teller at Livermore; describes Teller (contrary to post-Oppenheimer villain framing) as 'creative, enlightened, conscience-driven' — H-bomb motivated by Hungarian Russia-fear and Western defense necessity.",
     "person-john-brandenburg", "personal_account",
     ["person-john-brandenburg", "person-edward-teller"],
     "He had big eyebrows. He's Hungarian and Jewish. I considered him a very creative, enlightened person. He was acting on instinct — from Hungary which has a bad history with Russia."),
]

# V65 aa9Xx5wI8Rw — Karl Nell + Diana Pasulka
VID65 = "aa9Xx5wI8Rw"
entities_65 = [
    P("karl-nell", "Colonel Karl Nell", VID65, 100,
      "Army UAP Task Force rep; Lockheed/Northrop; Army Futures Command",
      "US Army Colonel; deep aerospace industry experience at Lockheed Martin and Northrop Grumman; commanded every level of Army to Brigade; helped set up Army Futures Command; Army representative for the UAP Task Force.",
      ["Nell", "Col Nell"], "military officer",
      ["military", "Army", "UAP-Task-Force"]),
    P("miguel-alcubierre", "Miguel Alcubierre", VID65, 114,
      "Mexican physicist who solved GR for FTL warp drive in 1994",
      "Mexican theoretical physicist; 1994 at University of Mexico as postgrad solved Einstein's equations for an effective faster-than-light 'warp drive' mechanism requiring negative energy.",
      ["Alcubierre"], "physicist",
      ["physicist", "Mexican", "academic"]),
    P("lord-hill-norton", "Lord Hill-Norton", VID65, 122,
      "UK Admiral of the Fleet; former MoD staff; UFO-real advocate",
      "British Admiral of the Fleet; former Chief of the Defence Staff of the United Kingdom; publicly stated UFOs are real.",
      ["Hill-Norton"], "military officer",
      ["military", "UK", "historical"]),
    P("haim-eshed", "Haim Eshed", VID65, 123,
      "Father of Israeli space program; NHI-real advocate",
      "Father of the Israeli space program; publicly stated non-human intelligence is real.",
      ["Eshed"], "official",
      ["Israel", "scientist"]),
    concept("three-lines-of-uap-evidence", "Three Lines of UAP Evidence (Nell)", "politics",
        [src(VID65, 106, "Nell's framework: first principles + testimony + data")],
        summary="Col Karl Nell's framework for evaluating UAP reality: (1) first principles (physics/biology); (2) testimony (from well-positioned people); (3) data (sensor / observation records). All three lines converge on UAP reality."),
    concept("cosmere-effect-negative-energy", "Casimir Effect (Negative Energy)", "physics",
        [src(VID65, 117, "Quantum-vacuum demonstration of negative-energy existence")],
        summary="Casimir Effect — known 1940s, demonstrated 1990s — provides experimental evidence for the existence of negative energy in quantum mechanics. Negative energy is required for Alcubierre warp drive and is also the nature of Dark Energy driving universe expansion."),
    concept("population-i-stars-scale", "20-Billion Population-I Stars (5B-yr Head Start)", "physics",
        [src(VID65, 112, "20 billion sun-like stars in galaxy; many 5B years older than Sun")],
        summary="Per Nell: 20 billion Population-I (sun-like) stars in the Milky Way. The Sun is relatively young Population I. Stars like the Sun exist 5 billion years older than it. Massive evolutionary-civilizational-time head-start window for NHI."),
]
claims_65 = [
    ("nell-3-lines-evidence-uap-reality", 106,
     "Col Karl Nell argues UAP reality is established through three convergent evidence lines: (1) first principles (biology evolves fast, FTL is physically possible); (2) testimony (Obama, Trump, Hill-Norton, Eshed, Hellyer, Mellon, Grusch, Elizondo); (3) data.",
     "person-karl-nell", "on_record_statement",
     ["person-karl-nell", "concept-three-lines-of-uap-evidence", "person-grusch"
      if False else "person-david-grusch", "person-miguel-alcubierre"],
     "There's sort of three lines of evidence. First principles — the laws of physics. Testimonial — from people in positions to know. And then there's the data. Life is common. Faster than light travel is possible."),
    ("nell-alcubierre-valid-solution", 117,
     "Nell: Alcubierre's 1994 warp drive solution to Einstein's equations is valid (NASA verified); requires negative energy; Casimir effect + Dark Energy expansion are evidence negative energy exists — 'theoretical solution' not merely science fiction.",
     "person-karl-nell", "on_record_statement",
     ["person-karl-nell", "person-miguel-alcubierre", "concept-cosmere-effect-negative-energy",
      "concept-alcubierre-drive"],
     "Miguel Alcubierre solved Einstein's equations for an effective faster than light mechanism. NASA's looked into this, there's no dispute that the solution is a valid solution. The Casimir effect in the 60s demonstrated in the 90s is evidence for the existence of negative energy."),
    ("nell-20b-population-one-stars", 113,
     "Nell: there are 20 billion Population I (sun-like) stars in the galaxy; many are 5 billion years older than the Sun — massive head-start windows for civilizational evolution statistically dwarf human existence.",
     "person-karl-nell", "on_record_statement",
     ["person-karl-nell", "concept-population-i-stars-scale"],
     "There's 20 billion population one stars in the galaxy. The sun is like a relatively young population one star. There's stars like the sun that are 5 billion years older than the Sun."),
    ("nell-obama-trump-briefed", 121,
     "Per Nell: Barack Obama, Donald Trump, Lord Hill-Norton (UK), Haim Eshed (Israel), Paul Hellyer (Canada), Chris Mellon, David Grusch have all publicly said UFOs/NHI are real — testimony from positions where they had been briefed.",
     "person-karl-nell", "on_record_statement",
     ["person-karl-nell", "person-lord-hill-norton", "person-haim-eshed",
      "person-paul-hellyer", "person-chris-mellon", "person-david-grusch"],
     "You've got to explain why Barack Obama, Donald Trump all say UFOs are real. Admiral of the fleet Lord Hill-Norton. Haim Eshed the father of the Israeli space program. Paul Hellyer former minister of defense for Canada. Chris Mellon. David Grusch."),
    ("nell-life-evolved-4-1bn", 109,
     "Per Nell: stromatolite fossilized blue-green algae from 3.5 billion years ago; recent scholarship suggests life evolved 4.1 billion years ago — before Earth's crust had even cooled — either life evolves very quickly OR panspermia.",
     "person-karl-nell", "cited_from_document",
     ["person-karl-nell"],
     "Blue green algae fossilized in stromatolites from 3.5 billion years ago. Recent scholarship has indicated that life may have evolved even earlier, 4.1 billion years ago. The crust has not even cooled by 4.1 billion years ago. Life is either evolving very quickly or some sort of panspermia is going on."),
]

# V66 ATJwqp5twAg — Ralph Moat Larson CIA time traveler
VID66 = "ATJwqp5twAg"
entities_66 = [
    P("ralph-moat-larson", "Ralph Moat Larson", VID66, 134,
      "Former CIA + DoE intelligence officer; Moscow Station Chief; time-traveler / mystic",
      "Former CIA officer 20+ years in various roles globally; briefed Bush 43, Cheney, and Tony Blair; Moscow Station Chief; worked directly with Hayden (NSA) and Tennant (CIA). Later ran intelligence/counter-intelligence for the US Department of Energy (DoE). Claims 1991 time-travel experience: fell asleep at Mount Athos Greece and lived as 14th-century monk for months, physically.",
      ["Larson", "Ralph Moa"], "intelligence officer / mystic",
      ["CIA", "DoE", "mystic", "experiencer"]),
    concept("mount-athos-time-travel-1991", "1991 Mount Athos Time-Travel Event (Larson)", "metaphysics",
        [src(VID66, 136, "Larson claims physical time-travel from modern Greece to 14th century during monastic pilgrimage")],
        summary="Ralph Moat Larson's claim: 1991 pilgrimage to Mount Athos Greece; sitting in stone chair, time 'evaporating' with every step; lived as a recluse-monk in 14th-century Mount Athos for months — physical reality indistinguishable from modern waking reality."),
]
claims_66 = [
    ("larson-1991-mount-athos-time-travel", 136,
     "Larson claims a 1991 pilgrimage to Mount Athos Greece triggered physical time-travel to the 14th century — he lived as a recluse monk there for months, learning to fly spiritually, burning his hut — reality 'indistinguishable from this interview.'",
     "person-ralph-moat-larson", "personal_account",
     ["person-ralph-moat-larson", "concept-mount-athos-time-travel-1991"],
     "I went on a pilgrimage to Mount Athos, Greece. I'm sitting at this stone chair facing the church. With every step I'm taking, the time is going back in time. I left my 20th century identity behind in 1991 to go live as a monk in Mount Athos Greece in the 14th century. Does all of this feel as real as this interview feels? Yeah."),
    ("larson-doe-more-important-than-cia", 148,
     "Larson publicly states DoE intelligence handles some of the nation's most important secrets — MORE important than CIA's — aligning with the thesis that UFO crash retrieval is housed under DoE clearance system.",
     "person-ralph-moat-larson", "on_record_statement",
     ["person-ralph-moat-larson", "concept-manhattan-project-clearance-system"],
     "I learned some of this nation's most important secrets at DOE, not CIA. DOE does stuff that man. Department of Energy has a lot to do with managing UFO secrecy and crash retrievals."),
    ("larson-briefed-bush-cheney-blair", 136,
     "Larson directly briefed George W. Bush, Vice President Dick Cheney, and UK Prime Minister Tony Blair. Worked with NSA Director Michael Hayden and CIA Director George Tenet.",
     "person-ralph-moat-larson", "on_record_statement",
     ["person-ralph-moat-larson"],
     "He describes working directly with NSA Director Michael Hayden, CIA Director George Tennant, and even briefing former President George W. Bush, Vice President Dick Cheney, and UK Prime Minister Tony Blair."),
]

# V67 92XrddiKjHY — Luke Caverns pyramids
VID67 = "92XrddiKjHY"
entities_67 = [
    P("luke-caverns", "Luke Caverns", VID67, 190,
      "Vigilante archaeologist; distant Reagan family descendant; lost-Spanish-gold heritage",
      "American independent archaeologist in his 20s; distant cousin of Ronald Reagan (chose 'Caverns' as middle name publicly). Descended from 1890s Spanish-gold-mining family in American Southwest — inherited adventurous spirit. Mentored by Ed Barnhart; inspired by Hancock and Randall Carlson.",
      ["Caverns", "Reagan"], "archaeologist",
      ["archaeologist", "researcher"]),
    P("filippo-biondi", "Filippo Biondi", VID67, 184,
      "Italian researcher leading SAR Doppler tomography of Giza Plateau",
      "Italian researcher who in 2025 led a team applying synthetic aperture radar Doppler tomography plus AI to reconstruct apparent subsurface energy grid beneath the Giza Plateau.",
      ["Biondi"], "researcher", ["researcher", "Italian"]),
    P("ed-barnhart", "Ed Barnhart", VID67, 190,
      "Academic mentor of Luke Caverns; archaeologist",
      "American archaeologist; mentor of Luke Caverns.",
      ["Barnhart"], "archaeologist", ["archaeologist"]),
    event("2024-japanese-egyptian-sphinx-cemetery-gpr", "2024 Western-Cemetery Sphinx GPR Mapping", "publication", "2024-01-01",
        [src(VID67, 180, "Ground-penetrating radar L-shaped structure near Sphinx")],
        summary="2024 Egyptian-Japanese researcher collaboration using ground-penetrating radar and electrical resistivity tomography. Mapped a shallow L-shaped structure approximately 10m long in the western cemetery adjacent to the Great Pyramid. Function still unknown; structure verified real."),
]
claims_67 = [
    ("caverns-2024-gpr-l-shaped-verified", 180,
     "2024 Japanese-Egyptian researcher collaboration used GPR and electrical resistivity tomography to verify a shallow L-shaped underground structure ~10m long in the western cemetery adjacent to the Great Pyramid — function unknown, existence verified.",
     "person-jesse-michels", "cited_from_document",
     ["person-luke-caverns", "event-2024-japanese-egyptian-sphinx-cemetery-gpr"],
     "In 2024, a collaborative effort between Egyptian and Japanese researchers using ground penetrating radar and electrical resistivity tomography mapped the western cemetery adjacent to the Great Pyramid. Their non-invasive methods revealed a shallow L-shaped structure approximately 10 m long."),
    ("hawass-admits-3-sphinx-tunnels", 183,
     "Even Zahi Hawass (former Egyptian Minister of Antiquities — 'professional Debbie Downer and skeptic') has publicly acknowledged the existence of three independent tunnels associated with the Sphinx.",
     "person-jesse-michels", "cited_from_document",
     ["person-luke-caverns", "person-zahi-hawass", "location-giza-plateau"],
     "Former minister of antiquities, Dr. Zahi Hawass, known for being a professional Debbie Downer and skeptic, himself has acknowledged the existence of three independent tunnels associated with the Sphinx."),
    ("biondi-2025-sar-doppler-circulated-handwavy", 186,
     "Jesse notes 2025 Biondi's SAR Doppler tomography images circulating online show impressive granularity but 'take a lot of liberties' — actual images don't match what's circulating. Crowd-conditioning effect possible.",
     "person-jesse-michels", "speculation",
     ["person-filippo-biondi", "concept-photon-phonon-sar", "location-giza-plateau"],
     "A team of researchers led by Filippo Beyond used synthetic aperture radar Doppler tomography and artificial intelligence. The image circulating the internet involves a level of granularity and detail and takes a lot of liberties. The actual tomography images don't match what's being circulated online."),
    ("caverns-500-year-monument-progression", 181,
     "Caverns points to a 500-year progression of temple/monument architecture getting incrementally larger and more monumental across Egypt — each culture building for 'god beings' recognized across ancient civilizations.",
     "person-luke-caverns", "on_record_statement",
     ["person-luke-caverns", "location-giza-plateau"],
     "You have a 500 year period where we can see a progression of architecture getting bigger and bigger and more monumental. All these ancient temples erected on behalf of these god beings. Every ancient culture recognizes these gods that exist on our planet."),
    ("caverns-akhenaten-aten-elongated-skulls", 177,
     "Per Caverns: Amenhotep IV renamed himself Akhenaten, switched worship to monotheistic sun-god Aten, and then depicted himself with elongated skulls — origin of skull-elongation motif unknown.",
     "person-luke-caverns", "cited_from_document",
     ["person-luke-caverns"],
     "Amenhotep dies. Amenhotep IV becomes king. And he says, 'I'm not worshiping Amen anymore. I'm only going to acknowledge the one true sun god, the Aten.' And then they start depicting themselves with the elongated skulls."),
]

# V68 NvQXmtcwHA8 — Massive Energy Grid Pyramids
VID68 = "NvQXmtcwHA8"
entities_68 = [
    P("christopher-dunn", "Christopher Dunn", VID68, 250,
      "Aerospace engineer; pyramid-as-energy-machine proponent",
      "Former aerospace engineer; Joe Rogan guest; author of 'The Giza Power Plant' proposing the Great Pyramid was an ancient energy-generation machine using granite chambers and quartz-resonant geometry.",
      ["Dunn"], "engineer", ["engineer", "author", "researcher"]),
    P("jeffrey-drum", "Jeffrey Drum", VID68, 252,
      "Land of Chem YouTuber; pyramid-as-atmospheric-chemistry proponent",
      "YouTube creator (Land of Chem channel); believes pyramids harnessed atmospheric electricity to produce hydrogen gas and ammonium-based compounds — industrial-scale ancient chemistry.",
      ["Drum"], "researcher", ["researcher", "chemistry"]),
    P("jean-pierre-houdin", "Jean-Pierre Houdin", VID68, 244,
      "French architect proposing internal-ramp pyramid construction theory",
      "French architect whose internal-spiraling-ramp hypothesis for Great Pyramid construction gained renewed interest after Scan Pyramids project detected unexplained internal voids.",
      ["Houdin"], "architect", ["architect"]),
    concept("pyramid-chemical-factory", "Pyramids as Chemical Factories (Drum)", "technology",
        [src(VID68, 233, "Drum's hypothesis: each pyramid produces specific chemical; sequence transforms products")],
        summary="Jeffrey Drum's hypothesis: each pyramid produces a specific chemical; the sequence of chemicals transforms one product into the next into the next — industrial-scale chemical manufacturing. Not just monuments but functional machines."),
    concept("pyramid-as-energy-machine", "Pyramid as Ancient Energy Machine (Dunn)", "technology",
        [src(VID68, 250, "Dunn's hypothesis: vibrations + quartz crystals generating power")],
        summary="Christopher Dunn's hypothesis that the Great Pyramid was designed as an ancient energy-generating machine — internal chambers + granite + resonant geometry + quartz crystals working together to produce power through vibration-based mechanisms."),
]
claims_68 = [
    ("pyramid-tubes-coils-kilometer-deep", 234,
     "If the SAR-Doppler findings are valid: tubular structures with coil-wrapped pillars extending a kilometer deep with a foundation beneath — there is no physically plausible explanation for how ancient civilization could have built this.",
     "person-jesse-michels", "cited_from_document",
     ["concept-giza-subterranean-tubes", "concept-photon-phonon-sar"],
     "If we do have tubular structures, pillars with coils wrapping around them that go a kilometer deep with a foundation underneath them, that's insane. There's no physical way that these could possibly have been built. Then I'm going with aliens, right?"),
    ("pyramid-fossilized-lightning-iron-veins", 226,
     "Electrical phenomenon documented inside pyramid — fossilized lightning through iron veins. There is 'something that can't be disclosed' about the Pais-like lack-of-signature inside the pyramid.",
     "person-jesse-michels", "cited_from_document",
     ["concept-pyramid-as-energy-machine"],
     "There is also electricity inside this — fossilized lightning through these iron veins. What is creating the lack of signature here? There is something I can't disclose it now."),
    ("dunn-pyramid-quartz-resonance", 250,
     "Dunn's Giza Power Plant hypothesis: internal chambers, granite structures, and resonant geometry worked together generating power through vibrations interacting with quartz crystals inside the stone.",
     "person-jesse-michels", "cited_from_document",
     ["person-christopher-dunn", "concept-pyramid-as-energy-machine"],
     "Christopher Dunn proposed that the Great Pyramid might have functioned as an ancient energy machine. The pyramid's internal chambers, granite structures, and resonant geometry may have all worked together to generate power, possibly through vibrations interacting with quartz crystals inside the stone."),
    ("drum-pyramid-hydrogen-ammonium", 253,
     "Per Jeffrey Drum: pyramids harnessed atmospheric electricity to produce hydrogen gas and ammonium-based compounds — industrial-scale ancient chemical manufacturing rather than electricity generation.",
     "person-jesse-michels", "cited_from_document",
     ["person-jeffrey-drum", "concept-pyramid-chemical-factory"],
     "Jeffrey Drum, who runs Land of Chem YouTube channel, believes the pyramids weren't producing electricity at all. They were harnessing atmospheric electricity and producing hydrogen gas and ammonium based compounds."),
    ("houdin-internal-ramp-voids", 244,
     "French architect Jean-Pierre Houdin's internal-spiraling-ramp pyramid-construction hypothesis gained renewed traction after Scan Pyramids project detected unexplained voids inside the Great Pyramid.",
     "person-jesse-michels", "cited_from_document",
     ["person-jean-pierre-houdin"],
     "Jean Pierre Houdan suggests that an internal ramp spiraling within the pyramid structure itself carried the blocks. This idea gained renewed interest after the scan pyramids project detected unexplained voids inside the great pyramid."),
]

# V69 wT5-hXWIkzM — Rupert Sheldrake
VID69 = "wT5-hXWIkzM"
entities_69 = [
    P("rupert-sheldrake", "Rupert Sheldrake", VID69, 259,
      "Cambridge-educated biologist; morphic resonance theorist; Peter Thiel linked",
      "Cambridge-educated, Harvard-affiliated biologist and parapsychology researcher. Author of 'The Presence of the Past', 'Science Set Free', 'The Physics of Angels'. Famous for morphic-resonance theory. Censored 2013 TED Talk. Close friend of Terence McKenna.",
      ["Sheldrake"], "biologist",
      ["scientist", "academic", "Cambridge", "Harvard"]),
    P("peter-thiel", "Peter Thiel", VID69, 281,
      "Tech investor / Palantir co-founder; hired Jesse after Sheldrake reference",
      "American tech investor; Palantir co-founder; PayPal Mafia. Per Jesse: hired him after Jesse mentioned Rupert Sheldrake in their first conversation — Thiel looks for 'modern heretics.'",
      ["Thiel"], "investor",
      ["investor", "technologist"]),
    P("michael-shermer-debate-italy", "Michael Shermer (Italy debate)", VID69, 273,
      "Skeptic; Jesse freshly debated him in Italy before Sheldrake interview",
      "Founder of Skeptic Magazine; Jesse debated him in Italy immediately before the Sheldrake interview.",
      ["Shermer"], "author", ["skeptic", "author"]),
    P("terrence-mckenna", "Terence McKenna", VID69, 275,
      "Psychedelic-philosopher; Sheldrake's close friend",
      "American ethnobotanist and psychedelic philosopher (1946-2000); close friend of Rupert Sheldrake. Famous for 'Timewave Zero', DMT research, 'machine elves' framework.",
      ["McKenna"], "philosopher / ethnobotanist",
      ["philosopher", "psychonaut", "historical"]),
    document("physics-of-angels-sheldrake", "The Physics of Angels", "book",
        [src(VID69, 275, "Sheldrake book on traditional angel-concepts with modern physics")],
        summary="Rupert Sheldrake's lesser-known book exploring traditional conceptions of angels and how they might work in a modern scientific context. Relevant to modern UFO conversation.",
        author="Rupert Sheldrake"),
    concept("morphic-resonance", "Morphic Resonance (Sheldrake)", "biology",
        [src(VID69, 261, "Sheldrake's theory of information fields across biological systems")],
        summary="Rupert Sheldrake's theory that humans and animals learn from surrounding information fields ('morphic fields') — babies sensing mothers' presence, humans knowing when stared at, animals sensing earthquakes."),
]
claims_69 = [
    ("thiel-hired-jesse-via-sheldrake-mention", 281,
     "Jesse was hired by Peter Thiel after their first conversation in which Jesse brought up Rupert Sheldrake — Thiel seeks 'modern heretics' as both intellectual contacts and investment signal.",
     "person-jesse-michels", "personal_account",
     ["person-jesse-michels", "person-rupert-sheldrake", "person-peter-thiel"],
     "In my first conversation with Peter Thiel who I ended up working for, I brought you up and he was like, 'this guy's into Rupert Sheldrake, he's a little weird — in a good way.' I always say that when people are like why did he hire you — I don't know to this day, but I did bring up Rupert Sheldrake."),
    ("sheldrake-ted-censored-2013", 269,
     "In 2013 Sheldrake's TED Talk was censored and taken off YouTube because TED felt his ideas were 'so radical and far removed from the mainstream scientific thinking that we think it's right to give these talks a clear health warning.'",
     "person-jesse-michels", "cited_from_document",
     ["person-rupert-sheldrake"],
     "In 2013, Rupert Sheldrake's TED Talk was censored and taken off YouTube because in TED's opinion, while science has not moved far in solving the riddle of consciousness, Sheldrake's ideas are so radical that we think it's right to give these talks a clear health warning."),
    ("sheldrake-not-idealist-em-consciousness", 289,
     "Sheldrake rejects both materialism AND idealism; spent years thinking about how Consciousness might be related to electromagnetic fields — particularly via vision where light IS electromagnetic radiation.",
     "person-rupert-sheldrake", "on_record_statement",
     ["person-rupert-sheldrake"],
     "I don't think of myself as an idealist. Consciousness is primary — that's idealism. Materialism says everything's matter. I don't find either of those philosophies particularly helpful. I've spent a lot of time thinking about how consciousness might be related to electromagnetic fields."),
    ("sheldrake-mckenna-close-friendship", 275,
     "Sheldrake had a long close friendship with Terence McKenna — relevant to modern UFO/psychedelic conversation.",
     "person-jesse-michels", "on_record_statement",
     ["person-rupert-sheldrake", "person-terrence-mckenna"],
     "We get into his long close friendship with the legendary Terence McKenna."),
    ("sheldrake-physical-constants-averages", 265,
     "Sheldrake documents that some physical 'constants' in physics are actually AVERAGES of fluctuating measurements — undermining the standard materialist assumption of fixed universal constants.",
     "person-jesse-michels", "cited_from_document",
     ["person-rupert-sheldrake"],
     "He shows that the physical constants in physics are sometimes actually averages of fluctuating measurements."),
]

# V70 7W7iOt57fOo — Skinwalker Ranch
VID70 = "7W7iOt57fOo"
entities_70 = [
    P("brandon-fugal-extended", "Brandon Fugal (extended)", VID70, 302,
      "Real-estate mogul; Skinwalker Ranch owner; History Channel show producer",
      "Utah real-estate mogul; current owner of Skinwalker Ranch since 2016; produces 'The Secret of Skinwalker Ranch' History Channel / Netflix docuseries. Describes himself as 'not a believer — an experiencer.'",
      ["Fugal"], "businessman",
      ["businessman", "investigator"]),
    P("aaron-blunt", "Aaron Blunt", VID70, 331,
      "Drill expert brought in to drill into Skinwalker mesa",
      "Drilling expert hired by Fugal's team to drill into the Skinwalker mesa; encountered a hard object ~400ft wide that his drill could not break through.",
      ["Blunt"], "drill operator", ["technician"]),
    P("ravi-chandran-metallurgist", "Dr. Ravi Chandran", VID70, 333,
      "Metallurgist analyzing Skinwalker metal shards",
      "Metallurgist who analyzed the shard samples from Skinwalker's mesa and confirmed they contained europium and tellurium — manufactured rather than naturally occurring.",
      ["Chandran"], "metallurgist", ["scientist", "metallurgist"]),
    P("sherman-family-skinwalker", "Sherman Family (Skinwalker)", VID70, 306,
      "1990s Skinwalker Ranch tenants haunted off property",
      "Family who owned Skinwalker Ranch in the 1990s; experienced orbs, UFOs, skinwalker entities, and an oversized bipedal wolf withstanding close-range shotgun attacks. Left the ranch.",
      ["Sherman"], "", ["experiencer", "Skinwalker"]),
    P("navajo-ute-skinwalker-curse", "Navajo (Skinwalker Curse Context)", VID70, 304,
      "Navajo tribe cursed local land with skinwalkers after Civil War defeat",
      "Navajo Nation — per local history, cursed the Uintah Basin land with skinwalkers after US Civil War defeat and feeling betrayed by Ute tribal alliance with US government.",
      [], "tribe / historical",
      ["historical", "tribe"]),
    incident("skinwalker-cow-pneumonia-radiation", "Skinwalker Heifer Mysterious Death", "sighting", "2020-01-01",
        [src(VID70, 320, "Healthy 2yo heifer killed by pneumonia coincident with UFO + radiation spike")],
        summary="A perfectly healthy 2-year-old heifer cow found dead on Skinwalker Ranch with no exterior injuries; autopsy ruled pneumonia from severe stressor. Surveillance footage showed a UFO-shaped object appeared directly above the cow at the moment of stress; high radiation readings detected."),
    technology("skinwalker-mesa-400ft-object", "Skinwalker Mesa 400ft Buried Object", "material",
        [src(VID70, 331, "Hard object 400ft wide buried in mesa; europium + tellurium metal shards")],
        summary="Hard object ~400ft wide buried in the mesa ridge at Skinwalker Ranch, detected via soil resistivity and ground-penetrating radar. Drilling could not penetrate. Recovered shards (Dr. Ravi Chandran analysis) were fused metal containing europium and tellurium — rare earth elements suggesting manufactured origin."),
]
claims_70 = [
    ("skinwalker-mesa-400ft-manufactured-metal", 331,
     "Drill expert Aaron Blunt hit a hard object 400ft wide buried in the Skinwalker mesa; recovered fused-metal shards analyzed by Dr. Ravi Chandran contained europium and tellurium — rare earth elements that are 'likely manufactured, not naturally occurring.'",
     "person-jesse-michels", "cited_from_document",
     ["person-aaron-blunt", "person-ravi-chandran-metallurgist",
      "technology-skinwalker-mesa-400ft-object", "concept-reverse-engineering"],
     "It scouted the edges and concluded it was a hard object 400 feet wide buried in the mesa. Dr Ravi Chandran revealed that they were fused metal and contained europium and tellurium. This material was manufactured as opposed to a natural occurrence."),
    ("skinwalker-cow-pneumonia-ufo-overhead", 320,
     "A perfectly healthy 2yo Skinwalker heifer was killed by pneumonia from severe stressor; surveillance footage showed a UFO-shaped object appeared directly above the cow at the moment of death; radiation spike coincident.",
     "person-jesse-michels", "cited_from_document",
     ["incident-skinwalker-cow-pneumonia-radiation", "person-brandon-fugal-extended"],
     "A perfectly healthy two-year-old heifer cow showed up dead with no exterior injuries. Pneumonia brought on by a severe stressor. Simultaneously the team was picking up high levels of radiation around the cow. The cow is right here — the moment the cow feels a disturbance, a UFO-shaped object appears directly above it."),
    ("skinwalker-navajo-ute-curse-origin", 304,
     "Per local history: in the 19th century, during US Civil War, the Navajo tribe was defeated in a battle where Utes had allied with the US government. Feeling betrayed, the Navajo cursed the Skinwalker-area land with 'skinwalkers' — malevolent shape-shifting entities.",
     "person-jesse-michels", "cited_from_document",
     ["person-navajo-ute-skinwalker-curse", "person-sherman-family-skinwalker"],
     "In the 19th century, the Utes partnered with the US government in a battle against the Navajo. Suffering a brutal defeat and feeling betrayed, the Navajo cursed the local land with skinwalkers — malevolent shape-shifting entities."),
    ("skinwalker-aatip-funded-research", 308,
     "Between 2007-2012 Skinwalker Ranch was the center of study for AATIP (Luis Elizondo) — via Robert Bigelow's private BAASS. All resulting data remains classified and not subject to FOIA due to private-contractor ownership.",
     "person-jesse-michels", "on_record_statement",
     ["program-aatip", "person-luis-elizondo", "person-robert-bigelow"],
     "Between 2007 and 2012 it became the center of study for AATIP, the official government UFO program led by Lou Elizondo. Because this program was also run under the auspices of Bigelow Aerospace, a private company, all of the data from it is both classified and not subject to the Freedom of Information Act."),
    ("fugal-experiencer-not-believer", 302,
     "Fugal explicitly rejects 'believer' framing: 'People ask me all the time, Brandon are you a believer now? I'm not a believer. I'm an experiencer.'",
     "person-brandon-fugal-extended", "personal_account",
     ["person-brandon-fugal-extended"],
     "People ask me all the time, Brandon Fugal, are you a believer now? The owner of Skinwalker Ranch and I tell them, no, I'm not a believer. I'm an experiencer."),
]

# V71 8XD1ZiuhXoY — Andrew Gallimore DMT
VID71 = "8XD1ZiuhXoY"
entities_71 = [
    P("andrew-gallimore", "Andrew Gallimore", VID71, 368,
      "Neuroscientist; DMT researcher; author Alien Information Theory",
      "Oxford-educated neuroscientist based in Japan; DMT researcher; author of 'Alien Information Theory' and forthcoming 'Death By Astonishment'. Proposes target-controlled intravenous DMT infusion for extended access to alien-contact realms.",
      ["Gallimore"], "neuroscientist",
      ["scientist", "researcher", "Oxford"]),
    P("william-burroughs", "William Burroughs", VID71, 368,
      "Author; source of 'Death By Astonishment' phrase",
      "American author (Naked Lunch); source of the 'Death By Astonishment' phrase Gallimore used as book title.",
      ["Burroughs"], "author", ["author", "historical"]),
    concept("tci-dmt-infusion-protocol", "Target-Controlled Intravenous DMT Infusion", "technology",
        [src(VID71, 352, "Gallimore's anesthesiology-borrowed DMT extended-access protocol")],
        summary="Andrew Gallimore's proposed protocol: target-controlled intravenous DMT infusion — borrowed from anesthesiology — maintaining subjects in the DMT realm for extended periods. Proposes sending mathematicians, topologists, and linguists to document higher-dimensional objects and communications."),
    concept("machine-elves-thousands-years", "Machine Elves / Higher-Dimensional NHI", "metaphysics",
        [src(VID71, 345, "Intelligent beings experienced in DMT state; pre-dating McKenna's framing")],
        summary="Intelligent beings encountered in DMT experiences displaying higher-dimensional objects; framed by McKenna as 'machine elves' but phenomenologically documented across thousands of years of human experience. Per Gallimore: not McKenna's invention."),
    document("alien-information-theory", "Alien Information Theory", "book",
        [src(VID71, 368, "Gallimore's main text on DMT and information-theoretic framework")],
        summary="Andrew Gallimore's main book presenting his information-theoretic framework for DMT phenomenology as real contact with non-human intelligences.",
        author="Andrew Gallimore"),
    document("death-by-astonishment", "Death By Astonishment", "book",
        [src(VID71, 368, "Gallimore forthcoming follow-up")],
        summary="Andrew Gallimore's forthcoming book; title homage to William Burroughs / Terence McKenna.",
        author="Andrew Gallimore"),
]
claims_71 = [
    ("gallimore-five-dim-visualization-dmt", 345,
     "Per Gallimore: there is no way to visualize a 5-dimensional object in its true form — yet DMT experiencers consistently DO visualize such objects; intelligent beings displayed them in the DMT realm for thousands of years.",
     "person-andrew-gallimore", "on_record_statement",
     ["person-andrew-gallimore", "concept-machine-elves-thousands-years"],
     "There's no way for you to visualize a five-dimensional object in its true form. And yet, when you smoke DMT, you do. It's not Terrence McKenna implanting the idea of machine elves. These are intelligent beings that go back thousands of years."),
    ("gallimore-tci-dmt-mathematicians", 352,
     "Gallimore proposes target-controlled intravenous DMT infusion (borrowed from anesthesiology) — maintaining mathematicians, topologists, and linguists in the DMT realm to document what intelligent beings are communicating.",
     "person-andrew-gallimore", "on_record_statement",
     ["person-andrew-gallimore", "concept-tci-dmt-infusion-protocol"],
     "Why don't we repurpose a technique from anesthesiology called target controlled intravenous infusion but with DMT. So we send in mathematicians, we send in geometers or topologists, we send in linguists."),
    ("gallimore-elite-access-dmt-realm", 353,
     "Gallimore entertains that elite members of society have been systematically accessing these DMT-adjacent realms — potentially helping shape our reality through downloaded contact.",
     "person-jesse-michels", "speculation",
     ["person-andrew-gallimore", "concept-machine-elves-thousands-years"],
     "Do you think that elite members of society have been systematically accessing these other realms, helping to shape our reality?"),
    ("gallimore-brain-contact-interface", 349,
     "Gallimore: 'If they want to communicate with us, they're going to do it through our brain.'",
     "person-andrew-gallimore", "on_record_statement",
     ["person-andrew-gallimore"],
     "If they want to communicate with us, they're going to do it through our brain."),
]

# V72 C4rSj5Aum7w — Danny Sheehan / JFK
VID72 = "C4rSj5Aum7w"
entities_72 = [
    P("jeremy-rys", "Jeremy Rys (alien scientist)", VID72, 398,
      "YouTuber ('alien scientist'); 20-year-veteran UFO researcher and historian",
      "American YouTube creator and UFO researcher ('alien scientist' channel); 20 years of video work on UFO and science topics; serious familiarity with JFK assassination research history.",
      ["Rys", "alien scientist"], "researcher / filmmaker",
      ["researcher", "filmmaker"]),
    P("david-morales", "David Morales", VID72, 413,
      "CIA S-Force assassin; alleged JFK shot-fire from knoll",
      "CIA operative; 'the Mexican'; described by JFK researchers as the 'crack shot' of the anti-Castro S-Force team. Per Sheehan, fired the shot from the null/knoll that killed Kennedy as part of the triangular-fire-team.",
      ["Morales"], "intelligence operative",
      ["CIA", "historical", "assassination"]),
    P("ed-lansdale", "Ed Lansdale", VID72, 391,
      "Air Force officer; covert-ops architect; identified in Dealey Plaza",
      "USAF general; covert-operations architect. Identified by his wife in Dealey Plaza photographs during the JFK assassination.",
      ["Lansdale"], "military officer",
      ["USAF", "CIA", "historical"]),
    P("rip-robertson", "Rip Robertson", VID72, 391,
      "CIA S-Force field operations commander; identified in Dealey Plaza",
      "CIA S-Force field operations commander; photographed in Dealey Plaza at moment of JFK assassination.",
      ["Robertson"], "intelligence operative",
      ["CIA", "historical", "assassination"]),
    P("priscilla-mcmillan", "Priscilla McMillan", VID72, 408,
      "CIA asset who interviewed Lee Harvey Oswald and wrote Marina's bio",
      "Per recent JFK files release: a CIA-witting asset who interviewed Lee Harvey Oswald when he went to Russia, befriended Marina Oswald, and wrote her autobiography — handler-level access to the primary sources.",
      ["McMillan"], "journalist", ["CIA", "historical"]),
    P("santos-trafficante", "Santos Trafficante", VID72, 418,
      "Mafia don of Havana; heroin-smuggling; CIA cooperation",
      "Mafia don of Havana pre-Castro; ran gambling casinos, prostitution, heroin smuggling from Southeast Asia. Per Sheehan: portion of heroin profits funded anti-Castro operations and Kuomintang arms smuggling.",
      ["Trafficante", "Trafocanti"], "organized crime",
      ["organized-crime", "historical", "heroin"]),
    program("5412-committee", "5412 Committee",
        [src(VID72, 415, "Eisenhower-era covert ops committee run by Nixon")],
        summary="US 5412 Committee — run by Vice President Nixon under Eisenhower. Architected the Bay-of-Pigs S-Force anti-Castro covert operations that, per Sheehan, were redirected to the JFK assassination.",
        acronym="5412"),
    program("s-force-anti-castro", "S-Force (Anti-Castro Assassination Team)",
        [src(VID72, 413, "CIA anti-Castro triangular-fire-team assassination unit")],
        summary="CIA anti-Castro S-Force assassination team. Triangular-fire-team structure for moving targets. Trained at Clint Murchison Jr.'s ranch in Oaxaca, Mexico. Originally targeted Castro, Raul Castro, Che Guevara, and 5 other comandantes. Per Sheehan: repurposed to assassinate JFK.",
        acronym="S-Force"),
    event("2025-jfk-file-release", "2025 JFK File Release", "publication", "2025-03-01",
        [src(VID72, 393, "National Archives 80,000 page JFK file declassification")],
        summary="March 2025: National Archives released ~80,000 pages of declassified records related to JFK's assassination under Trump administration. Sheehan and Rys assert the released files confirm the CIA assassination network."),
]
claims_72 = [
    ("sheehan-morales-fired-fatal-shot", 413,
     "Per Daniel Sheehan's JFK assassination analysis: David Morales ('the Mexican') — CIA crack shot of the S-Force anti-Castro team — fired the fatal shot from the null/knoll that killed Kennedy.",
     "person-jeremy-rys", "hearsay",
     ["person-daniel-sheehan", "person-david-morales", "person-jfk",
      "program-s-force-anti-castro"],
     "The shot that was fired from the null that killed him was Morales. David Morales — he was called the Mexican. He was the crack shot out of the team."),
    ("jfk-triangular-fire-team-plan", 413,
     "Per Sheehan: the S-Force team's standard assassination plan was a triangular fire team for moving targets — three gunmen in crossfire. The same structure trained at Clint Murchison Jr's ranch in Oaxaca Mexico to kill Castro was used against JFK.",
     "person-jeremy-rys", "hearsay",
     ["program-s-force-anti-castro", "program-5412-committee", "person-jfk"],
     "It was a triangular fire team plan to have three gunmen crossfire at a moving target. They'd trained them up down there to kill not only Fidel Castro, but Raul Castro and Che Guevara."),
    ("priscilla-mcmillan-cia-witting-asset", 408,
     "2025 JFK files revealed: Priscilla McMillan — who interviewed Lee Harvey Oswald in Russia, befriended Marina Oswald, and wrote Marina's autobiography — was a CIA witting asset. Handler-level information-gatekeeping.",
     "person-jeremy-rys", "cited_from_document",
     ["person-jeremy-rys", "person-priscilla-mcmillan", "event-2025-jfk-file-release"],
     "Priscilla McMillan who interviewed Oswald when he went to Russia and also befriended Marina Oswald and wrote her autobiography for her — she's a CIA agent. She's a witting CIA asset. That came out in one of the things that was revealed in the documents."),
    ("heroin-profits-kuomintang-ira", 419,
     "Per Sheehan: Santos Trafficante (Havana mafia don) ran heroin smuggling from Southeast Asia; a portion of profits purchased military equipment smuggled to the Kuomintang in China — pre-Iran-Contra template of illicit-funded covert ops.",
     "person-jeremy-rys", "hearsay",
     ["person-santos-trafficante", "program-5412-committee"],
     "Santos Trafficante ran the heroin smuggling coming in from Southeast Asia. A portion of the profits from heroin sales were being used to purchase military equipment and explosives to smuggle to the Kuomintang in China. Whoa. So this is pre-Iran-Contra but the same."),
    ("jfk-2025-file-release-incomplete", 397,
     "Trump administration's 2025 JFK file release dropped 80,000 pages but left many public confused. Brett Weinstein: 'looking through the JFK files is like looking for a needle in the haystack where the needle is missing.'",
     "person-jesse-michels", "cited_from_document",
     ["event-2025-jfk-file-release"],
     "Looking through the JFK files is like looking for a needle in the haystack where the needle is missing."),
    ("dealey-plaza-lansdale-robertson-identified", 391,
     "Photographs from Dealey Plaza at JFK's assassination moment have now been identified: Ed Lansdale (USAF covert-ops architect) — confirmed by his wife; Rip Robertson (CIA S-Force field ops commander); plus radio-man 'Cuban' next to umbrella man.",
     "person-jeremy-rys", "cited_from_document",
     ["person-ed-lansdale", "person-rip-robertson", "person-jfk"],
     "Photographs of Rip Robertson who's the field operations commander for the S-Force. Standing right there in Dealey Plaza. Ed Lansdale. Photographs of Lansdale sitting right there and his wife identifying it."),
]


if __name__ == "__main__":
    print("Extending videos 63-72...")
    extend(VID63, entities_63, claims_63)
    extend(VID64, entities_64, claims_64)
    extend(VID65, entities_65, claims_65)
    extend(VID66, entities_66, claims_66)
    extend(VID67, entities_67, claims_67)
    extend(VID68, entities_68, claims_68)
    extend(VID69, entities_69, claims_69)
    extend(VID70, entities_70, claims_70)
    extend(VID71, entities_71, claims_71)
    extend(VID72, entities_72, claims_72)
    print("Done.")
