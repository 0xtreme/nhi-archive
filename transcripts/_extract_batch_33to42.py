"""Deep claim extraction for videos 33-42."""
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
    nodes = list(existing["nodes"])
    edges_list = list(existing["edges"])
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


# V33 fzvwBBSmWYA — Hastings deep re-extraction
VID33 = "fzvwBBSmWYA"
entities_33 = [
    concept("drone-sightings-nj-2024", "2024 New Jersey Drone Sightings Wave", "politics",
        [src(VID33, 7, "Nationwide drone sightings over NJ / NY")],
        summary="Late 2024 wave of mysterious drone sightings over New Jersey and the northeast US; US Air Force denied involvement; Hastings places it in continuity of ongoing UAP incursions at nuclear and critical infrastructure."),
    event("bentwaters-1980", "Bentwaters/Rendlesham UFO 1980", "sighting", "1980-12-26",
        [src(VID33, 39, "1980 UK UFO incident at Bentwaters — largest tactical nuclear weapons cache in Western Europe")],
        summary="December 1980 Rendlesham Forest / Bentwaters AFB incident — site of largest tactical nuclear weapons stockpile in Western Europe; disc-shaped object landed in field, exploded silently into objects."),
    event("soviet-ukraine-missile-base", "Soviet Ukraine Missile Base UFO", "sighting", "1982-01-01",
        [src(VID33, 39, "Huge disc-shaped object over Soviet Ukraine missile base")],
        summary="UFO over Soviet-era Ukraine missile base — one of many non-US-theater cases documenting UFOs targeting nuclear infrastructure globally."),
    incident("chernobyl-ufo-1986", "Chernobyl Reactor UFO Sighting", "sighting", "1986-04-26",
        [src(VID33, 45, "UFO seen at Chernobyl during 1986 disaster")],
        summary="During the 1986 Chernobyl disaster a UFO was observed coming in, staying 3 minutes, shining light at the reactor, then departing — documented by Harvard PhD Jensen Andreon."),
    P("jensen-andreon", "Jensen Andreon", VID33, 45,
      "Harvard PhD documenting Chernobyl UFO case",
      "Harvard PhD researcher who documented the 1986 Chernobyl UFO sighting.",
      ["Andreon"], "researcher", ["researcher", "Harvard"]),
]
claims_33 = [
    ("hastings-167-nuclear-witnesses", 21,
     "Hastings has personally interviewed 167 military witnesses of UFOs at US nuclear sites — missile technicians, ICBM security, missileers, radar operators — all vetted under Personal Reliability Program.",
     "person-jesse-michels", "cited_from_document",
     ["person-robert-hastings", "document-ufos-and-nukes", "concept-nuclear-ufo-connection" if False else "person-robert-salas"],
     "Hastings has personally interviewed 167 employees of nuclear bases across the United States."),
    ("hastings-jacobs-vandenberg-threatened", 27,
     "Bob Jacobs' Air Force records were deleted from Vandenberg; he received phone threats including 'your mailbox — what a beautiful sight — you're going down' after speaking publicly.",
     "person-robert-hastings", "cited_from_document",
     ["person-bob-jacobs", "location-vandenberg-afb", "incident-1964-big-sur-atlas"],
     "His records were deleted from Vandenberg Air Force Base. They threatened my life. They denied there was ever a Robert Jacobs in the Air Force."),
    ("hastings-ellsworth-grays-multi-level", 29,
     "One of Hastings' Ellsworth witnesses claimed to have boarded a craft at Ellsworth AFB South Dakota and seen multiple levels filled with small grays.",
     "person-robert-hastings", "cited_from_document",
     ["person-robert-hastings", "location-ellsworth-november-5-site"],
     "The other boarded a craft at Ellsworth Air Force Base in South Dakota. They were just multi levels with all these small Grays everywhere."),
    ("hastings-heavy-breathing-phone-calls", 31,
     "After every one of Hastings' witness interviews, within 1-10 minutes his phone would ring with only heavy breathing on the other end — systemic surveillance pattern.",
     "person-robert-hastings", "personal_account",
     ["person-robert-hastings"],
     "After each one of those calls I would talk to them hang up the phone within a minute or five or 10 the phone would ring I would pick it up and there would be nothing but heavy breathing in the phone."),
    ("hastings-eno-japan-fukushima-monk", 43,
     "A 2022 Vice story documented Eno Japan's (near Fukushima) UFO obsession; the chief monk of a local temple reported UFOs 'came after the explosion — so many of them I was shocked.'",
     "person-jesse-michels", "cited_from_document",
     ["person-robert-hastings", "location-lino-japan"],
     "A little town in Japan that's obsessed with UFOs — Eno — right next to Fukushima. The chief monk of a local temple said the UFOs came after the explosion, there were so many of them I was shocked."),
    ("hastings-chernobyl-3-minute-visit", 45,
     "Harvard PhD Jensen Andreon documented UFO activity at Chernobyl in 1986 — object came, stayed 3 minutes, shined a light at the reactor, and departed.",
     "person-jesse-michels", "cited_from_document",
     ["person-jensen-andreon", "incident-chernobyl-ufo-1986"],
     "Harvard PhD Jensen Andreon writes about UFO activity at the height of the Chernobyl disaster when many people in the area observed a UFO come stay for 3 minutes shine a light at the reactor and depart."),
    ("hastings-nj-2024-drone-continuity", 9,
     "Hastings frames the 2024 New Jersey drone wave as continuous with ongoing UAP incursions at global nuclear facilities dating back to the atomic age.",
     "person-robert-hastings", "on_record_statement",
     ["person-robert-hastings", "concept-drone-sightings-nj-2024"],
     "People in New York and New Jersey see drones the size of an SUV over their house every night. These aren't all drones. This is the continuation of a story that's been unraveling since the dawn of the atomic age."),
]

