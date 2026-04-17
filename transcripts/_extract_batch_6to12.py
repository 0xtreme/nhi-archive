"""Deep claim extraction for videos 6-12."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _extract_v1_builders import src, claim, edge, person, incident, technology, concept, document, event, program, location, phenomenon
from _extract_helpers import write_output


def extend(vid: str, new_entities: list[dict], claims_data: list[tuple]) -> None:
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


def build_person(slug, label, video_id, t, quote, summary, aliases=None,
                 prof="", notability=None):
    return person(slug, label, [src(video_id, t, None, quote)],
                  summary=summary, aliases=aliases or [], profession=prof,
                  notability=notability or [])


# ============================================================
# VIDEO 6: qAou_h1POWs — Deep Prasad, quantum computing & UFOs
# ============================================================
VID6 = "qAou_h1POWs"

entities_6 = [
    build_person("deep-prasad", "Deep Prasad", VID6, 10,
        "26-year-old CEO of Quantum Generative Materials",
        "Canadian quantum-computing entrepreneur; CEO of Quantum Generative Materials; $15M raised to simulate UFO-observed meta-materials using quantum computers.",
        ["Prasad"], "entrepreneur / physicist",
        ["scientist", "entrepreneur", "quantum"]),
    concept("five-observables", "Five Observables (DoD UAP Properties)", "physics",
        [src(VID6, 8, "DoD has laid out five observable properties consistent across UFO sightings")],
        summary="DoD-specified set of five consistent properties observed in UAP data (e.g., sudden instantaneous acceleration, hypersonic velocity with no signatures, trans-medium travel); used as engineering target for physics research."),
    concept("macroscopic-quantum-behavior", "Macroscopic Quantum Behavior", "physics",
        [src(VID6, 14, "UFOs as large macroscopic quantum objects")],
        summary="Hypothesis that UAPs exhibit quantum-mechanical effects (entanglement, superposition, tunneling) at macroscopic scales, analogous to superconductivity emerging from quantum mechanics."),
    build_person("onnes", "Heike Kamerlingh Onnes", VID6, 27,
        "Discovered first superconductor in 1911",
        "Dutch physicist who discovered superconductivity in 1911, a foundational example of macroscopic quantum behavior.",
        ["Onnes"], "physicist", ["physicist", "historical", "nobel"]),
    concept("schrodinger-many-body", "Schrödinger Many-Body Equation", "physics",
        [src(VID6, 37, "Classical equation for simulating material properties")],
        summary="The multi-particle Schrödinger equation; classically intractable beyond ~3 atoms. Deep Prasad claims quantum computers can make it tractable, unlocking meta-material simulation."),
]

claims_6 = [
    ("prasad-qgm-15m", 10,
     "Deep Prasad's startup Quantum Generative Materials has raised $15M to use quantum computing to reverse-engineer UFO meta-materials from their observed properties.",
     "person-jesse-michels", "on_record_statement",
     ["person-deep-prasad", "concept-reverse-engineering"],
     "Deep Prasad reverse engineering UFOs using quantum computers and he's raised 15 million dollars for his startup quantum generative materials."),
    ("five-observables-dod", 14,
     "The DoD has formally characterized five observables consistent across UAP sightings (sudden acceleration, hypersonic velocity without signature, trans-medium travel, low observability, positive lift) as engineering targets.",
     "person-jesse-michels", "cited_from_document",
     ["concept-five-observables", "concept-nhi"],
     "The DoD has laid out five observable properties that are very consistent among the ufo sightings."),
    ("prasad-tic-tac-mach-31", 22,
     "Prasad cites the 2004 Nimitz Tic Tac as reaching at least 31× the speed of sound without atmospheric disturbance — behavior inconsistent with conventional macroscopic aerodynamics.",
     "person-deep-prasad", "on_record_statement",
     ["person-deep-prasad", "technology-tic-tac"],
     "The tic-tac is estimated to reach at least 31 times the speed of sound and it doesn't disturb the air around you."),
    ("prasad-eric-weinstein-new-physics", 24,
     "Prasad agrees with Eric Weinstein's framing: UAPs exhibit 'wholly new physics, not just new engineering.'",
     "person-deep-prasad", "on_record_statement",
     ["person-deep-prasad", "person-eric-weinstein"],
     "Like my colleague Eric Weinstein likes to say this isn't new engineering it's new physics."),
    ("aerospace-holding-physics-knowledge", 26,
     "Prasad asserts aerospace companies hold fundamental scientific knowledge — particularly materials and topological physics — that is not shared with the academic world.",
     "person-deep-prasad", "on_record_statement",
     ["person-deep-prasad", "organization-lockheed-martin"],
     "The role of aerospace companies as holders of potentially basic scientific knowledge not shared with the academic world. There certainly is materials knowledge which involves topological physics."),
    ("prasad-superconductor-analogy", 30,
     "Prasad uses the 1911 superconductor discovery by Onnes as paradigm — macroscopic quantum behavior was once thought impossible and required 40 years of theory to understand; UAP observables may be an analogous macroscopic quantum phenomenon.",
     "person-deep-prasad", "personal_account",
     ["person-deep-prasad", "person-onnes", "concept-macroscopic-quantum-behavior"],
     "In 1911 when Onnes discovered the first superconductor it blew everybody's mind because this was supposed to be thought impossible."),
    ("prasad-hal-puthoff-meeting", 26,
     "Prasad and Eric Weinstein met with Hal Puthoff (cited as 'the guy who briefs all of the presidents on UFOs') for an extended physics conversation.",
     "person-jesse-michels", "personal_account",
     ["person-deep-prasad", "person-eric-weinstein", "person-hal-puthoff"],
     "Eric and I had a pretty trippy conversation with the guy that briefs all of the presidents on ufos a guy named Hal Puthoff."),
]

# ============================================================
# VIDEO 7: V00WcEiKRAY — Ross Coulthart, UFO base Arizona
# ============================================================
VID7 = "V00WcEiKRAY"

entities_7 = [
    build_person("ross-coulthart", "Ross Coulthart", VID7, 0,
        "Primary guest; Australian investigative journalist",
        "Australian investigative journalist who broke the David Grusch story for News Nation; has extensive sources in US UAP/intelligence community.",
        ["Coulthart"], "journalist",
        ["journalist", "investigator"]),
    build_person("jaime-maussan", "Jaime Maussan", VID7, 70,
        "Mexican UFO journalist central to Peru mummies and Bogota sphere cases",
        "Mexican UFO journalist; central proponent of Peruvian tridactyl mummies and receiver of the Bogota sphere.",
        ["Maussan"], "journalist", ["journalist"]),
    build_person("patrick-jackson", "Patrick Jackson", VID7, 87,
        "Possessed a sphere similar to the Bogota sphere",
        "Individual featured in a Ross Coulthart story who possessed a sphere similar to the Bogota UAP sphere.",
        ["Jackson"], "", ["witness"]),
    build_person("mario-woods", "Mario Woods", VID7, 80,
        "1977 Ellsworth AFB experiencer; recognized Bogota sphere symbols",
        "1977 Ellsworth AFB experiencer who recognized symbols photographed on the Bogota sphere from his own NHI encounter.",
        ["Woods"], "military veteran",
        ["witness", "experiencer", "USAF"]),
    build_person("randy-anderson", "Randy Anderson", VID7, 82,
        "Crane NSWC experiencer shown off-world tech",
        "Experiencer said to have been taken underground at Naval Surface Warfare Center Crane and possibly shown off-world technology; recognized symbols on the Bogota sphere.",
        ["Anderson"], "", ["witness", "experiencer"]),
    build_person("jim-marrs", "Jim Marrs", VID7, 89,
        "Rock promoter with alleged anomalous sphere",
        "Former rock promoter (worked with Willie Nelson) whose Texas home contained an alleged self-moving anomalous sphere featured in Coulthart's Channel 7 Australia 2021 segment.",
        ["Marrs", "Jim Maron"], "promoter / author",
        ["witness", "collector"]),
    build_person("brandon-fugal", "Brandon Fugal", VID7, 89,
        "Skinwalker Ranch owner",
        "Utah real-estate mogul; current owner of Skinwalker Ranch and producer of the History Channel show.",
        ["Fugal"], "businessman",
        ["Skinwalker", "businessman"]),
    technology("bogota-sphere", "Bogota Sphere", "material",
        [src(VID7, 70, "Alleged NHI-origin aluminum-alloy sphere from Colombia")],
        summary="Alleged sphere found in Colombia; aluminum-alloy reportedly 3× harder than conventional aerospace alloys; symbol set matched by two independent NHI experiencers per Coulthart."),
    location("secret-mountain-arizona", "Secret Mountain, Arizona", "observation_site",
        [src(VID7, 59, "Reported site of pulsing golden orb escorted by helicopters")],
        country="US", state="Arizona"),
    location("ellsworth-afb", "Ellsworth Air Force Base", "military_base",
        [src(VID7, 80, "Site of Mario Woods' 1977 NHI encounter")],
        country="US", state="South Dakota"),
]

claims_7 = [
    ("coulthart-secret-mountain-orb", 59,
     "Coulthart personally witnessed a gigantic golden plasmatic orb escorted by helicopters rising from behind Secret Mountain in Arizona at 1:30 AM.",
     "person-ross-coulthart", "personal_account",
     ["person-ross-coulthart", "location-secret-mountain-arizona"],
     "You would see this big orb being escorted by helicopters rising from behind Secret Mountain. Up comes this beautiful golden orb, gigantic. It pulses. It's plasmatic."),
    ("bogota-sphere-symbols-match", 80,
     "Coulthart shared photos of symbols on the Bogota sphere with two independent experiencers (Mario Woods 1977 Ellsworth; Randy Anderson Crane NSWC) — both recognized the same symbols from their own NHI encounters.",
     "person-ross-coulthart", "on_record_statement",
     ["person-ross-coulthart", "person-mario-woods", "person-randy-anderson", "technology-bogota-sphere"],
     "I showed photos of the symbols to Mario Woods and to Randy Anderson. Both of them freaked out because these were the symbols that they had both seen."),
    ("bogota-sphere-fueltank-match", 73,
     "Roney Vernet has noted that a particular 9-liter fuel tank is a near-exact visual match to the Bogota sphere, raising cosmetic-alteration hoax possibility.",
     "person-ross-coulthart", "cited_from_document",
     ["technology-bogota-sphere"],
     "There's a particular shape of fuel tank that is exactly 9 liters and it's got similar holes. It looks like a direct visual match with a few changes as if somebody's cosmetically altered it."),
    ("marrs-self-moving-sphere-texas", 90,
     "Coulthart observed Jim Marrs' sphere moving under its own power on a verified-level floor in Texas; he is trying to get industrial X-ray and CT scanning done.",
     "person-ross-coulthart", "personal_account",
     ["person-ross-coulthart", "person-jim-marrs", "technology-bogota-sphere"],
     "The ball is sitting stationary on the floor and then all of a sudden it starts moving. It goes up to the bar and from memory it might have even circled the pole."),
    ("fugal-sphere-utah-testing", 101,
     "Brandon Fugal (Skinwalker Ranch) will fly Jim Marrs' sphere to Utah in his private jet for lab testing.",
     "person-ross-coulthart", "on_record_statement",
     ["person-ross-coulthart", "person-brandon-fugal", "person-jim-marrs", "technology-bogota-sphere"],
     "Brandon Fugal agreed to fly it in his private jet to Utah where he's going to have it tested in the lab."),
    ("consciousness-central-2018", 61,
     "In 2018, one of Coulthart's sources (during a Georgetown pub conversation) told him that the UAP phenomenon is 'all about consciousness'.",
     "person-ross-coulthart", "personal_account",
     ["person-ross-coulthart", "concept-nhi"],
     "One of the first things that one of my sources in that Georgetown pub back in probably 2018 told me was, 'It's all about consciousness.'"),
    ("fbi-congress-briefing-bombshell", 63,
     "Coulthart reports that an FBI briefing to Congress on UAPs 'really blew people away' — implication being material evidence of murder or corruption tied to covert programs.",
     "person-ross-coulthart", "hearsay",
     ["person-ross-coulthart", "organization-fbi", "organization-congress"],
     "People have been murdered cuz I'm told that the briefing that the FBI gave in Congress really blew people away. I have no doubt they think they're going to get away with it."),
]

# ============================================================
# VIDEO 8: Rfmy5oW_r9c — Dan Sherman / NSA Project Preserve Destiny
# ============================================================
VID8 = "Rfmy5oW_r9c"

entities_8 = [
    build_person("dan-sherman", "Dan Sherman", VID8, 113,
        "Retired USAF Technical Sergeant; NSA 'intuitive communicator'",
        "Retired USAF Technical Sergeant. Claims he was recruited by the NSA in the early 1990s for 'Project Preserve Destiny' to telepathically decode alien signals. Author of Above Black.",
        ["Sherman"], "military veteran / author",
        ["whistleblower", "USAF", "NSA", "experiencer", "intuitive-communicator"]),
    program("project-preserve-destiny", "Project Preserve Destiny",
        [src(VID8, 117, "NSA program to telepathically decode alien signals")],
        summary="Alleged NSA program claimed by Dan Sherman to telepathically decode alien signals describing ongoing abductions across the United States. Sherman claims pre-natal alien genetic alteration to give him the ability.",
        acronym="PPD"),
    document("above-black", "Above Black", "book",
        [src(VID8, 131, "Dan Sherman's memoir of his NSA 'intuitive communicator' work")],
        summary="Dan Sherman's memoir documenting his 'intuitive communicator' work for the NSA on Project Preserve Destiny.",
        author="Dan Sherman"),
    concept("intuitive-communicator", "Intuitive Communicator", "metaphysics",
        [src(VID8, 121, "NSA designation for a telepathic alien-signal decoder")],
        summary="NSA designation (per Sherman) for an operator with pre-natally alien-altered genetics enabling direct telepathic reception of NHI signals."),
]

claims_8 = [
    ("sherman-nsa-ppd", 117,
     "Sherman asserts he was recruited by the NSA in the early 1990s for Project Preserve Destiny — a program to telepathically decode alien signals describing abductions across the United States.",
     "person-dan-sherman", "personal_account",
     ["person-dan-sherman", "program-project-preserve-destiny", "organization-nsa"],
     "Dan Sherman claims that while serving in the Air Force in the early 90s, he was recruited for an extremely classified program at the NSA. This program was called Project Preserve Destiny."),
    ("sherman-pre-natal-genetic-alteration", 119,
     "Sherman was told by his Air Force captain that aliens altered his genetics while he was a fetus (abducting his pregnant mother in the early 1960s) to enable later telepathic communication.",
     "person-dan-sherman", "personal_account",
     ["person-dan-sherman", "concept-intuitive-communicator"],
     "Dan was told that he was given this telepathic ability by the aliens themselves when they abducted Sherman's pregnant mother in the early 1960s and altered his genetics while he was a fetus."),
    ("sherman-sine-wave-training", 111,
     "Sherman describes training where he was asked to mentally hum a tone and observed a sine wave on a monitor visibly change in response — confirming to him a physical-mental coupling.",
     "person-dan-sherman", "personal_account",
     ["person-dan-sherman", "concept-intuitive-communicator"],
     "I'm going to play a tone and I want you to mentally hum that tone. When I saw the sine wave move, I went, 'Oh, okay. Well, there's a mental disconnect there that's not supposed to be happening.'"),
    ("sherman-nsa-foia-responses-telling", 127,
     "Independent researchers filed FOIA requests on Project Preserve Destiny; both the Air Force and NSA responses are described by Michels as 'fairly telling.'",
     "person-jesse-michels", "cited_from_document",
     ["person-dan-sherman", "program-project-preserve-destiny", "organization-nsa", "organization-us-air-force"],
     "We explore an independent researcher's use of the Freedom of Information Act to learn more about Project Preserve Destiny. Both the Air Force and NSA's responses to his request are fairly telling."),
    ("sherman-base-identified-by-researchers", 125,
     "Michels' research team located one of the bases where Project Preserve Destiny was conducted, which Sherman was specifically avoiding mentioning.",
     "person-jesse-michels", "personal_account",
     ["person-dan-sherman", "program-project-preserve-destiny"],
     "Dan tries to abstain mentioning which bases this Project Preserve Destiny was conducted at. But my researchers and I were able to locate one of these bases."),
    ("sherman-above-black-book", 131,
     "Sherman's 1997 memoir 'Above Black' is a primary source for the Project Preserve Destiny claims.",
     "person-dan-sherman", "personal_account",
     ["person-dan-sherman", "document-above-black"],
     "I've read your incredible book Above Black and it documents an experience that is so fascinating."),
]

# ============================================================
# VIDEO 9: tS_64sTN5AU — Diana Pasulka / Vatican & UFO religion
# ============================================================
VID9 = "tS_64sTN5AU"

entities_9 = [
    document("encounters-pasulka", "Encounters", "book",
        [src(VID9, 185, "Diana Pasulka's second book")],
        summary="Diana Pasulka's second book; extends American Cosmic into more specific case studies of contemporary UFO contact experiences.",
        author="Diana Pasulka"),
    build_person("tyler-pasulka-pseudonym", "Tyler (Pasulka pseudonym)", VID9, 187,
        "NASA mission controller / Space Force operative from American Cosmic",
        "Pseudonymous NASA Challenger-mission controller and Space-Force-affiliated operative from Pasulka's American Cosmic; allegedly uses consciousness protocols in a machine-room to receive innovation downloads.",
        ["Tyler"], "", ["researcher", "experiencer", "NASA"]),
    concept("protocols-pasulka", "Pasulka Protocols", "psychology",
        [src(VID9, 197, "Religious-like practices used by UAP experiencers to access insight")],
        summary="Set of religious-practice-like protocols (sleep, hydration, prayer/meditation) used by UAP experiencers like Tyler to access what they experience as a communicable 'signal'."),
    concept("analytical-overlay", "Analytical Overlay", "psychology",
        [src(VID9, 179, "Cultural imagery shapes how experiencers recollect encounters")],
        summary="Pasulka's concept (echoing Vallee) that contemporary mythology defines how people recollect anomalous experiences — e.g. Tic Tac is today's version of the 1950s 'flying butane tank'."),
    event("soul-conference-stanford", "Gary Nolan Soul Conference (Stanford)", "meeting", "2023-01-01",
        [src(VID9, 165, "Academic/military/civilian UAP researcher meeting at Stanford")],
        summary="Invite-only meeting of leading academic, military, and civilian UAP researchers hosted by Garry Nolan at Stanford University."),
]

claims_9 = [
    ("pasulka-american-cosmic-crash-site", 187,
     "Pasulka's American Cosmic opens at a 2016 crash-retrieval site she visited with pseudonymous figures later identified as Garry Nolan and Tyler.",
     "person-diana-pasulka", "personal_account",
     ["person-diana-pasulka", "document-american-cosmic", "person-garry-nolan", "person-tyler-pasulka-pseudonym"],
     "American Cosmic opens at a crash retrieval site that was in 2016 that I went with people that I had to have as pseudonyms. Now Gary Nolan has come out. Tyler who's still a pseudonym for a person who is a mission controller and works in the space force."),
    ("st-francis-translation-retranslation", 169,
     "Pasulka's retranslation of Thomas of Celano's original account of St Francis of Assisi's stigmata experience describes 'sound and fury, atmospheric sparks, a flaming torch, telepathic communication' — consistent with modern UFO encounter descriptions.",
     "person-diana-pasulka", "cited_from_document",
     ["person-diana-pasulka"],
     "The original translations describe Francis encountering a sound and fury, atmospheric sparks and a flaming torch. Telepathic communication between Francis and the torch occurs in which Francis is treated harshly and wounded with rays of light."),
    ("stigmata-uv-blue-shift-explanation", 173,
     "Pasulka and Michels propose the stigmata / 'rays of light' burns are interpretable as ultraviolet radiation from blue-shifted light at the boundary of a warp-bubble craft.",
     "person-jesse-michels", "speculation",
     ["person-diana-pasulka", "concept-alcubierre-drive"],
     "The same radiation damage that occurs in what we now call UFO experiences. That's ultraviolet, that's like ionizing radiation. Light being blue shifted into the ultraviolet as it's lensed across the bubble that the craft creates."),
    ("tyler-consciousness-tech-innovation", 199,
     "Tyler describes accessing a 'signal' via a machine-room, receiving biomedical-innovation downloads that he converts into successful companies.",
     "person-diana-pasulka", "cited_from_document",
     ["person-tyler-pasulka-pseudonym", "concept-protocols-pasulka"],
     "He goes to a room where there's a machine and he doesn't know exactly what the machine does but he gets a lot of ideas about biomedical innovations and goes on to actually start companies that are super successful."),
    ("vallee-angels-demons-library", 205,
     "In Encounters, Pasulka recounts a lunch in Vallee's Bay Area study where he pulls a book on angels from his shelf to explain: 'you can't have one without the other' — demons and angels as two aspects of NHI contact.",
     "person-diana-pasulka", "personal_account",
     ["person-diana-pasulka", "person-jacques-vallee", "document-encounters-pasulka"],
     "This is a scene in encounters where I'm having lunch with Jacques Vallee. He takes one of the books off and it was a book about angels and he says of course you can't have one without the other."),
    ("pasulka-new-religion-thesis", 177,
     "Pasulka frames modern UFO-contact experience as a new form of religion — a Lutheran-like return to original texts that reveal commonalities between historical divine encounters and modern UAP reports.",
     "person-diana-pasulka", "on_record_statement",
     ["person-diana-pasulka", "document-american-cosmic"],
     "This is a new form of religion. We do have UFO religions, but this is a new form of religion. Just as Martin Luther believed the word of God was all one needed for salvation, Diana is going back to the original texts."),
]

# ============================================================
# VIDEO 10: RTEWLSTyUic — Townsend Brown documentary
# ============================================================
VID10 = "RTEWLSTyUic"

entities_10 = [
    build_person("jan-lundquist", "Jan Lundquist", VID10, 228,
        "Lead researcher and biographer of T. Townsend Brown",
        "Leading Townsend Brown scholar and research prodigy cited as a world expert on Brown's work.",
        ["Lundquist", "Jan Lanquist"], "researcher",
        ["researcher", "biographer"]),
    build_person("paul-laviolette", "Paul LaViolette", VID10, 258,
        "Renegade physics author on Brown's work and antigravity",
        "Author and theoretical physicist who documented Townsend Brown's work and proposed alternative cosmological frameworks.",
        ["LaViolette"], "physicist / author", ["researcher", "author"]),
    build_person("jacques-cornillon", "Jacques Cornillon", VID10, 244,
        "French aerospace engineer who witnessed Brown's vacuum experiment",
        "French-Canadian aerospace engineer; Brown's technical representative who facilitated a vacuum experiment in Paris witnessed by multiple parties, including the French atomic energy commission.",
        ["Cornillon", "Jacques Cornion"], "engineer", ["engineer", "witness"]),
    build_person("agnew-bahnson", "Agnew Bahnson", VID10, 248,
        "Southern industrialist who founded the Institute of Field Physics",
        "Southern US industrialist (tobacco and air-conditioning fortune) who funded mid-century antigravity research and founded the Institute of Field Physics at UNC Chapel Hill.",
        ["Bahnson"], "industrialist", ["patron", "antigravity"]),
    build_person("nick-cook", "Nick Cook", VID10, 228,
        "Aviation journalist and author on anti-gravity aerospace history",
        "Famed aviation journalist and author of 'The Hunt for Zero Point' documenting aerospace companies' suppressed antigravity research.",
        ["Cook"], "journalist", ["journalist", "author"]),
    build_person("herman-bondi", "Herman Bondi", VID10, 255,
        "Mathematician who conceived negative mass",
        "Austrian-British mathematician and cosmologist who worked on negative-mass solutions that anticipate Brown's observed phenomena.",
        ["Bondi"], "mathematician", ["physicist", "mathematician"]),
]

claims_10 = [
    ("brown-germany-1945-retrieval", 221,
     "Townsend Brown is said to have been sent into Nazi Germany in 1945 to retrieve exotic wunderwaffe research, and thereafter closely worked with Robert Sarbacher and Edward Teller.",
     "person-jesse-michels", "cited_from_document",
     ["person-townsend-brown", "person-sarbacher", "person-edward-teller", "program-operation-paperclip"],
     "Brown is at Martin Corporation goes into Nazi Germany in 1945 to retrieve exotic. Close confidant and colleague of Robert Sarbacher."),
    ("sarbacher-deathbed-admission", 221,
     "Robert Sarbacher, physicist, admitted near the end of his life that statements surrounding UFO crashes are 'substantially correct.'",
     "person-jesse-michels", "cited_from_document",
     ["person-sarbacher", "concept-crash-retrieval"],
     "Robert Sarbacher, physicist, who towards the end of his life admitted surrounding UFO crashes are substantially correct."),
    ("biefield-brown-vacuum-experiment", 241,
     "Jacques Cornillon's Paris vacuum experiment (reportedly ~10⁻⁶ torr) with Brown's asymmetric capacitors showed thrust that residual-ion-wind cannot explain — countering ionic-wind explanations of Biefield-Brown.",
     "person-jesse-michels", "cited_from_document",
     ["person-jacques-cornillon", "concept-biefield-brown-effect"],
     "Evidence that the Biefield-Brown effect does in a vacuum of at least 10⁻⁶ torr — the residual ambient ionization can't account for that."),
    ("cook-hunt-for-zero-point", 230,
     "Aviation journalist Nick Cook, author of 'The Hunt for Zero Point,' documented suppressed antigravity research inside aerospace companies, speaking to physicists who cannot reveal their identity for fear of reprisal.",
     "person-jesse-michels", "cited_from_document",
     ["person-nick-cook", "concept-antigravity"],
     "Nick Cook famed aviation journalist speaking to physicists, titans of aerospace, even holds a deep understanding of the fundamental knowledge. Cannot reveal his identity for fear of reprisals."),
    ("bondi-negative-mass-solution", 255,
     "Herman Bondi's 1957 negative-mass paper produces a solution where a negative-mass object moves toward a positive-mass object with unbounded acceleration — eerily matching Brown's asymmetric-capacitor observations.",
     "person-jesse-michels", "cited_from_document",
     ["person-herman-bondi", "concept-biefield-brown-effect"],
     "If you have two masses in general they would accelerate. What if somehow you had a different kind of negative and positive charges oddly the negative and positive mass. You get this weird solution where the negative moves toward the positive like unbounded acceleration."),
    ("bahnson-institute-field-physics", 248,
     "Agnew Bahnson funded mid-century antigravity research and founded the Institute of Field Physics at UNC Chapel Hill; the 1957 Chapel Hill conference is credited with establishing quantum gravity as a field while simultaneously burying productive antigravity directions.",
     "person-jesse-michels", "cited_from_document",
     ["person-agnew-bahnson", "event-1957-chapel-hill-conference", "concept-antigravity"],
     "The Chapel Hill conference ends quantum gravity which is a confluence. An academic framework that has basically led to no progress."),
    ("brown-wright-airfield-sponsorship", 251,
     "Townsend Brown's experimental work was sponsored by Wright Airfield — placing it at the epicenter of alleged US UAP-research sites.",
     "person-jesse-michels", "cited_from_document",
     ["person-townsend-brown", "location-wright-patterson-afb"],
     "Sponsored by Wright Airfield. Wright Patterson is perhaps the epicenter of all UFO."),
]

# ============================================================
# VIDEO 11: Y26iMB0r-f8 — Mike Masters + Grusch, time travel hypothesis
# ============================================================
VID11 = "Y26iMB0r-f8"

entities_11 = [
    document("identified-flying-objects", "Identified Flying Objects", "book",
        [src(VID11, 269, "Mike Masters' first book on extratempestrial hypothesis")],
        summary="Mike Masters' first book arguing UFO occupants are time-traveling future humans rather than extraterrestrials.",
        author="Mike Masters"),
    document("revelation-future-human-past", "Revelation: The Future Human Past", "book",
        [src(VID11, 269, "Mike Masters' third book")],
        summary="Mike Masters' third book in his extratempestrial (time-traveling humans) series.",
        author="Mike Masters"),
    build_person("george-hoover-navy", "George Hoover", VID11, 275,
        "Navy Commander who admitted Roswell beings were time-traveling humans",
        "US Navy Commander who held top-secret clearance; per Mike Masters, Hoover admitted near end of life that Roswell NHI were time-traveling humans.",
        ["Hoover", "Commander Hoover"], "military officer",
        ["US Navy", "witness", "historical"]),
    build_person("herman-oberth", "Hermann Oberth", VID11, 275,
        "Father of German rocketry; speculated UFOs are time-travel craft",
        "Father of German rocketry, mentor to Wernher von Braun; speculated UFOs jump between space-time coordinates rather than traversing space.",
        ["Oberth"], "scientist", ["engineer", "physicist", "historical"]),
    build_person("paul-hill", "Paul R. Hill", VID11, 279,
        "NASA aerospace engineer whose son co-noted time-travel hypothesis",
        "NASA aerospace engineer whose posthumous 'Unconventional Flying Objects' documents his personal UAP sightings and analysis; his son noted UFOs' care for humanity.",
        ["Hill"], "engineer", ["NASA", "aerodynamicist", "author"]),
    event("free-edgar-mitchell-study", "FREE / Edgar Mitchell Study", "publication", "2015-01-01",
        [src(VID11, 293, "Largest academic study of contactees/abductees")],
        summary="Free/Edgar Mitchell foundation's contactee/abductee study (~5,000 respondents); 52% report humanoid contact, 85% of those friendly."),
]

claims_11 = [
    ("masters-extratempestrial-thesis", 269,
     "Mike Masters proposes the 'extratempestrial' model: UFO occupants are future humans who developed time travel, not extraterrestrials.",
     "person-mike-masters", "on_record_statement",
     ["person-mike-masters", "document-identified-flying-objects", "concept-time-travel-hypothesis"],
     "Aliens are humans from the future who figured out time travel and are coming back to visit us."),
    ("neoton-gray-child-morphology", 273,
     "Per Masters, the 'neoton' evolutionary concept (distant offspring resembling current children) predicts gray alien morphology — small noses, slit eyes — aligning with how humans are evolving with less sensory dependence.",
     "person-mike-masters", "speculation",
     ["person-mike-masters", "concept-time-travel-hypothesis", "concept-neoteny"],
     "The gray aliens have very small noses and ears. There's an evolutionary concept called neoton where a species distant descendants look like its current children."),
    ("hoover-roswell-time-humans", 275,
     "Navy Commander George Hoover (top-secret clearance) admitted that the beings in the Roswell crash were time-traveling humans.",
     "person-mike-masters", "hearsay",
     ["person-george-hoover-navy", "incident-1947-roswell", "concept-time-travel-hypothesis"],
     "Navy Commander George Hoover who held the top secret clearance for most of his life admitted that the beings in the Roswell crash were just time traveling humans."),
    ("oberth-time-jump-ufos", 275,
     "Hermann Oberth, father of German rocketry, argued UFOs don't traverse large distances in space but jump between space-time coordinates.",
     "person-mike-masters", "cited_from_document",
     ["person-herman-oberth", "concept-time-travel-hypothesis"],
     "Hermann Oberth the father of German rocketry and Werner von Braun's mentor said that UFOs likely don't traverse large distances in space. They jump from one time space coordinate to another."),
    ("free-study-humanoid-majority", 293,
     "The FREE/Edgar Mitchell contactee study (~5,000 respondents) found 52% report humanoid contact; 85% of those describe the experience as friendly or neutral.",
     "person-jesse-michels", "cited_from_document",
     ["event-free-edgar-mitchell-study", "person-ed-mitchell", "concept-time-travel-hypothesis"],
     "You cite the FREE Edgar Mitchell study. They had about 3,500 — up about 5,000 now. 52% of the respondents contactee experience humanoid-like creatures in their kind of contact experience. 85% of those cases have a friendly or neutral experience."),
    ("masters-own-download-experience", 285,
     "Masters personally experienced a visual 'download' of information accompanied by another being asking him 'did you get that?' — he describes it as a QR-code-like communication.",
     "person-mike-masters", "personal_account",
     ["person-mike-masters", "concept-time-travel-hypothesis"],
     "My eyes went black and all of a sudden I feel all of this information coming in my brain. It was almost like a QR code loaded in their brain was the communication."),
    ("chemical-rinse-abductees", 283,
     "Abductees commonly report being required to undergo chemical rinses before boarding craft — Masters interprets this as time-sanitation to prevent contaminating the future with eliminated pathogens.",
     "person-mike-masters", "speculation",
     ["person-mike-masters", "concept-time-travel-hypothesis", "phenomenon-lost-time"],
     "Contactees report having to take chemical rinses in what's speculated to be antiseptic liquid perhaps so they don't contaminate the future with pathogens that's already been wiped out."),
    ("delonge-time-not-space", 279,
     "Tom DeLonge has publicly stated UFOs 'might be coming through time' rather than from other planets, aligning with the time-travel hypothesis.",
     "person-mike-masters", "cited_from_document",
     ["person-tom-delonge", "concept-time-travel-hypothesis"],
     "Tom DeLonge said these things aren't coming from other planets these things might be coming through time."),
]

# ============================================================
# VIDEO 12: HxQN2tkQHs8 — Peru three-fingered mummies
# ============================================================
VID12 = "HxQN2tkQHs8"

entities_12 = [
    build_person("jaime-maussan-peru", "Jaime Maussan", VID12, 325,
        "Central figure promoting Peru tridactyl mummies",
        "Mexican UFO journalist; central figure promoting the Peru tridactyl mummies and presenting them before the Mexican Congress.",
        ["Maussan"], "journalist", ["journalist"]),
    build_person("leandro-gravedigger", "Leandro (gravedigger)", VID12, 339,
        "Peruvian gravedigger who discovered the mummy cave",
        "Peruvian gravedigger who per local account stumbled upon a cave with ~200 tridactyl bodies near the Nazca region.",
        ["Leandro"], "", ["witness"]),
    build_person("michael-mazzola", "Michael Mazzola", VID12, 323,
        "Filmmaker of 'Catastrophic Disclosure' investigating the mummies",
        "American filmmaker producing 'Catastrophic Disclosure' documentary on the Peruvian tridactyl mummies.",
        ["Mazzola"], "filmmaker", ["filmmaker", "investigator"]),
    build_person("ammar-kandil", "Ammar Kandil", VID12, 325,
        "YouTuber (Yes Theory) accompanying Michels to Peru",
        "Co-founder of Yes Theory; accompanied Michels on the Peru mummies investigation trip.",
        ["Kandil"], "YouTuber", ["journalist"]),
    build_person("john-mcdow", "John McDowell", VID12, 353,
        "Forensic expert corroborating the mummy analysis",
        "Forensic expert; won Association forensics award for analyzing the Peru tridactyl specimens.",
        ["McDow", "McDowell"], "forensic scientist", ["forensic", "scientist"]),
    build_person("jim-caruso-denver", "Jim Caruso", VID12, 353,
        "Chief medical examiner for Denver who reviewed the mummies",
        "Chief medical examiner for Denver; Navy officer for decades; performed over 300 autopsies; reviewed the Peru mummy materials.",
        ["Caruso"], "medical examiner", ["forensic", "medical"]),
    build_person("david-ruiz-peru", "David Ruiz", VID12, 355,
        "President of Peruvian Legal Medicine Association",
        "President of the Peruvian association equivalent to the American Academy of Forensic Sciences; examined the tridactyl specimens.",
        ["Ruiz"], "medical examiner", ["forensic", "Peru"]),
    document("catastrophic-disclosure-doc", "Catastrophic Disclosure", "broadcast",
        [src(VID12, 323, "Mazzola's documentary on the Peru mummies")],
        summary="Documentary by Michael Mazzola (forthcoming as of video release) on the Peruvian tridactyl mummies case.",
        author="Michael Mazzola"),
    location("nazca-peru", "Nazca, Peru", "region",
        [src(VID12, 329, "Southern Peruvian region where mummies were found")],
        country="PE"),
    phenomenon("tridactyl-mummy", "Tridactyl Mummy", "biological",
        [src(VID12, 319, "Three-fingered/three-toed humanoid bodies preserved in diatomaceous earth")],
        summary="Class of mummified humanoid bodies found near Nazca, Peru with three fingers and three toes; two physical types (M-type hominids and smaller reptilians). Radiocarbon dates overlap Nazca period. Status contested."),
]

claims_12 = [
    ("mummies-200-bodies-cave", 341,
     "Per Leandro's account and subsequent investigation, a cave near Nazca Peru contained ~200 tridactyl bodies preserved in diatomaceous earth.",
     "person-jesse-michels", "cited_from_document",
     ["person-leandro-gravedigger", "phenomenon-tridactyl-mummy", "location-nazca-peru"],
     "Big clumps began to emerge — heads, limbs, and appendages, in many cases covered in diatomaceous earth. Pile of 200 bodies and parts."),
    ("mummies-two-types", 343,
     "Two distinct tridactyl mummy types have been identified: M-types (larger hominid morphology, 25-30 specimens) and smaller reptilians (2-3 feet, Close-Encounters-like faces).",
     "person-jesse-michels", "cited_from_document",
     ["phenomenon-tridactyl-mummy"],
     "The M types or hominids. These look like — we have 25 to 30 of these. Reptilians. These are skinny, two to three feet. Their faces look like the aliens in Close Encounters."),
    ("mcdowell-forensics-grand-wall", 353,
     "John McDowell won the Association for Forensics' Grand Wall Award for his analysis suggesting some specimens represent living organisms worthy of investigation.",
     "person-jesse-michels", "cited_from_document",
     ["person-john-mcdow", "phenomenon-tridactyl-mummy"],
     "John McDow association for a year and just won the forensics the Grand Wall Award. Data to show that some of these bodies to be perhaps living organisms."),
    ("caruso-300-autopsies-validation", 355,
     "Denver chief medical examiner Jim Caruso (Navy veteran, 300+ autopsies) has publicly defended the reality of the specimens as biological rather than fabricated.",
     "person-jesse-michels", "cited_from_document",
     ["person-jim-caruso-denver", "phenomenon-tridactyl-mummy"],
     "Jim Caruso, the chief medical examiner for Denver, officer in the Navy for decades, Caruso has personally performed over 300 autopsies."),
    ("ministry-culture-suppression", 328,
     "The Peruvian Ministry of Culture has, in multiple instances, allegedly acted to suppress the case and confiscate specimens at the Lima airport (2023).",
     "person-jesse-michels", "cited_from_document",
     ["location-nazca-peru", "phenomenon-tridactyl-mummy"],
     "Ministry of Culture in multiple instances — they don't want this case to see the light of day. These little trinkets, pieces of touristic were confiscated at the Lima airport in 2023."),
    ("fake-dolls-subset", 359,
     "Some publicly-exhibited specimens (Reuters coverage via Flavio Estrada) were independently confirmed as dolls made from modern synthetic glue — Michels argues this is not a blanket debunk of the anatomically-consistent specimens.",
     "person-jesse-michels", "cited_from_document",
     ["phenomenon-tridactyl-mummy"],
     "Reuters: not extraterrestrials. They're dolls made from modern synthetic glue, said Flavio Estrada. But figurines and these real anatomically consistent — it's at that point that this story is fake."),
    ("mummies-fetus-inside", 325,
     "One of the tridactyl specimens contains a fetus inside, supporting (per researchers) that it was a biologically functioning female organism rather than an assemblage.",
     "person-jesse-michels", "cited_from_document",
     ["phenomenon-tridactyl-mummy"],
     "It has a fetus inside the — these features are also tractor."),
    ("cranial-deformation-mimicry", 337,
     "Ancient Peruvian cranial-deformation rituals involved reshaping infant skulls to imitate elongated skulls attributed to NHI visitors, implying contact memory encoded in Nazca-era practice.",
     "person-jesse-michels", "speculation",
     ["phenomenon-tridactyl-mummy"],
     "Cranial deformation, a deliberate reshaping of the skull often done to infants. Rituals conferred status. To be an attempt to imitate the gods."),
]


if __name__ == "__main__":
    print("Extending videos 6-12 with deep claim extractions...")
    extend(VID6, entities_6, claims_6)
    extend(VID7, entities_7, claims_7)
    extend(VID8, entities_8, claims_8)
    extend(VID9, entities_9, claims_9)
    extend(VID10, entities_10, claims_10)
    extend(VID11, entities_11, claims_11)
    extend(VID12, entities_12, claims_12)
    print("Done.")