# V34 bVhSPH2A5Vw — James Fox re-extraction
VID34 = "bVhSPH2A5Vw"
entities_34 = [
    program("robertson-panel-1953", "Robertson Panel (1953)",
        [src(VID34, 103, "CIA-led scientific panel that adopted official policy of UFO ridicule")],
        summary="January 1953 CIA-convened scientific committee headed by H.P. Robertson arising from a December 1952 recommendation to the Intelligence Advisory Committee. Officially adopted the policy of ridicule toward UFO research — a highly effective stigma campaign that lasted decades.",
        acronym="Robertson Panel"),
    P("ted-peters-theologian", "Ted Peters", VID34, 77,
      "Berkeley theologian who integrates UFOs with Christian theology",
      "Theologian at Berkeley University's Graduate Theological Union; interviewed in Fox's 'UFOs: 50 Years of Denial' for his thesis that UFO phenomena does not conflict with Christian theology — 'room for all God's creation.'",
      ["Peters"], "theologian", ["theologian", "academic"]),
    document("fox-50-years-of-denial", "UFOs: 50 Years of Denial", "broadcast",
        [src(VID34, 61, "Fox's first UFO documentary")],
        summary="James Fox's first UFO documentary.",
        author="James Fox"),
    document("fox-out-of-the-blue", "Out of the Blue", "broadcast",
        [src(VID34, 61, "Fox's second UFO documentary with director's cut")],
        summary="James Fox's second UFO documentary (with director's cut reworked over 2.5 years).",
        author="James Fox"),
    document("fox-i-know-what-i-saw", "I Know What I Saw", "broadcast",
        [src(VID34, 61, "Fox's UFO documentary featuring Disclosure Project witnesses")],
        summary="James Fox's UFO documentary featuring military witnesses from Disclosure Project.",
        author="James Fox"),
    document("fox-the-program", "The Program (upcoming)", "broadcast",
        [src(VID34, 63, "Fox's upcoming documentary featuring Hal Puthoff")],
        summary="James Fox's upcoming documentary that features Hal Puthoff; screened with Puthoff attending.",
        author="James Fox"),
]
claims_34 = [
    ("robertson-panel-ridicule-policy", 103,
     "The 1953 CIA-led Robertson Panel adopted an explicit policy of public ridicule toward UFO research — a campaign Fox credits as highly effective and culturally-ingrained for decades.",
     "person-james-fox", "cited_from_document",
     ["person-james-fox", "program-robertson-panel-1953"],
     "The Robertson panel in 1953 absolutely adopted this policy of ridicule and it was very effective campaign and it stuck."),
    ("fox-seven-documentaries", 61,
     "Fox has produced approximately 6-7 feature documentaries on UFOs, from 50 Years of Denial through The Phenomenon and Moment of Contact, with The Program forthcoming.",
     "person-james-fox", "personal_account",
     ["person-james-fox", "document-fox-50-years-of-denial", "document-moment-of-contact"],
     "I did 50 years of denial, then Out of the Blue, director's cut, I Know What I Saw, The Phenomenon, Moment of Contact, and The Program which is coming out."),
    ("fox-ted-peters-theology-compatible", 77,
     "Berkeley theologian Ted Peters, interviewed by Fox, argues UFO phenomena does not conflict with Christian theology — 'there's room for both and room for all God's creation.'",
     "person-james-fox", "cited_from_document",
     ["person-james-fox", "person-ted-peters-theologian"],
     "I interviewed a theologian at Berkeley named Ted Peters way back from my first film. He's like no, there's room for both and there's room for all God's creation."),
    ("fox-biggest-story-in-history", 67,
     "Fox's framing: 'If UFOs are real, how significant would that story be? Everybody says it'd be the biggest story in history — and I'm convinced it's happening, so it's not a story that's easily dropped.'",
     "person-james-fox", "personal_account",
     ["person-james-fox"],
     "If it were true, how significant of a story would you give it? Everybody says: 'It'd be the biggest story in history.' I'm convinced it's happening, so it's not a story that's easily just dropped."),
]

# V35 fyX8V1XXmQM — Jacques Vallee Trinity 1945
VID35 = "fyX8V1XXmQM"
entities_35 = [
    P("paola-harris", "Paola Harris", VID35, 139,
      "Italian UFO researcher; co-author of Trinity with Vallee",
      "Italian UFO researcher who introduced Jacques Vallee to the 1945 Trinity crash case; tracked down and interviewed surviving witnesses Remy Baca and Jose Padilla.",
      ["Harris"], "researcher", ["researcher", "author", "Italian"]),
    P("remy-baca", "Remy Baca", VID35, 131,
      "1945 Trinity crash witness (age 7)",
      "Age 7 at time of 1945 San Antonio NM crash; nephew of local cattle rancher; one of two children who observed the crashed craft and three alien beings inside.",
      ["Baca"], "", ["witness", "Trinity"]),
    P("jose-padilla", "Jose Padilla", VID35, 131,
      "1945 Trinity crash witness (age 9)",
      "Age 9 at time of 1945 San Antonio NM crash; son of local cattle rancher; observed the crashed craft and three 3-ft alien beings inside with 2 eyes, 2 arms, 3 fingers.",
      ["Padilla"], "", ["witness", "Trinity"]),
    document("vallee-trinity", "Trinity: The Best-Kept Secret", "book",
        [src(VID35, 125, "Vallee/Harris book on 1945 San Antonio NM UFO crash")],
        summary="Jacques Vallee and Paola Harris' book on the August 1945 San Antonio NM UFO crash — 20 days after the first Trinity atomic test and 2 days after Japan's surrender. Documents witness testimony of Remy Baca and Jose Padilla.",
        author="Jacques Vallee & Paola Harris"),
    incident("1945-san-antonio-nm-crash", "San Antonio NM 1945 UFO Crash (Trinity)", "crash_retrieval", "1945-08-16",
        [src(VID35, 129, "Metallic avocado-shaped craft crashed 20 days after Trinity test")],
        summary="August 1945: a damaged metallic avocado-shaped craft fell from the sky in San Antonio NM next to the Trinity test site — 20 days after the first US atomic test and 2 days after Japanese concession. Witnessed by two local children (Baca age 7, Padilla age 9) who observed 3 human-like beings inside (~3ft, 2 eyes, 2 arms, 3 fingers, 2 legs, sliding locomotion). Predates Roswell and the term 'flying saucer'."),
    document("vallee-revelations", "Revelations: Alien Contact and Human Deception", "book",
        [src(VID35, 119, "Vallee book hinting at Lazar MK-Ultra connection")],
        summary="Jacques Vallee's book; on page 9 hints that Bob Lazar may have been an MK-Ultra patient brainwashed into believing he worked on UFO reverse engineering.",
        author="Jacques Vallee"),
]
claims_35 = [
    ("trinity-1945-predates-roswell", 129,
     "The 1945 San Antonio NM crash occurred 20 days after Trinity test and 2 years BEFORE Roswell — also before the term 'flying saucer' was coined (Kenneth Arnold, 1947) — demonstrating UAP contact precedes Roswell in the American record.",
     "person-jacques-vallee", "cited_from_document",
     ["person-jacques-vallee", "incident-1945-san-antonio-nm-crash", "incident-1947-roswell",
      "document-vallee-trinity"],
     "Just 20 days after the first atomic test on US soil and two days after the Japanese concession a metallic avocado shaped object dropped from the sky in San Antonio New Mexico right next to the test site. The term Flying Saucer doesn't exist. It's going to be invented two years later by Kenneth Arnold."),
    ("trinity-baca-padilla-3-beings", 131,
     "Children Remy Baca (7) and Jose Padilla (9) observed three ~3ft human-like beings inside the crashed craft — 2 eyes, 2 arms, 3 fingers, 2 legs, moving by sliding locomotion.",
     "person-jacques-vallee", "cited_from_document",
     ["person-jacques-vallee", "person-remy-baca", "person-jose-padilla",
      "incident-1945-san-antonio-nm-crash"],
     "They see three creatures. They were human-like, they had two eyes, about three feet. Two arms, three fingers, two legs. They were walking by moving like that without moving their legs — translate or slide."),
    ("vallee-no-above-top-secret-knew", 141,
     "Vallee asserts that no one with above-top-secret clearance he has queried knew about the Trinity 1945 case — reinforcing his thesis that UFO secrecy runs through a separate Manhattan-Project/DOE lineage.",
     "person-jacques-vallee", "personal_account",
     ["person-jacques-vallee", "incident-1945-san-antonio-nm-crash",
      "concept-manhattan-project-clearance-system"],
     "When Jacques inquired about Trinity no one with top secret clearances in the US federal government had even heard of the case. I can't find among the people I know who have clearances above top secret — they've never heard of this."),
    ("vallee-lazar-mk-ultra", 119,
     "In Vallee's 'Revelations' book (page 9) he hints that Bob Lazar may have been an MK-Ultra subject — describing Lazar's strange memory lapses and the 'peculiar liquid he was made to drink.'",
     "person-jacques-vallee", "speculation",
     ["person-jacques-vallee", "person-bob-lazar", "document-vallee-revelations"],
     "Robert Lazar also told me of his strange memory lapses of the peculiar liquid he was made to drink. It violated a lot of what we thought was impossible to violate."),
    ("vallee-arpanet-engelbart", 115,
     "Vallee helped build the earliest version of the internet (ARPANET) alongside legendary computer scientist Doug Engelbart.",
     "person-jesse-michels", "on_record_statement",
     ["person-jacques-vallee"],
     "He is a serious researcher with the computer science, physics and astronomy background. He even helped build the earliest version of the internet, a project called ARPANET with legendary computer scientist Doug Engelbart."),
]

# V36 Rjr3Yq-dMUE — Clas Svahn / Archives of the Unexplained
VID36 = "Rjr3Yq-dMUE"
entities_36 = [
    P("clas-svahn", "Clas Svahn", VID36, 179,
      "Swedish journalist; world's largest UFO archive custodian",
      "Swedish journalist for Sweden's largest newspaper since early 1970s; builds and maintains the 'Archives of the Unexplained' — the world's largest UFO archive (16 rooms of witness reports, radar data, photographs, videos).",
      ["Svahn", "Claus von"], "journalist / archivist",
      ["journalist", "archivist", "researcher", "Swedish"]),
    document("archives-of-the-unexplained", "Archives of the Unexplained", "report",
        [src(VID36, 181, "16-room world's largest UFO archive")],
        summary="World's largest UFO archive curated by Clas Svahn (Sweden); 16 rooms with detailed witness reports, photographs, audio recordings, radar data, video, and first-generation documents unavailable elsewhere. Includes files from Japan, Russia, and throughout the West."),
    event("swedish-ghost-rockets-1946", "Swedish Ghost Rockets Wave 1946", "sighting", "1946-05-01",
        [src(VID36, 193, "1,400+ rocket-cigar UFOs over Sweden/Norway 1946")],
        summary="1946 mass wave of ~1,400+ documented rocket and cigar-shaped UFOs over Sweden, Norway, and Finland — never landing on ground, always plunging into water. Triggered formation of a specialized Swedish military unit."),
    P("claudia-hill", "Betty Hill (extended)", VID36, 195,
      "1961 abductee who also witnessed UFO crash & recovered debris",
      "Betty Hill — known for 1961 Barney & Betty Hill abduction case. Clas Svahn's archival research uncovered additional info: Betty also witnessed a UFO crash near her NH home and recovered debris which she buried in her backyard.",
      ["Hill"], "", ["witness", "experiencer"]),
    document("borderland-science-assoc", "Borderland Sciences Research Foundation", "report",
        [src(VID36, 189, "Oldest UFO research group in world; possibly more than intelligence-informed")],
        summary="Founded 1945 by Meade Layne; oldest UFO research group in the world. Per Svahn, was more than intelligence-informed in the 1940s.",
        year=1945),
]
claims_36 = [
    ("svahn-largest-archive", 179,
     "Svahn curates the 'Archives of the Unexplained' — 16 rooms of original first-generation documents, witness reports, radar data, audio, and video — widely recognized as the world's largest UFO archive.",
     "person-clas-svahn", "on_record_statement",
     ["person-clas-svahn", "document-archives-of-the-unexplained"],
     "He's spent decades building, organizing, and preserving what is widely recognized as the world's largest UFO archive, the Archives of the Unexplained. This 16 room building houses detailed witness reports, photographs, audio recordings, radar data, video."),
    ("swedish-ghost-rockets-1946", 193,
     "The 1946 Swedish Ghost Rocket wave documented ~1,400+ rocket and cigar-shaped UFOs descending on Scandinavia — always plunging into water — prompting the Swedish government to form a specialized military unit.",
     "person-clas-svahn", "cited_from_document",
     ["person-clas-svahn", "event-swedish-ghost-rockets-1946"],
     "A swarm of at least 1,400 documented rocket and cigar-shaped UFOs descending on Norway and Sweden, never landing on the ground, always plunging into water. A swarm that even caused the Swedish government to form a specialized military unit."),
    ("svahn-betty-hill-buried-debris", 195,
     "Svahn's field research with Betty Hill uncovered that she also witnessed a separate UFO crash near her NH home and buried recovered debris in her backyard — possibly still there.",
     "person-clas-svahn", "cited_from_document",
     ["person-clas-svahn", "person-claudia-hill", "incident-1961-hill-abduction"],
     "Claus dug a little deeper and found out that Betty outside of her abduction witnessed a UFO crash near her home. She even recovered the debris which she went on to bury in her backyard where it still might be to this day."),
    ("svahn-tons-and-brown-california", 185,
     "Svahn personally traveled to Eureka California, met the owner of a substantial Townsend Brown archive, and shipped the material back to Sweden for preservation.",
     "person-clas-svahn", "personal_account",
     ["person-clas-svahn", "person-townsend-brown"],
     "I went to Eureka, California. I met with this guy in his garage and we packed it all together and sent it back to Sweden."),
    ("svahn-borderland-science-1940s-intel", 189,
     "Svahn reports the Borderland Sciences Research Foundation (oldest UFO group in the world) was 'more than intelligence-informed' in the 1940s — hinting at deeper operational ties than public history acknowledges.",
     "person-clas-svahn", "speculation",
     ["person-clas-svahn", "document-borderland-science-assoc"],
     "Behind you here is the oldest UFO group in the world, Borderland Science Research Association. There's something very interesting about them. They were more than intelligence-informed in certain cases in the 1940s."),
]

# V37 1f16VvXaSSE — Luis Elizondo documentary
VID37 = "1f16VvXaSSE"
entities_37 = [
    P("luis-elizondo-extended", "Luis Elizondo (extended)", VID37, 215,
      "AATIP director; Pentagon whistleblower; Gray Fox member",
      "Cuban-American intelligence officer. Father (Lou Sr) was Cuban exile in Alpha 66 anti-Castro group and Bay of Pigs CIA operative. Jesse notes Luis was a member of US Army Gray Fox (Intelligence Support Activity) pre-AATIP — elite special missions unit with possible JSOC-UFO-retrieval involvement.",
      ["Lu Alando", "Lou", "Luis Elizondo"], "intelligence officer",
      ["whistleblower", "AATIP", "Gray Fox", "ISA", "CIA"]),
    P("marice-hill-dc-1952", "Marice Hill", VID37, 219,
      "Living witness to 1952 Washington DC UFO flyover",
      "82-year-old groundskeeper of a Washington DC Masonic lodge; one of the last living witnesses of the July 1952 Washington UFO flyover — saw the craft from his front porch with his father.",
      ["Hill"], "", ["witness", "Washington-flap"]),
    P("lu-elizondo-sr", "Luis Elizondo Sr", VID37, 237,
      "Cuban exile; Alpha 66 member; Bay of Pigs CIA operative",
      "Father of Luis Elizondo; Cuban exile who initially fought shoulder-to-shoulder with Castro; fell out with the Communists; joined Alpha 66 militant Cuban exile group operating for US intelligence agencies.",
      [], "military", ["CIA", "Cuban-exile", "historical"]),
    program("gray-fox-isa", "Gray Fox / Intelligence Support Activity",
        [src(VID37, 243, "US Army elite special missions unit")],
        summary="US Army Intelligence Support Activity (ISA), code name Gray Fox — tiny elite special missions unit that enters hostile territory before Delta Force / JSOC. Per Matthew Pines, Luis Elizondo was a member.",
        acronym="ISA"),
    program("alpha-66", "Alpha 66 (Cuban Exile Militant Group)",
        [src(VID37, 239, "Hardcore militant anti-Castro Cuban exile group")],
        summary="Hardcore militant group of Cuban exiles engaged in rogue operations for US three-letter agencies; explicit mission to invade Cuba and topple Castro.",
        acronym="Alpha 66"),
    document("elizondo-imminent", "Imminent", "book",
        [src(VID37, 227, "Luis Elizondo's autobiography on US UFO programs")],
        summary="Luis Elizondo's autobiography; discusses the existence of American Legacy UFO reverse engineering programs and non-human intelligence.",
        author="Luis Elizondo"),
]
claims_37 = [
    ("elizondo-gray-fox-jsoc", 241,
     "Per Matthew Pines: Luis Elizondo was a member of the Army Intelligence Support Activity / Gray Fox — a JSOC-adjacent special missions unit believed to have UFO retrieval involvement.",
     "person-jesse-michels", "hearsay",
     ["person-luis-elizondo-extended", "program-gray-fox-isa"],
     "According to Matthew Pines, Luis was a member of the US Army intelligence support activity group, otherwise known as Gray Fox. This was a tiny elite special missions unit that goes into hostile territory before Delta Force and JSOC. If you know anything about JSOC, they might have a thing or two to do with UFO crash retrievals."),
    ("elizondo-alpha-66-father", 237,
     "Elizondo's father was a Cuban exile in Alpha 66 — a hardcore militant anti-Castro group that conducted rogue operations for US intelligence agencies — formative environment for his career.",
     "person-jesse-michels", "cited_from_document",
     ["person-luis-elizondo-extended", "person-lu-elizondo-sr", "program-alpha-66"],
     "His father Lou senior was a Cuban Exile who originally fought shoulder-to-shoulder with Castro. He joined a hardcore militant group of Cuban exiles called Alpha 66."),
    ("marice-hill-1952-dc-witness", 219,
     "The 82-year-old groundskeeper of a Washington DC Masonic lodge (Marice Hill) recognized Elizondo on sight and disclosed he witnessed the 1952 Washington DC UFO flyover from his porch with his father — one of the last living Washington-flap witnesses.",
     "person-jesse-michels", "personal_account",
     ["person-marice-hill-dc-1952", "event-july-27-1952-washington-flap",
      "person-luis-elizondo-extended"],
     "Mr. Hill was living here in Washington DC in 1952 during the famous UFO incident. Him and his father were sitting on the front porch and he actually witnessed the UFO event over the Capitol building. One of the last few people that actually can tell this story."),
    ("elizondo-implant-moving-metabolism", 255,
     "Elizondo claims to have personally handled an alien chip / implant that was 'moving under the microscope under its own metabolism.'",
     "person-luis-elizondo-extended", "personal_account",
     ["person-luis-elizondo-extended", "phenomenon-nhi-biologics"],
     "Alien chips implanted in human bodies, one of which Lou actually handled firsthand. It was moving under the microscope under its own metabolism."),
    ("elizondo-2017-new-york-times-leak", 247,
     "In 2017, after General Mattis was denied UFO briefings by bureaucratic intermediaries, Elizondo and Chris Mellon released three UFO videos to the New York Times through official Pentagon pre-publication clearance — launching modern disclosure.",
     "person-jesse-michels", "on_record_statement",
     ["person-luis-elizondo-extended", "person-chris-mellon", "program-aatip"],
     "In 2017 after trying to brief General Mattis on UFOs and having the door shut in his face, Elizondo along with Chris Mellon took matters into their own hands and got three UFO videos cleared for release by the Pentagon. They took those videos to the New York Times."),
    ("elizondo-astral-projection-cia", 257,
     "Elizondo discloses he performed astral projection as part of a CIA operation — projecting himself next to a terrorist.",
     "person-luis-elizondo-extended", "personal_account",
     ["person-luis-elizondo-extended", "concept-protocols-pasulka"],
     "To him astral projecting himself next to a terrorist as a part of a CIA operation."),
]

# V38 bM18PJY6_Zc — Chris Bledsoe
VID38 = "bM18PJY6_Zc"
entities_38 = [
    P("chris-bledsoe", "Chris Bledsoe", VID38, 275,
      "UFO experiencer; The Lady contactee; Crohn's disease healed",
      "North Carolina UFO experiencer; after Jan 8 2007 fishing-trip orb sighting, experienced spontaneous healing of Crohn's disease and series of contact experiences with a luminous feminine presence ('The Lady'). High-level NASA and CIA personnel have studied his case.",
      ["Bledsoe"], "experiencer",
      ["witness", "experiencer", "contactee"]),
    P("tim-taylor-cape-canaveral", "Tim Taylor (NASA mission controller)", VID38, 285,
      "High-level NASA mission controller; Bledsoe and Obama link",
      "High-level NASA mission controller who has worked on launches at Cape Canaveral since the Challenger missions in the 80s. Visited Bledsoe; claimed the symbols Bledsoe was given aligned with things NASA was already monitoring.",
      ["Taylor"], "NASA official",
      ["NASA", "official", "researcher"]),
    document("ufo-of-god", "UFO of God", "book",
        [src(VID38, 307, "Chris Bledsoe's memoir of his contact experiences")],
        summary="Chris Bledsoe's memoir; documents his 2007 UFO contact experience and subsequent 5 years of darkness in his Fayetteville NC community, plus NASA/CIA follow-up and his encounters with 'The Lady.'",
        author="Chris Bledsoe"),
    phenomenon("the-lady-feminine-presence", "The Lady (Luminous Feminine Presence)", "psychic",
        [src(VID38, 279, "Luminous feminine contactor of Chris Bledsoe")],
        summary="Luminous feminine presence reported by Chris Bledsoe in his contact experiences; communicates with him about humanity's moral decay, civilizational cycles, judgment, and apocalyptic thresholds. Archetypally familiar despite unsettling quality."),
    location("zanesville-ohio", "Zanesville Ohio", "city",
        [src(VID38, 301, "Townsend Brown's birthplace; Bledsoe led Jesse there")],
        country="US", state="Ohio"),
]
claims_38 = [
    ("bledsoe-crohn-healed-jan-2007", 275,
     "On January 8 2007 during a fishing trip in NC, Chris Bledsoe witnessed orbs; his severe Crohn's disease was spontaneously healed afterward ('no more sickness').",
     "person-chris-bledsoe", "personal_account",
     ["person-chris-bledsoe", "phenomenon-the-lady-feminine-presence"],
     "It was 19 years ago on January the 8th of 2007. I was down and out and lost everything. Sick with Crohn's disease. Then my Crohn's was gone. I had no more sickness."),
    ("bledsoe-the-lady-apocalypse-messages", 279,
     "Bledsoe's 'Lady' communicates about humanity's moral decay, civilizational cycles, judgment, and a threshold-event apocalypse — framing aligning with ancient-apocalypse and Younger-Dryas cycles.",
     "person-chris-bledsoe", "personal_account",
     ["person-chris-bledsoe", "phenomenon-the-lady-feminine-presence"],
     "They touch on humanity's deep moral decay, cycles of civilizational collapse, judgment, the apocalypse, and renewal. They revolve around humanity reaching a threshold."),
    ("tim-taylor-dinner-with-president", 287,
     "NASA's Tim Taylor said he was 'at the dinner table with the president' when something was handed to him — photographed napkin with presidential seal from Camp David — reinforcing Bledsoe's claim that NASA has data beyond public knowledge.",
     "person-chris-bledsoe", "cited_from_document",
     ["person-chris-bledsoe", "person-tim-taylor-cape-canaveral"],
     "He said 'I was at the dinner table with the president and handed me that.' They have a scientific model of how these angels work at NASA. They know a lot more than we think they do."),
    ("bledsoe-nasa-cia-visitation", 283,
     "NASA and CIA high-level personnel visited Bledsoe; grilled him on his experiences; implied his given dates and symbols aligned with things they were already monitoring from other authoritative sources.",
     "person-chris-bledsoe", "personal_account",
     ["person-chris-bledsoe", "person-tim-taylor-cape-canaveral"],
     "NASA and the CIA show up at Bledsoe's door. Some imply that certain dates and symbols he's given by the lady align with things they're already monitoring and have seen from other authoritative sources."),
    ("bledsoe-zanesville-townsend-brown", 301,
     "Bledsoe took Jesse to Zanesville Ohio — Townsend Brown's hometown — where they recovered a metal piece potentially tied to Brown's antigravity work.",
     "person-chris-bledsoe", "personal_account",
     ["person-chris-bledsoe", "location-zanesville-ohio", "person-townsend-brown"],
     "He took you to Zanesville, Ohio, where you recovered a little piece of metal. Do you know who's from Zanesville, Ohio? Townsend Brown."),
]

# V39 9PJJiut0Iuw — Graham Hancock Stargate
VID39 = "9PJJiut0Iuw"
entities_39 = [
    P("flint-dibble", "Flint Dibble", VID39, 325,
      "Mainstream archaeologist who debated Hancock on JRE",
      "Mainstream archaeologist who debated Graham Hancock on the Joe Rogan Experience. Hancock argues Dibble's debating style revealed how academic archaeology deals with alternative viewpoints.",
      ["Dibble"], "archaeologist", ["archaeologist", "skeptic"]),
    document("ancient-apocalypse-s2", "Ancient Apocalypse Season 2", "broadcast",
        [src(VID39, 331, "Hancock's new Netflix season with Keanu Reeves cameos")],
        summary="Graham Hancock's new season of Ancient Apocalypse on Netflix; features numerology, mathematics, astronomy; cameos from actors like Keanu Reeves.",
        author="Graham Hancock"),
    document("ark-of-covenant-axum", "Ark of the Covenant (Axum tradition)", "report",
        [src(VID39, 363, "Ethiopian tradition of Ark resting in Axum")],
        summary="Ethiopian tradition that the Ark of the Covenant rests in Axum (Tigray province); Hancock spent years investigating this while working as an East Africa correspondent."),
    location("axum-ethiopia", "Axum, Ethiopia", "city",
        [src(VID39, 363, "Ethiopian city claimed as Ark of the Covenant resting place")],
        country="ET"),
    concept("secret-societies-first-time", "Secret Societies & 'First Time' Transmission", "metaphysics",
        [src(VID39, 321, "Hancock's frame of secret societies preserving first-civilization knowledge")],
        summary="Hancock's framing: secret societies were entrusted with preserving knowledge from 'the First Time' — the antediluvian civilization — and passing it to future generations. The knowledge represents precocious astronomical/Milky-Way-journey knowledge not possessed today."),
]
claims_39 = [
    ("hancock-dibble-debate-reveals-archaeology", 329,
     "Hancock argues his JRE debate with Flint Dibble revealed mainstream archaeology's 'win at all costs' approach to alternative viewpoints — Dibble repeatedly claims to have 'destroyed Graham' despite Hancock not feeling destroyed.",
     "person-graham-hancock", "on_record_statement",
     ["person-graham-hancock", "person-flint-dibble"],
     "That debate has helped to show the general public how archaeology functions when it deals with people with alternative points of view. That function seems to be to win at all costs."),
    ("hancock-first-time-milky-way-knowledge", 321,
     "Hancock posits that antediluvian secret societies preserve astronomical knowledge of 'the First Time' — including Milky-Way-journey cosmology via what is paradoxically called the 'underworld' in Egyptian tradition.",
     "person-graham-hancock", "speculation",
     ["person-graham-hancock", "concept-secret-societies-first-time"],
     "Secret societies which were entrusted with preserving information from what they call the first time and passing it down to future generations that represents such a precocious advanced astronomical knowledge — cosmic scale knowledge that we just don't have today."),
    ("hancock-ethiopia-axum-ark", 357,
     "Hancock: Ethiopia is the only country in the world that claims to have the Ark of the Covenant — specifically at Axum in Tigray province; Hancock 'ate it, slept it, breathed it' for years as his first deep ancient-history investigation.",
     "person-graham-hancock", "personal_account",
     ["person-graham-hancock", "document-ark-of-covenant-axum", "location-axum-ethiopia"],
     "Ethiopia is the only country in the world that claims to have the Ark of the Covenant. The town is Axum in the province of Tigray in Northern Ethiopia. I ate it, I slept it, I breathed it, I dreamed it all the time."),
    ("hancock-ancient-apocalypse-s2-keanu", 331,
     "Ancient Apocalypse Season 2 features cameos from actors like Keanu Reeves and deep numerology/astronomy content — moving Hancock beyond the point of cancellation.",
     "person-jesse-michels", "personal_account",
     ["person-graham-hancock", "document-ancient-apocalypse-s2"],
     "A new season of Ancient Apocalypse on Netflix — numerology, mathematics, astronomy. Cameos from people like Keanu Reeves."),
]

# V40 d9tdJ2SkBKQ — Bob Lazar direct
VID40 = "d9tdJ2SkBKQ"
entities_40 = [
    P("bob-lazar-extended", "Bob Lazar (extended)", VID40, 377,
      "S-4 whistleblower; 1989 public disclosure; home-lab gravity researcher",
      "S-4 UFO reverse-engineering whistleblower (1989 KLAS-TV). Still the only person to publicly claim direct work on NHI craft. Currently works on gravity-altering physics in personal home laboratory.",
      ["Lazar", "Robert Lazar"], "physicist / whistleblower",
      ["whistleblower", "S-4", "element-115", "controversial"]),
    P("nasa-lead-scientist", "NASA Lead Scientist (surprise guest)", VID40, 407,
      "NASA scientist working on anti-gravity experiments at ~400 volts",
      "Unnamed (or partially named) NASA lead scientist whom Jesse surprises Lazar with; running anti-gravity experiments at ~400 volts — mirroring and extending Lazar's work.",
      [], "scientist", ["NASA", "scientist", "antigravity"]),
    technology("lazar-gravity-altering-home-lab", "Lazar Home Lab Gravity Experiments", "propulsion",
        [src(VID40, 403, "Lazar's ongoing personal-laboratory gravity investigation")],
        summary="Bob Lazar's current (ongoing) home-laboratory gravity-altering experiments; X-rays reveal hollow-tube structure in his current reactor investigation."),
]
claims_40 = [
    ("lazar-still-researching-gravity", 403,
     "Bob Lazar is currently working on gravity-altering experiments in his home laboratory — actively continuing the physics investigation he started at S-4 in the 1980s.",
     "person-bob-lazar-extended", "personal_account",
     ["person-bob-lazar-extended", "technology-lazar-gravity-altering-home-lab"],
     "Bob is currently working on exotic UFO science in his personal lab. How did the reactor work? Through X-rays we were able to determine that there's a hollow tube."),
    ("lazar-surprise-nasa-scientist", 407,
     "Jesse surprised Lazar on-camera with a NASA lead scientist conducting his own anti-gravity experiments at ~400 volts — a first-ever documented meeting between Lazar and an active NASA anti-gravity researcher.",
     "person-jesse-michels", "personal_account",
     ["person-bob-lazar-extended", "person-nasa-lead-scientist", "organization-nasa",
      "concept-antigravity"],
     "I surprise Bob with a scientist at NASA who's doing his own experiments on anti-gravity. What kind of voltage are you using right now? About 400 volts."),
    ("lazar-still-only-public-firsthand", 393,
     "Despite decades of whistleblower disclosures (Grusch, Elizondo, etc.), Lazar remains the only person publicly claiming direct firsthand reverse-engineering work on an NHI craft.",
     "person-jesse-michels", "on_record_statement",
     ["person-bob-lazar-extended", "concept-reverse-engineering"],
     "Bob is an anomaly. He's on an island. He's still the only person to have gone public claiming he worked directly on a craft of nonhuman origin."),
    ("lazar-time-flow-manipulation", 397,
     "Lazar describes that the S-4 programs 'really wanted to see if they could affect the flow of time' — hinting that propulsion was secondary to temporal research in program intent.",
     "person-bob-lazar-extended", "personal_account",
     ["person-bob-lazar-extended", "concept-time-travel-hypothesis"],
     "They really wanted to see if they could affect the flow of time."),
    ("lazar-area-51-footage", 415,
     "Jesse shows Lazar legendary never-before-seen footage of a UFO at Area 51 that people have been trying to acquire for years.",
     "person-jesse-michels", "personal_account",
     ["person-bob-lazar-extended", "location-groom-lake"],
     "I also had the honor of showing Bob legendary never-before-seen footage of a UFO at Area 51. People have been trying to get their hands on this specific footage for years."),
]

# V41 2Xxmguz0GEQ — Bob Maguire
VID41 = "2Xxmguz0GEQ"
entities_41 = [
    P("bob-maguire", "Bob Maguire", VID41, 425,
      "Former CIA contractor; hot-guy-360 / Federated Wireless founder; UFO physics",
      "Former intelligence-community contractor (several decades, multiple three-letter agencies); founder of Federated Wireless; deep-physics UFO researcher. Personally met John Wheeler ('it from bit') in retirement and received autographs.",
      ["Maguire"], "intelligence contractor / entrepreneur",
      ["intelligence", "entrepreneur", "researcher"]),
    P("john-wheeler", "John Archibald Wheeler", VID41, 463,
      "Physicist of 'it from bit' hypothesis; Maguire's mentor",
      "American theoretical physicist (1911-2008); originator of 'it from bit' informational ontology. Met Bob Maguire in his retirement village and became regular visitor.",
      ["Wheeler", "John Archer Wheeler"], "physicist",
      ["physicist", "historical"]),
    P("matthew-pines", "Matthew Pines", VID41, 433,
      "Photographic-memory UAP-field analyst",
      "Independent national-security/UAP analyst with near-perfect photographic memory; commands the UAP literature exhaustively across physics, geopolitics, and program structure; referenced by Maguire and Michels as exceptional.",
      ["Pines"], "analyst", ["analyst", "researcher"]),
    P("sabine-hossenfelder", "Sabine Hossenfelder", VID41, 461,
      "Theoretical physicist who argues multiverse is untestable",
      "German theoretical physicist; publicly critical of untestable hypotheses (multiverse) as non-scientific; left academia after angering too many people.",
      ["Hossenfelder"], "physicist", ["physicist", "scientist"]),
    concept("it-from-bit", "It From Bit (Wheeler)", "physics",
        [src(VID41, 447, "Wheeler's informational ontology for physical reality")],
        summary="John Wheeler's hypothesis that all physical reality is fundamentally informational — 'yes/no' bits constitute matter; physical state is the answer to a series of yes/no questions. Referenced by Maguire as foundational."),
    concept("many-worlds-everett", "Many-Worlds / Everett Interpretation", "physics",
        [src(VID41, 457, "Everett's quantum multiverse interpretation")],
        summary="Hugh Everett's interpretation: wavefunction never collapses; universe continuously branches. Everett was Wheeler's student. Maguire describes it as mathematically sound but empirically untestable per Sabine Hossenfelder."),
]
claims_41 = [
    ("maguire-obama-bledsoe-napkin", 423,
     "Per Bob Maguire: the address on a picture mailed to Chris Bledsoe matched Bledsoe's own address; the napkin bore the presidential seal from Camp David; only plausible sender of that mailing was Barack Obama.",
     "person-bob-maguire", "personal_account",
     ["person-bob-maguire", "person-chris-bledsoe", "person-tim-taylor-cape-canaveral"],
     "I knew the address because it was the address of Chris Bledsoe. I knew the napkin because it was the presidential seal on a napkin from Camp David. The picture was mailed to him by Tim Taylor. The only person that story can have been told to in that envelope was Barack Obama."),
    ("maguire-wheeler-retirement-meetings", 463,
     "Maguire's wife worked at the New Jersey retirement community where John Wheeler lived; Maguire repeatedly visited Wheeler for extended discussions covering gravitation and 'it from bit.'",
     "person-bob-maguire", "personal_account",
     ["person-bob-maguire", "person-john-wheeler"],
     "My wife was a nurse at a retirement community. She says it's the same name on a bunch of your books. I said John Wheeler. I went over, had tea with him, became a regular visitor."),
    ("maguire-pines-photographic-memory", 433,
     "Matthew Pines commands the UAP field with near-perfect photographic memory — speaks at detail level of branchial/branchical space hypersurface foliations, computationally-bounded relative equivalencing, for hours without notes.",
     "person-bob-maguire", "personal_account",
     ["person-bob-maguire", "person-matthew-pines"],
     "Matthew Pines is that person who has a mere perfect photographic memory. Talk to you about detail stuff that excited my imagination — hypersurface foliations of branchial space that are computationally bounded — he did it without looking at a single note for hours."),
    ("maguire-it-from-bit-wheeler", 447,
     "Per Maguire: Wheeler summarized his ultimate ontology as 'it from bit' — matter and energy are constituted by bits of information describing their configuration.",
     "person-bob-maguire", "personal_account",
     ["person-bob-maguire", "person-john-wheeler", "concept-it-from-bit"],
     "He said 'it from bit' and what he meant was that which constitutes the universe all around us are actually bits of information that describe their configuration and the state they're in."),
    ("hossenfelder-multiverse-untestable", 461,
     "Sabine Hossenfelder argues the Many-Worlds multiverse is experimentally untestable and therefore a non-scientific hypothesis — a position that contributed to her leaving academia.",
     "person-bob-maguire", "cited_from_document",
     ["person-sabine-hossenfelder", "concept-many-worlds-everett"],
     "Sabine Hossenfelder has recently argued that you can't test it — that it's an untestable hypothesis and therefore a non-scientific hypothesis. She's had to give up on her academic career because she's angered too many people."),
]

# V42 IFaXi-NrPV0 — Kirsan Ilyumzhinov
VID42 = "IFaXi-NrPV0"
entities_42 = [
    P("kirsan-ilyumzhinov", "Kirsan Ilyumzhinov", VID42, 475,
      "President of Kalmykia 1993-2010; FIDE President 1995-2018; alleged 1997 abductee",
      "Former President of the Russian Republic of Kalmykia (only Buddhist republic in Russian Federation). Long-serving FIDE (World Chess Federation) President. Publicly claims September 1997 abduction from his Moscow penthouse by yellow-garmented beings.",
      ["Xenov", "Ilyumzhinov"], "politician / chess administrator",
      ["politician", "abductee", "experiencer", "Russia"]),
    P("tsiolkovsky", "Konstantin Tsiolkovsky", VID42, 507,
      "Soviet rocket pioneer; Russian space father",
      "Soviet rocket-science pioneer; Russian father of spaceflight theory. Cited by Ilyumzhinov as having anticipated extraterrestrial contact.",
      ["Tsiolkovsky"], "scientist", ["scientist", "Russia", "historical"]),
    P("yuri-gagarin", "Yuri Gagarin", VID42, 499,
      "First human in space; cited by Ilyumzhinov",
      "First human in space; referenced by Ilyumzhinov for his famous 'from the ground towards the new' statement upon engine ignition.",
      ["Gagarin"], "astronaut", ["cosmonaut", "Russia", "historical"]),
    incident("1997-ilyumzhinov-abduction", "1997 Ilyumzhinov Moscow Abduction", "abduction", "1997-09-25",
        [src(VID42, 485, "Sitting president abducted from Moscow penthouse by yellow-garmented beings")],
        summary="September 1997: Ilyumzhinov (then-sitting President of Kalmykia) abducted from his Moscow penthouse by beings in yellow garments. Entered via balcony-tube; shown football-field-sized laboratory-like interior; beings communicated telepathically; Ilyumzhinov confronted the driver, friend, and assistant who searched his apartment for over an hour."),
    location("kalmykia-russia", "Republic of Kalmykia (Russian Federation)", "region",
        [src(VID42, 474, "Only Buddhist republic in Russian Federation")],
        country="RU"),
]
claims_42 = [
    ("ilyumzhinov-sitting-president-abduction", 475,
     "Kirsan Ilyumzhinov is a sitting president of a prominent nation (Kalmykia, Russian Federation) publicly claiming he was abducted by aliens in September 1997 — unprecedented.",
     "person-jesse-michels", "on_record_statement",
     ["person-kirsan-ilyumzhinov", "incident-1997-ilyumzhinov-abduction"],
     "A prominent nation who was abducted by aliens — sitting president in 1997. Kirsan Ilyumzhinov."),
    ("ilyumzhinov-three-witnesses", 487,
     "Ilyumzhinov cites three witnesses (driver, friend, assistant) who searched his apartment for over an hour finding only his slippers — corroborating his physical disappearance.",
     "person-kirsan-ilyumzhinov", "personal_account",
     ["person-kirsan-ilyumzhinov", "incident-1997-ilyumzhinov-abduction"],
     "I had three witnesses. The driver, my friend who came for me, and my assistant. They searched the apartment for over an hour and couldn't find me. They went in — slippers are there."),
    ("ilyumzhinov-telepathic-yellow-garmented", 493,
     "The beings wore yellow garments and communicated through thoughts; interior was ~several football-fields in size; beings were experimenting on boxes brought up from somewhere else.",
     "person-kirsan-ilyumzhinov", "personal_account",
     ["person-kirsan-ilyumzhinov", "incident-1997-ilyumzhinov-abduction",
      "phenomenon-alien-telepathy"],
     "They were wearing yellow garments. Large space like several soccer fields. Communicated through thoughts."),
    ("ilyumzhinov-gorbachev-kissinger-aware", 480,
     "Ilyumzhinov claims Henry Kissinger, Gorbachev, and current leaders (Trump, Putin, Xi Jinping) are aware of the alien presence; directly names Kissinger as having relevant knowledge.",
     "person-kirsan-ilyumzhinov", "hearsay",
     ["person-kirsan-ilyumzhinov"],
     "American Secretary of State Henry Kissinger. Henry had a small folder. Gorbachev sitting next to him said, not all but after that meeting. Trump, Putin, Xi Jinping, these they're aware of the alien presence and UFOs."),
    ("ilyumzhinov-fifth-civilization", 485,
     "Ilyumzhinov asserts humans are the 'fifth civilization' — beings told him human history has ended prior civilizations; current one must overcome weapons-invention addiction or end similarly.",
     "person-kirsan-ilyumzhinov", "personal_account",
     ["person-kirsan-ilyumzhinov", "incident-1997-ilyumzhinov-abduction"],
     "We are the fifth civilization. All your science and efforts towards inventing weapons — bacterial, chemical, atomic weapons, with ways to kill more people."),
]


if __name__ == "__main__":
    print("Extending videos 33-42...")
    extend(VID33, entities_33, claims_33)
    extend(VID34, entities_34, claims_34)
    extend(VID35, entities_35, claims_35)
    extend(VID36, entities_36, claims_36)
    extend(VID37, entities_37, claims_37)
    extend(VID38, entities_38, claims_38)
    extend(VID39, entities_39, claims_39)
    extend(VID40, entities_40, claims_40)
    extend(VID41, entities_41, claims_41)
    extend(VID42, entities_42, claims_42)
    print("Done.")
