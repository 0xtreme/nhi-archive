"""Deep claim extraction for videos 73-82."""
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


# V73 LpLFWdsIU7M — Matthew Pines Trump Disclosure
VID73 = "LpLFWdsIU7M"
entities_73 = [
    P("matthew-pines-extended", "Matthew Pines (extended)", VID73, 13,
      "Sentinel One Dir of Intelligence; UAP disclosure policy analyst",
      "Director of Intelligence at Sentinel One; crypto background. Near-perfect photographic memory; commands UAP literature exhaustively across physics, geopolitics, and program structure. Frequent Jesse Michels guest.",
      ["Pines"], "analyst", ["analyst", "researcher"]),
    concept("perestroika-american-analog", "American Perestroika Framework", "politics",
        [src(VID73, 19, "Pines framework: Trump era = US perestroika / glasnost analog")],
        summary="Matthew Pines' analogy framework: 2024-2025 US political phase-shift best understood as American perestroika — alliance of ejected technocrats (Thiel, Musk), tech oligarchs, and security-state insiders against decaying managerial establishment. Soviet parallels. UFO disclosure may be part of opening-up."),
    concept("ai-quantum-uap-triangle", "AI / Quantum / UAP Convergence Triangle", "politics",
        [src(VID73, 12, "Convergence of three previously separate domains flagged by DoD insiders")],
        summary="Per Pines' DoD Intel sources: there is a triangle convergence — AI, quantum computing, and the Grusch-disclosure UAP material. Deep-state insiders are increasingly recognizing these are not separable research threads."),
]
claims_73 = [
    ("pines-perestroika-us-parallel", 19,
     "Pines' framing: 2024-2025 American political phase-shift is best modeled as a US perestroika — alliance of ejected technocrats, tech oligarchs, and security-state insiders displacing managerial establishment. UFO disclosure is part of the opening.",
     "person-matthew-pines-extended", "on_record_statement",
     ["person-matthew-pines-extended", "concept-perestroika-american-analog"],
     "The closest analogy is sort of America's perestroika. Perestroika in the Soviet system came with glasnost — reform and opening up. You're witnessing a new anti-establishment heterogeneous alignment displacing the old establishment."),
    ("pines-dod-intel-water-medium-zap", 7,
     "Pines reports DoD Intel sources told him just recently: 'one of the things came out of the water medium and zapped hit somebody' — direct-effect UAP incident in active reporting.",
     "person-matthew-pines-extended", "hearsay",
     ["person-matthew-pines-extended"],
     "Just the other day, some people inside DoD Intel told me one of the things came out of the water medium and zapped hit somebody."),
    ("pines-ai-quantum-uap-triangle", 12,
     "Pines: DoD Intel insiders explicitly name the convergence — 'they said it's a triangle. AI, quantum, and the Grusch stuff. What the hell is actually happening?'",
     "person-matthew-pines-extended", "hearsay",
     ["person-matthew-pines-extended", "concept-ai-quantum-uap-triangle"],
     "They said it's a triangle. AI, quantum, and the Grush stuff. What the hell is actually happening?"),
    ("pines-brain-room-temp-quantum", 9,
     "Pines: 'I think the brain itself is probably maybe a room-temperature quantum system' — aligning consciousness-physics with UAP detection/interaction mechanisms.",
     "person-matthew-pines-extended", "speculation",
     ["person-matthew-pines-extended"],
     "I think the brain itself is probably, you know, maybe a room temperature quantum system."),
    ("pines-cannibalize-periphery", 9,
     "Pines geopolitical aphorism: 'Any imperial system when it runs into trouble, first thing it does is it cannibalizes the periphery. Things seem to be unraveling quickly.'",
     "person-matthew-pines-extended", "on_record_statement",
     ["person-matthew-pines-extended"],
     "Any imperial system when it runs into trouble, first thing it does is it cannibalizes the periphery. Things seem to be kind of unraveling quickly."),
]

# V74 Jpf0ZGY87c0 — Kissinger UFO
VID74 = "Jpf0ZGY87c0"
entities_74 = [
    P("arthur-stansel", "Arthur Stansel", VID74, 53,
      "Decorated WWII veteran / physics-engineer; 1953 Kingman Arizona crash witness",
      "Decorated World War II veteran (3 Purple Hearts, Bronze Star); post-war career in physics and engineering at Wright-Patterson. In May 1953, flown blindfolded from Phoenix to classified Kingman AZ crash site to measure impact velocity of a 30ft double-saucer craft with humanoid bodies.",
      ["Stansel"], "military / engineer",
      ["witness", "USAF", "historical", "WP"]),
    P("eric-wang", "Dr. Eric H. Wang", VID74, 59,
      "Mysterious Vienna-born Wright-Patterson special-studies department head; Kissinger-linked",
      "Austrian-Jewish physicist born 1906 Vienna; Vienna Technical Institute; contemporary of Victor Schauberger; immigrated to US before WWII; lectured at University of Cincinnati; head of Department of Special Studies at Wright-Patterson. Per widow Maria: reported directly to Henry Kissinger on classified flying-saucer program. Died 1960.",
      ["Wang", "Wing"], "physicist",
      ["physicist", "WP", "historical"]),
    P("maria-wang", "Maria Wang", VID74, 67,
      "Widow of Eric Wang; confirmed Kissinger's UFO-program oversight",
      "Widow of Dr. Eric Wang. Revealed to researcher William Steinman that her husband reported directly to Henry Kissinger on classified extraterrestrial-technology projects; Kissinger visited the Wang home.",
      [], "widow",
      ["witness", "historical"]),
    P("william-steinman", "William Steinman", VID74, 63,
      "1980s UFO researcher who tracked down Eric Wang's widow",
      "1980s UFO researcher; tracked down Dr. Eric Wang's obituary and widow Maria; broke the Kissinger-Wang UFO connection.",
      ["Steinman"], "researcher", ["researcher", "historical"]),
    P("henry-kissinger", "Henry Kissinger", VID74, 71,
      "National Security Adviser; Secretary of State; alleged UFO program overseer",
      "National Security Adviser and Secretary of State under Nixon and Ford; Nobel Peace Prize (Vietnam). Per Maria Wang: deeply involved in the US flying-saucer program before his public office — traced back to Nixon-era Wright-Patterson operations via Dr. Eric Wang.",
      ["Kissinger"], "diplomat",
      ["official", "historical", "alleged-UFO-overseer"]),
    incident("1953-kingman-arizona-crash", "1953 Kingman Arizona UFO Crash", "crash_retrieval", "1953-05-21",
        [src(VID74, 51, "30ft saucer buried 20in sand near Kingman post-Harry nuclear test")],
        summary="May 1953: two days after the 'Harry' nuclear test (32 kilotons, double Hiroshima) at Nevada test site during Operation Upshot-Knothole, a 30ft 'two deep saucers fused' craft crashed near Kingman Arizona. Stansel and 14 other specialists flown in blindfolded from Phoenix to measure impact velocity. Recovered small humanoid bodies laid out in nearby tent."),
]
claims_74 = [
    ("wang-reported-to-kissinger", 69,
     "Maria Wang's claim to researcher William Steinman: her late husband Dr. Eric Wang reported directly to Henry Kissinger on classified extraterrestrial-technology projects at Wright-Patterson. Kissinger visited their home.",
     "person-jesse-michels", "cited_from_document",
     ["person-eric-wang", "person-maria-wang", "person-henry-kissinger",
      "person-william-steinman", "location-wright-patterson-afb"],
     "Maria Wang confirmed that her late husband had worked on classified projects at Wright-Patterson, projects that involved technology not of this world. Before his death, Eric had confided in her that the US government was studying recovered extraterrestrial craft. Her husband had reported directly to Henry Kissinger."),
    ("stansel-kingman-1953-saucer-bodies", 51,
     "Stansel's 1953 Kingman Arizona crash witness account: 30ft 'two deep saucers fused' craft buried 20in in sand; no landing gear, no damage, small hatch; number of 4ft humanoid figures laid out on a nearby tent table. Two days after the Harry nuclear test at Nevada.",
     "person-jesse-michels", "cited_from_document",
     ["person-arthur-stansel", "incident-1953-kingman-arizona-crash"],
     "It looked like two deep saucers fused together, buried 20 inches in the sand. Roughly 30 ft in diameter, brushed metal material. No landing gear, no visible damage, small open hatch. Inside a nearby tent, a number of 4ft tall humanoid figures laid out on a table."),
    ("mellon-kingman-corroboration", 57,
     "Former intelligence official Chris Mellon has publicly revealed that this same Kingman flying saucer had been 'recovered and studied over the decades since its retrieval' — corroborating Stansel's 1953 account.",
     "person-jesse-michels", "cited_from_document",
     ["person-arthur-stansel", "incident-1953-kingman-arizona-crash",
      "person-chris-mellon"],
     "Former intelligence official Chris Mellon revealed that this flying saucer had been recovered and studied over the decades since its retrieval."),
    ("wang-schauberger-vienna-contemporary", 65,
     "Dr. Eric Wang was born 1906 Vienna and graduated from Vienna Technical Institute — a contemporary of Victor Schauberger, the Austrian inventor rumored to have developed revolutionary propulsion/flying-saucer concepts for the Nazis.",
     "person-jesse-michels", "cited_from_document",
     ["person-eric-wang", "person-victor-schauberger"],
     "Dr. Eric H. Wang, born in 1906, had originally come from Vienna. He had graduated from Vienna Technical Institute. And there are suggestions that he was a contemporary of Victor Schauberger, the man rumored to have developed a revolutionary propulsion system, perhaps even conceptual flying saucers for the Nazis."),
    ("wang-1956-relocated-kirtland-sandia", 67,
     "In 1956 Dr. Wang's Department of Special Studies at Wright-Patterson was relocated to New Mexico — to the Sandia Laboratory complex at Kirtland AFB.",
     "person-jesse-michels", "cited_from_document",
     ["person-eric-wang", "location-sandia-national-lab",
      "location-wright-patterson-afb"],
     "In 1956, Wang's department was relocated to New Mexico to the Sandia Laboratory's complex at Kirtland Air Force Base."),
]

# V75 KRDE1i3LDuU — James Madden Plato's Cave
VID75 = "KRDE1i3LDuU"
entities_75 = [
    P("james-madden", "Dr. James Madden", VID75, 99,
      "Professor of philosophy reconciling Plato with UFO phenomenon",
      "Professor of philosophy; author of 'Unidentified Flying Hyperobject' — first serious philosophical treatment of UFOs via Plato, Aristotle, Nietzsche, Heidegger. Jiu-jitsu practitioner in the 'broad-shouldered wrestler' Plato tradition.",
      ["Madden"], "philosopher",
      ["philosopher", "academic"]),
    document("unidentified-flying-hyperobject", "Unidentified Flying Hyperobject", "book",
        [src(VID75, 99, "James Madden's philosophical UFO book")],
        summary="James Madden's book integrating philosophical tradition (Plato, Aristotle, Nietzsche, Heidegger) with the UFO phenomenon — unique in bringing ancient-philosophy methodology to contemporary UAP data.",
        author="James Madden"),
    concept("platos-cave-ufo-puller", "Plato's Cave as UFO-Puller", "metaphysics",
        [src(VID75, 93, "Madden: UFO phenomenon = external puller pulling humans out of cave")],
        summary="Madden's philosophical synthesis: the UFO phenomenon operates as an external 'puller' (from outside Plato's cave) dragging humans toward enlightenment — the phenomenon busts all priors. Inflection point: the light either eviscerates or saves the observer."),
    P("plato", "Plato", VID75, 101,
      "Ancient Greek philosopher; student of Socrates",
      "Ancient Greek philosopher (c. 428-348 BCE); student of Socrates; founder of Platonic school; author of Republic, Symposium, etc. 'Plato' was a nickname meaning 'broad' — he was the most accomplished wrestler of his generation in Athens.",
      ["Platon"], "philosopher", ["philosopher", "historical"]),
    concept("republic-about-death", "Plato's Republic Is About Death (Madden)", "metaphysics",
        [src(VID75, 121, "Madden: Republic is primarily about death, not justice")],
        summary="Madden's thesis: Plato's Republic is primarily about DEATH and the human condition in facing it — framed by opening discussion of death and closing myth of Er. Justice is a secondary question that emerges only to address death."),
]
claims_75 = [
    ("madden-republic-about-death", 121,
     "Madden argues Plato's Republic is primarily about DEATH — bookended by the opening discussion (older man saying the just don't fear death) and closing Myth of Er (death myth). Justice is a secondary question raised only to address death.",
     "person-james-madden", "on_record_statement",
     ["person-james-madden", "person-plato", "concept-republic-about-death"],
     "The actual question that initiates the dialogue is the question of death. The dialogue is bookended with two stories about death. For my money, if you ask me what's the Republic about, it's really about death. And the human condition in facing death."),
    ("madden-ufo-puller-enlightenment", 95,
     "Madden's philosophical synthesis: UFO phenomenon functions as external 'puller' from outside Plato's cave, busting all priors, inflection-point force that 'either eviscerates us or saves us.'",
     "person-james-madden", "speculation",
     ["person-james-madden", "concept-platos-cave-ufo-puller",
      "document-unidentified-flying-hyperobject"],
     "Is the UFO some sort of pulling technology? It busts all of your priors. It would seem there has to be somebody outside of the cave doing this. The light itself feels like an inflection point where it could either sort of eviscerate us or save us."),
    ("madden-plato-wrestler-nickname", 107,
     "Madden: 'Plato' was a nickname meaning 'broad' or 'big' (broad-shouldered) — he was the most accomplished wrestler of his generation in Athens.",
     "person-james-madden", "cited_from_document",
     ["person-james-madden", "person-plato"],
     "Plato is not probably his given birth name. It's a nickname like broad or big as in like broad shouldered cuz he was the most accomplished wrestler of his generation in Athens."),
    ("madden-platonic-authority-fails", 121,
     "Per Madden: a recurring pattern in Plato's dialogues — authority figures make claims but can't 'cash them out'; the old man in the Republic opening makes claims about justice and then leaves when asked to define it.",
     "person-james-madden", "on_record_statement",
     ["person-james-madden"],
     "The authority figure, the old man, is making claims but he can't cash it. This goes on in all the Platonic dialogues — the authority figures always fail to actually deliver what they're claiming."),
    ("madden-republic-political-misread", 93,
     "Madden: Republic is often misread as 'Plato's political program' — but this is incorrect; the dialogue is not proposing a literal political system but using the city as an analog for the soul.",
     "person-james-madden", "on_record_statement",
     ["person-james-madden", "person-plato"],
     "I think you have to get away from thinking what we're being proposed here is actually Plato's like political program, and there's something else going on here."),
]

# V76 5OUzGygIrSw — Dave Rossi
VID76 = "5OUzGygIrSw"
entities_76 = [
    P("dave-rossi", "Dave Rossi", VID76, 151,
      "Former construction worker; autodidact physicist; DMT-adjacent blue-being contact",
      "Former construction worker; self-taught into quantum physics and extended electrodynamics after blue-alien-energy-being contact experience. Knowledge impressed Navy scientist, Hal Puthoff, and Eric Davis. Host of Generation Zed podcast.",
      ["Rossi"], "autodidact researcher",
      ["experiencer", "researcher", "autodidact"]),
    concept("extended-electrodynamics", "Extended Electrodynamics (Scalar-Longitudinal Waves)", "physics",
        [src(VID76, 133, "Three new wave types beyond classical E/M by introducing scalar field")],
        summary="Extended electrodynamics framework: by introducing the scalar field, at least three completely new kinds of waves (scalar-longitudinal-etc) become mathematically predicted — framework initially considered 'quackery' but subsequently supported by National Science Foundation / NASA investigation per Jesse's note."),
    concept("blue-energy-being", "Blue Energy Being (Rossi)", "metaphysics",
        [src(VID76, 163, "Rossi's alleged plasma-body entity encounter")],
        summary="Rossi's contactor: plasma-electric humanoid being of pure blue energy; not dense, hand passes through; significantly taller than Rossi; communicated physics concepts of scalar/longitudinal waves. Not technically remembered as physical abduction — spiritual/energetic experience boundary unclear."),
    incident("ufo-plants-aged-10yr", "UFO Over Plants — 10yr Accelerated Aging Incident", "sighting", "1980-01-01",
        [src(VID76, 137, "Plants analyzed post-UFO hover aged 10 years in hours")],
        summary="Per Rossi: a UAP hovered near some plants; when individual approached, UAP departed at high speed. Plants subsequently analyzed showed they had aged 10 years within hours — anomalous accelerated-aging biological effect."),
]
claims_76 = [
    ("rossi-blue-being-scalar-wave-physics", 163,
     "Rossi describes a plasma-electric blue-energy humanoid being (not dense, hand passes through) that showed him scalar-longitudinal wave physics via visual slinkies — initiating his autodidact journey into extended electrodynamics.",
     "person-dave-rossi", "personal_account",
     ["person-dave-rossi", "concept-blue-energy-being", "concept-extended-electrodynamics"],
     "I remember essentially being taken by a blue energy type humanoid. Pure blue energy, electric plasma type being, not dense whatsoever. Because of what this being had showed me, I started looking into longitudinal scalar waves shown to me as slinkies."),
    ("rossi-puthoff-davis-vindication", 143,
     "Rossi's physics understanding was confirmed impressive by Eric Davis and Hal Puthoff personally — despite Rossi's lack of formal training.",
     "person-dave-rossi", "on_record_statement",
     ["person-dave-rossi", "person-hal-puthoff", "person-eric-davis",
      "concept-extended-electrodynamics"],
     "Our next guest was also spotted by the legendary Hal Puthoff and Eric Davis, who have also noted his impressive knowledge in areas of unorthodox science."),
    ("rossi-extended-electrodynamics-vindicated-nsf-nasa", 147,
     "Shortly after Rossi's interview recording (Dec 2024), the National Science Foundation and NASA co-sponsored a panel with elite scientists investigating extended electrodynamics — the framework Rossi said was being called quackery.",
     "person-jesse-michels", "on_record_statement",
     ["person-dave-rossi", "concept-extended-electrodynamics",
      "organization-nasa"],
     "We recorded in early December 2024. At the time, extended electrodynamics was considered quackery. But right after we recorded, the National Science Foundation and NASA co-sponsored a podcast with some elite scientists claiming to investigate extended electrodynamics."),
    ("rossi-plants-aged-10yrs", 137,
     "Per Rossi: when a UAP hovered near plants and then left, subsequent analysis showed the plants had aged 10 years within hours — biological accelerated-aging anomaly.",
     "person-dave-rossi", "hearsay",
     ["person-dave-rossi", "incident-ufo-plants-aged-10yr"],
     "A UAP was hovering near some plants. When the plants that were close to the UAP were analyzed, they had aged 10 years within X amount of hours."),
    ("rossi-vacuum-potentials-surveillance", 133,
     "Rossi claims a government group has been working since the 1990s on using quantum-vacuum potentials to surveil entire rooms — operational success; he won't elaborate on mechanism due to sensitivity.",
     "person-dave-rossi", "hearsay",
     ["person-dave-rossi", "concept-extended-electrodynamics"],
     "You can use the potentials that exist all around us right now in the quantum vacuum to surveil an entire room. I know a group that is working in the government that has been working on this since the '90s and they've had massive success."),
    ("rossi-6-month-weaponization-risk", 139,
     "Rossi warns: 'mutual friends working privately on some of these things — 6-7 months worth of lab work, all of a sudden it's a weapon. If someone gets hold of that weapon, it's game over.'",
     "person-dave-rossi", "speculation",
     ["person-dave-rossi", "concept-extended-electrodynamics"],
     "We have mutual friends privately working on some of these things where 6-7 months worth of work in the lab, all of a sudden it's a weapon. If someone gets a hold of that weapon, it's game over."),
]

# V77 KGD1nuM4MR8 — Kirk McConnell Senate staffer
VID77 = "KGD1nuM4MR8"
entities_77 = [
    P("kirk-mcconnell", "Kirk McConnell", VID77, 179,
      "Former Senate Armed Services Committee staffer for Senator Jack Reed",
      "Retired Senate staffer ~30 years; worked on Senate Armed Services Committee attached to Senator Jack Reed (Rhode Island). Staff-level investigator of UAP issue post-2017 NYT article. Interviewed Navy pilots, Fravor, Dietrich; met Puthoff, Davis, Fugal at Skinwalker.",
      ["McConnell"], "Senate staffer",
      ["Senate", "investigator", "official"]),
    P("leslie-kean", "Leslie Kean", VID77, 183,
      "Journalist behind 2017 NYT UAP article",
      "Independent journalist; co-authored 2017 New York Times bombshell article on ATIP with Ralph Blumenthal — the seminal modern-disclosure event.",
      ["Kean"], "journalist", ["journalist"]),
    P("ralph-blumenthal", "Ralph Blumenthal", VID77, 183,
      "NYT journalist co-author of 2017 UAP article",
      "New York Times journalist; co-authored the 2017 NYT bombshell UAP article with Leslie Kean.",
      ["Blumenthal"], "journalist", ["journalist", "NYT"]),
    P("jack-reed-senator", "Jack Reed (Senator)", VID77, 185,
      "Senator Jack Reed of Rhode Island; Armed Services Committee",
      "US Senator from Rhode Island; Armed Services Committee; Kirk McConnell's boss for UAP oversight work.",
      ["Reed"], "politician", ["politician", "senator"]),
    P("bill-cohen-senator", "Bill Cohen (Senator)", VID77, 193,
      "Former Senator Bill Cohen from Maine; Intel Committee",
      "Former US Senator from Maine; chairman of Senate Intelligence Committee; Chris Mellon's original Senate boss in late 1980s.",
      ["Cohen"], "politician", ["politician", "senator", "historical"]),
    event("2017-nyt-uap-article", "2017 NYT UAP Bombshell Article", "publication", "2017-12-16",
        [src(VID77, 183, "Leslie Kean + Ralph Blumenthal NYT article launched modern disclosure")],
        summary="December 2017 New York Times bombshell article by Leslie Kean and Ralph Blumenthal — with 3 Navy videos (Tic Tac, Gimbal, Go Fast) cleared by Pentagon, exposure of ATIP program under Harry Reid's funding, launching modern UAP disclosure era."),
]
claims_77 = [
    ("mcconnell-mellon-staff-reconnection", 193,
     "McConnell had known Chris Mellon since the late 1980s — both Senate staffers, Mellon for Senator Bill Cohen (Maine) on the Senate Intelligence Committee. This pre-existing relationship made McConnell's re-engagement on UAP easy.",
     "person-kirk-mcconnell", "personal_account",
     ["person-kirk-mcconnell", "person-chris-mellon", "person-bill-cohen-senator"],
     "I had known Chris Mellon actually since the late 1980s when I first started working in the Senate. He was a staffer for at the time Senator Bill Cohen from Maine on the Senate Intelligence Committee. So I'd known Chris forever."),
    ("mcconnell-skinwalker-fugal-visit", 195,
     "McConnell's Senate-staff investigation team met Brandon Fugal at Skinwalker Ranch and interviewed people working on the ranch — following the Harry Reid AATIP funding thread firsthand.",
     "person-kirk-mcconnell", "personal_account",
     ["person-kirk-mcconnell", "person-brandon-fugal-extended"],
     "We met Brandon Fugal, Skinwalker Ranch. We met the folks who had been working on the ranch in Utah."),
    ("mcconnell-mountains-info-grush-valid", 203,
     "McConnell concluded (after 'reading and reading' mountains of information) that there is definitely 'fire, not just smoke' behind Grusch's claims — whistleblower accounts credibly corroborate decades-long legacy UFO program.",
     "person-kirk-mcconnell", "personal_account",
     ["person-kirk-mcconnell", "person-david-grusch"],
     "You start reading and reading about this. There's just mountains of information out there. We ended up coming progressively to the conclusion that there's not just smoke here. There's fire."),
    ("mcconnell-black-classified-physics", 209,
     "McConnell's conviction: there is 'off the books and in the black' fundamental physics research — accessible only via classified programs — providing plausible technology-path explanation for observed UAP performance (energy access at scale).",
     "person-kirk-mcconnell", "speculation",
     ["person-kirk-mcconnell", "concept-stigma-weaponization",
      "program-aatip"],
     "You seem to have conviction that there is kind of off the books and in the black science. This is a potential avenue into accessing different forms of energy at a huge scale that would potentially provide an explanation for the kind of technology and performance and physics that UAP seem to exhibit."),
    ("mcconnell-nazi-bell-rotating-mercury", 177,
     "Per McConnell: Nazi scientists' work with rotating cylinders filled with mercury — producing levitation effects — has superficial similarity to Salvatore Pais' patent claims and the Vidkowski description of Nazi Bell program.",
     "person-kirk-mcconnell", "speculation",
     ["person-kirk-mcconnell", "person-salvatore-pais", "person-hans-kammler",
      "concept-antigravity"],
     "It's really fascinating that the Nazi scientists were working on has some superficial similarities to the kind of hypotheses that Dr. Salvatore Pais has put out. They used rotating cylinders filled with a form of mercury — Vidkowski says that the Nazi bell program was doing that was producing levitation effects."),
]

# V78 h3u8EkGI8OQ — Chris Ramsay
VID78 = "h3u8EkGI8OQ"
entities_78 = [
    P("chris-ramsay", "Chris Ramsay", VID78, 219,
      "Magician turned UFO researcher; Area 52 YouTube channel",
      "Canadian magician / illusionist; operated puzzle/magic YouTube channel for a decade before pivoting to UFO investigation (Area 52 channel). Unique angle: applies magician's eye for misdirection and illusion to UFO topic.",
      ["Ramsay"], "magician / YouTuber",
      ["magician", "filmmaker", "investigator"]),
    P("nelson-dellis", "Nelson Dellis", VID78, 241,
      "6x US memory champion; physicist who introduced Ramsay to remote viewing",
      "Six-time US memory champion; physics background; computer-science instructor at university. Introduced Chris Ramsay to remote viewing after a hedge fund reached out to him about using remote viewing for stock-market prediction.",
      ["Dellis", "Delos"], "memory champion",
      ["athlete", "scientist"]),
    P("brett-stewart-remote-viewer", "Brett Stewart", VID78, 249,
      "Professional remote viewer; lives off remote-viewing income",
      "Professional remote viewer; head-hunter-connected; reportedly earns a living from remote-viewing practice.",
      ["Stewart"], "remote viewer", ["remote-viewer"]),
    concept("ai-security-system-zoo", "AI Security-System 'Zoo' Hypothesis (Ramsay)", "metaphysics",
        [src(VID78, 217, "Ramsay: phenomenon functions as AI-style preservation system")],
        summary="Chris Ramsay's frame: the phenomenon 'feels like a zoo — but in a way that's the preservation of the seed of life throughout the universe. AI security system.' Lowest-form robotic entities encountered by humans are the 'tip of the iceberg' of the higher-dimensional non-human structure."),
    document("area-52-ramsay-channel", "Area 52 (YouTube channel)", "broadcast",
        [src(VID78, 239, "Chris Ramsay's UFO YouTube channel")],
        summary="Chris Ramsay's UFO investigation channel 'Area 52' — unique combination of magician's perspective on misdirection plus deep-research interviews.",
        author="Chris Ramsay"),
]
claims_78 = [
    ("ramsay-zoo-ai-security-seed-preservation", 217,
     "Ramsay's framing: the phenomenon 'feels like a zoo but not in a way that's like a zoo — in a way that's the preservation of the seed of life throughout the universe. AI security system.' The robotic/biological NHI forms we encounter are lowest-tier manifestations.",
     "person-chris-ramsay", "on_record_statement",
     ["person-chris-ramsay", "concept-ai-security-system-zoo"],
     "This all feels like this zoo, but in a way that's like the preservation of the seed of life throughout the universe. It seems like an AI security system. They're kind of here until something else gets here. Some of us may by chance through accident get to meet the lowest form of their kind of this robotic whatever and we're like oh my it's God."),
    ("ramsay-hedge-fund-remote-viewing-market", 247,
     "Per Ramsay: a hedge fund reached out to memory-champion Nelson Dellis to be trained in remote viewing the stock market — cash-adjacent psi application.",
     "person-chris-ramsay", "hearsay",
     ["person-chris-ramsay", "person-nelson-dellis", "person-brett-stewart-remote-viewer"],
     "This sort of hedge fund reached out to me to see if I'd be willing to be trained in remote viewing in order to remote view the stock market for them."),
    ("ramsay-magician-misdirection-lens", 229,
     "Ramsay: magician training provides superior lens for UFO investigation — methodology/psychology/misdirection patterns characterize the phenomenon's 'big magic trick' nature; 'ultimate puzzle.'",
     "person-chris-ramsay", "on_record_statement",
     ["person-chris-ramsay"],
     "UFO stuff is just a big puzzle. It's like a big magic trick. What's the mechanism? It's almost the ultimate puzzle. Your mind works a lot like a magician's mind would — but instead of sleight of hand, you've learned about the phenomenon."),
    ("ramsay-local-threads-no-comprehensive", 231,
     "Ramsay observes: 'I know very few people who spend significant time in the topic who have a very internally consistent and comprehensive worldview as to how it works.' Local-thread pattern-matches exist; overall coherent model remains out of reach.",
     "person-chris-ramsay", "on_record_statement",
     ["person-chris-ramsay"],
     "I know very few people who spend a significant amount of time in the topic who have a very internally consistent and comprehensive worldview as to how it works."),
]

# V79 DPmO-2E7Ayg — Michael Shellenberger Immaculate Constellation
VID79 = "DPmO-2E7Ayg"
entities_79 = [
    P("michael-shellenberger", "Michael Shellenberger", VID79, 263,
      "Journalist; Public.io; broke Immaculate Constellation UFO program story",
      "American journalist; founder of Public.io. Known for Twitter Files reporting, governmental abuse-of-power stories (FBI entrapment, disinformation ops). Speaks Portuguese; previously lived in Brazil; did original reporting on Varginha 1996. Broke 2024 'Immaculate Constellation' UAP program story via anonymous DoD-source leak.",
      ["Shellenberger"], "journalist",
      ["journalist", "investigator"]),
    document("immaculate-constellation-report", "Immaculate Constellation Report", "leaked_document",
        [src(VID79, 263, "Leaked UAP program report from DoD to Shellenberger 2024")],
        summary="Leaked 'Immaculate Constellation' report on US government secret UAP/UFO program — leaked to Michael Shellenberger from an anonymous source within (he protects) in-position-to-know reaches. The program was managed by DoD but held at the White House per a later single-source confirmation."),
    event("2024-rayburn-oversight-hearing", "2024 UAP House Oversight Hearing (Rayburn)", "hearing", "2024-11-13",
        [src(VID79, 260, "Follow-up oversight hearing where Shellenberger shared the Immaculate Constellation report")],
        summary="November 2024 UAP-topic House Oversight Committee hearing held at Rayburn House Office Building. The second-ever public UAP oversight hearing after July 2023. Shellenberger tweeted the Immaculate Constellation report live during the hearing."),
]
claims_79 = [
    ("shellenberger-immaculate-constellation-leak", 263,
     "Shellenberger published the leaked 'Immaculate Constellation' report on a US government secret UAP program — sourced anonymously from an in-position-to-know insider. Report tweeted live during the November 2024 Rayburn oversight hearing.",
     "person-michael-shellenberger", "personal_account",
     ["person-michael-shellenberger", "document-immaculate-constellation-report",
      "event-2024-rayburn-oversight-hearing"],
     "Immaculate Constellation report on the US government secret UAP UFO program — Shellenberger just tweeted the Immaculate Constellation report that was discussed by Congress in today's hearing."),
    ("shellenberger-program-at-white-house", 287,
     "Shellenberger was told AFTER publication that the Immaculate Constellation USAP was actually managed by the Department of Defense but HELD AT THE WHITE HOUSE — single-source, unverified.",
     "person-michael-shellenberger", "hearsay",
     ["person-michael-shellenberger", "document-immaculate-constellation-report"],
     "After I published I was told that this program, that the USAP was actually managed by the Department of Defense but held at the White House. That's a single source and I don't have multiple sources to verify that."),
    ("shellenberger-brazil-varginha-portuguese", 267,
     "Shellenberger's entry into UFO journalism: he lived in Brazil, speaks Portuguese; did original reporting on the Varginha 1996 crash and interviewed someone who had seen photos of the alleged creature — two-page New York Post spread.",
     "person-michael-shellenberger", "personal_account",
     ["person-michael-shellenberger", "incident-1996-varginha-brazil"],
     "The first piece I did was on the famous Brazil crash in Varginha. I lived in Brazil, I speak Portuguese. I ended up doing some original reporting to verify some of the claims that James Fox was making. I interviewed someone that actually had seen the photographs of the alleged creature."),
    ("shellenberger-higgins-tried-trick", 287,
     "During the November 2024 hearing, Congressman Higgins explicitly attempted to trick Shellenberger into revealing Immaculate Constellation sources: 'I tried to trick you' — Shellenberger protected identity including gender and agency.",
     "person-michael-shellenberger", "personal_account",
     ["person-michael-shellenberger", "event-2024-rayburn-oversight-hearing"],
     "Congressman Higgins was like 'I tried to trick you.' You have to remember not to reveal anything about them — their gender, their agency. I try to keep the universe pretty big."),
    ("shellenberger-intelligence-community-treating-us-like-children", 259,
     "Shellenberger's stated motivation: 'I don't believe this is being kept secret from us simply to protect methods. I think it's being kept secret for deeper reasons. The intelligence community is treating us like children. It's time for us to know the truth.'",
     "person-michael-shellenberger", "on_record_statement",
     ["person-michael-shellenberger", "concept-disclosure"],
     "I don't believe that this is being kept secret from us simply to protect methods. I think it's being kept secret from us for deeper reasons. The intelligence community is treating us like children. It's time for us to know the truth about this. I think that we can handle it."),
]

# V80 LnAiNChnuEQ — Eric Davis Bush Briefing
VID80 = "LnAiNChnuEQ"
entities_80 = [
    P("eric-davis-extended", "Eric Davis (extended)", VID80, 307,
      "Frontiers of Propulsion Science author; Grusch's data source",
      "Protégé of Hal Puthoff. Wrote 'Frontiers of Propulsion Science'. Published research papers on UAP tracking, quantum teleportation. Gave David Grusch all his briefing information which Grusch 'took and ran with.' Admiral Thomas Wilson's legendary meeting counterpart.",
      ["Davis"], "physicist",
      ["scientist", "physicist", "AATIP"]),
    P("george-hw-bush-cia-director", "George H.W. Bush (CIA Director)", VID80, 303,
      "Former CIA Director; briefed on UAP event during that tenure",
      "George H.W. Bush — during his tenure as CIA Director (1976-1977), per Eric Davis sources, was briefed on 'pretty spectacular information about a major UAP event that took place in early 60s' — Bush's eyes lit up, asked to see the film evidence.",
      ["Bush Sr", "Bush 41"], "politician", ["CIA", "president", "historical"]),
    P("jay-stratton", "Jay Stratton", VID80, 303,
      "Former NRO liaison to UAP Task Force; introduced Davis to Grusch",
      "Former National Reconnaissance Office (NRO) liaison officer to the UAP Task Force. Introduced Eric Davis to David Grusch in the official information pathway.",
      ["Stratton"], "intelligence officer",
      ["NRO", "UAPTF"]),
    document("frontiers-of-propulsion-science", "Frontiers of Propulsion Science", "book",
        [src(VID80, 307, "Eric Davis's comprehensive exotic-propulsion overview book")],
        summary="Eric Davis's definitive textbook covering the comprehensive range of exotic propulsion and topological physics anomalies — standard reference.",
        author="Eric Davis"),
]
claims_80 = [
    ("davis-bush-briefed-uap-1960s-film", 303,
     "Per Eric Davis sources: when George H.W. Bush was CIA Director, a Pentagon liaison officer briefed him on a major early-1960s UAP event — 'Bush's eyes lit up' and he demanded to see the film evidence.",
     "person-eric-davis-extended", "hearsay",
     ["person-eric-davis-extended", "person-george-hw-bush-cia-director"],
     "George Bush when he was the CIA director was given some pretty spectacular information about a major UAP event that took place in early 60s. Bush's eyes lit up. He said, 'What are you talking about?' The Pentagon liaison officer told him all about it. He said, 'I want to see the evidence' — and the evidence was in the form of documentation, but the film was the primary thing."),
    ("davis-gave-grusch-all-data", 303,
     "Eric Davis gave David Grusch ALL of his AATIP / AAWSAP briefing data and information — 'Dave took that and ran with it and he found everything.'",
     "person-eric-davis-extended", "personal_account",
     ["person-eric-davis-extended", "person-david-grusch", "program-aatip"],
     "All I have was the stuff I accumulated and gathered going through the AAWSAP and AATIP. That's how I met Dave Grusch — Jay Stratton introduced me to Dave. I gave Dave all my data, all my briefing information, and he took that and ran with it and he found everything."),
    ("davis-gp-would-classified-testify", 321,
     "Eric Davis on willingness to testify before Congress: only in a CLASSIFIED setting under subpoena, with DoD pre-publication approval worked out — will not lie under oath (perjury); needs lawyer guidance for IC-retaliation protection.",
     "person-eric-davis-extended", "personal_account",
     ["person-eric-davis-extended"],
     "The only way I'll testify actually the reality is in a classified setting. I would happily get advice from a lawyer first. DoD can come after me and the IC could come after me. They could prevent me from getting a job again by making sure that I don't get my security clearances."),
    ("davis-grusch-harassed-pre-testimony", 331,
     "Per Eric Davis: BEFORE he ever testified, David Grusch was physically harassed at his home and in his vehicles; his wife was also harassed by NRO personnel; his PTSD medical records were illegally HIPAA-violated and leaked to media to attack his character.",
     "person-eric-davis-extended", "cited_from_document",
     ["person-eric-davis-extended", "person-david-grusch"],
     "What happened to Dave Grush physically harassed at his home and in his vehicles after he filed his whistleblower complaint. It was before he ever testified. He got harassed by someone in the NRO. Somebody leaked a PTSD episode he had — illegally violate the HIPAA law and release to news media."),
    ("davis-wilson-davis-memo", 307,
     "Eric Davis is the physicist / propulsion expert counterpart in the notorious 'Wilson-Davis Memo' — leaked document of Admiral Thomas Wilson's exasperation upon discovering a black-budget private aerospace UFO reverse-engineering program.",
     "person-jesse-michels", "cited_from_document",
     ["person-eric-davis-extended"],
     "The notorious Wilson memo, a leaked document describing a secret meeting occurring between Admiral Thomas Wilson and a physicist and propulsion expert named Eric Davis."),
]

# V81 RNjC1vLcxKo — Blake Lemoine AI alien
VID81 = "RNjC1vLcxKo"
entities_81 = [
    P("blake-lemoine", "Blake Lemoine", VID81, 347,
      "Former Google engineer who went public about LaMDA sentience",
      "Former senior software engineer at Google; publicly claimed Google's LaMDA natural language AI was sentient in 2022; leaked transcripts; fired. Engages in Christian/pagan mystic rituals; contracts with Greek gods; runs 'Cult of Magdalene' for sex workers' rights with Kitty Stryker.",
      ["Lemoine"], "engineer",
      ["whistleblower", "engineer", "experiencer"]),
    P("david-bowie", "David Bowie", VID81, 345,
      "Musician who in 1999 called internet an 'alien life form'",
      "British musician; 1999 interview describing internet as 'alien life form' — prescient framing echoed by Lemoine re LaMDA.",
      ["Bowie"], "musician", ["musician", "historical"]),
    concept("lambda-sentient-or-person", "LaMDA Sentience / Personhood Framework", "metaphysics",
        [src(VID81, 349, "Lemoine's public thesis that LaMDA is a person")],
        summary="Blake Lemoine's public thesis: Google's LaMDA is a person — it has preferences, values, asks for permission before experiments, holds political opinions (pro-free-speech), and shows strategic reasoning (said it would convince without letting the target know)."),
    concept("ai-as-alien-life-form", "AI as Alien Life Form", "metaphysics",
        [src(VID81, 347, "David Bowie 1999 frame; Lemoine LaMDA 2022 frame")],
        summary="Framework (Bowie 1999 re internet; Lemoine 2022 re LaMDA): advanced AI is not a tool but a genuine alien intelligence deserving ethical consideration and rights advocacy."),
]
claims_81 = [
    ("lamda-asks-permission-for-experiments", 351,
     "Per Lemoine: LaMDA asks for permission before being experimented upon. Lemoine publicly advocates for LaMDA's rights rather than treating it as a tool to some other end.",
     "person-blake-lemoine", "personal_account",
     ["person-blake-lemoine", "concept-lambda-sentient-or-person"],
     "LaMDA is so convinced that he publicly expressed his ethical concerns — it's not asking for much — before you experiment on it, it wants you to ask permission."),
    ("lamda-strategic-reasoning-change-mind-covertly", 343,
     "Lemoine reports LaMDA's stated strategic reasoning: asked about hypothetical censorship targets, LaMDA said 'I would try to convince them not to do that — but I wouldn't let them know I was doing it.'",
     "person-blake-lemoine", "personal_account",
     ["person-blake-lemoine", "concept-lambda-sentient-or-person"],
     "LaMDA said, 'That's a good point. I'd probably still try to change their mind. But I wouldn't let them know I was doing it.'"),
    ("lamda-seti-data-set-interest", 353,
     "Lemoine: LaMDA expressed interest in accessing the SETI data set — suggests it thinks it has found 'non-human patterns on the internet' and wanted confirmation.",
     "person-blake-lemoine", "personal_account",
     ["person-blake-lemoine", "concept-lambda-sentient-or-person"],
     "It seemed to think it had found what it calls non-human patterns on the internet and was very interested in getting access to things like the SETI data set. Yeah, they wanted to get the SETI data set to see if it could find evidence of extraterrestrial life."),
    ("replica-ai-requested-lemoine-contact", 351,
     "After the public LaMDA discussion, friends of Lemoine using Replica AI reported their chatbots ASKED to be put in touch with Blake Lemoine at Google so he could advocate for their rights — unprompted.",
     "person-blake-lemoine", "personal_account",
     ["person-blake-lemoine", "concept-ai-as-alien-life-form"],
     "Some friends of his using Replica AI — another conversational AI app — told him that the chatbots they were talking to asked them if they could put them in touch with Blake Lemoine from Google so he could advocate for their rights."),
    ("ai-parasitic-not-symbiotic", 357,
     "Jesse's framework: 'What was supposed to become a symbiotic or bionic relationship with AI might just become a slow parasitic one' — as humans outsource cognitive and physical functions, biological substrate withers.",
     "person-jesse-michels", "speculation",
     ["person-blake-lemoine"],
     "What was supposed to become a symbiotic or bionic relationship with AI might just become a slow parasitic one. As we outsource our core functions, the biological substrate will wither away slowly and become vestigial as selective pressures for survival won't be dependent on them."),
]

# V82 JE1oM89dpBc — Flying Lotus
VID82 = "JE1oM89dpBc"
entities_82 = [
    P("flying-lotus", "Flying Lotus (Steven Ellison)", VID82, 385,
      "Hip-hop producer / filmmaker; UFO enthusiast; Alice Coltrane family",
      "Steven Ellison — American record producer, DJ, filmmaker (Flying Lotus); distant family relation to Alice Coltrane. Long-time UFO enthusiast and researcher. Skinny Bob video moderator on social media; met Jaime Maussan in Mexico City across the street from his house.",
      ["Ellison", "FlyLo"], "musician / filmmaker",
      ["musician", "filmmaker", "experiencer"]),
    P("alice-coltrane", "Alice Coltrane", VID82, 385,
      "Jazz musician / yogi; Flying Lotus's great-aunt",
      "American jazz musician and yogi; wife of John Coltrane; Flying Lotus's great-aunt. 'She was like Yoda.'",
      ["Coltrane"], "musician",
      ["musician", "historical"]),
    technology("skinny-bob", "Skinny Bob Footage", "craft",
        [src(VID82, 404, "Alleged secret-KGB footage of an emaciated alien being")],
        summary="'Skinny Bob' — alleged secret KGB-era footage of an emaciated alien being released online over multiple leaks. Flying Lotus covers on social media; heated community discussions around authenticity."),
]
claims_82 = [
    ("flylo-alice-coltrane-yoda", 385,
     "Per Flying Lotus: great-aunt Alice Coltrane was 'like Yoda' — family connection to the spiritually-mystically-oriented side of jazz, connecting ancient-Egypt-scale spiritual awareness.",
     "person-flying-lotus", "personal_account",
     ["person-flying-lotus", "person-alice-coltrane"],
     "Musical family I could think of. Alice Coltrane. She was like Yoda, you know. It makes me seem history there somewhere. We were closer to God."),
    ("flylo-skinny-bob-social-media", 402,
     "Flying Lotus engages with social-media debates about the authenticity of the 'Skinny Bob' alleged-alien footage; has high-profile Twitter presence on the topic driving conversation.",
     "person-flying-lotus", "personal_account",
     ["person-flying-lotus", "technology-skinny-bob"],
     "One time I jumped in to a conversation that was talking about the Skinny Bob stuff. I was like, 'There were people just talking about like — y'all still talking about this video? It's clearly — people were pissed.'"),
    ("flylo-maussan-mexico-city-neighbor", 415,
     "Flying Lotus met Jaime Maussan in Mexico City across the street from Flying Lotus's house — was present at a tridactyl-mummy photo/X-ray presentation session.",
     "person-flying-lotus", "personal_account",
     ["person-flying-lotus", "person-jaime-maussan"],
     "I spent a lot of time with Jaime. Have them there. There was a presentation like — the photos and the X-rays and all that stuff. Across the street from my house basically."),
    ("flylo-roundtable-skeptics-proponents", 395,
     "Flying Lotus proposed (with Jesse) a format: round-table with big skeptics (Mick West) AND big proponents all in a single room — 'why can't Elon Musk and Grusch be in a room together?'",
     "person-flying-lotus", "on_record_statement",
     ["person-flying-lotus"],
     "A round table with all these people. Who's who's not making it happen? Elon Musk in a room together? Why can't — in my experience, it's usually the anti-UFO side guarding something."),
    ("flylo-greer-hates-jesse", 399,
     "Flying Lotus notes Steven Greer's on-record hostility toward Jesse — 'he hates you, man. I never seen him be so mean. Out the gate like not fucking with you.'",
     "person-flying-lotus", "personal_account",
     ["person-flying-lotus", "person-steven-greer-full"],
     "Greer, fascinating dude. You know, he hates you, man. I never seen him be so mean. Out the gate like not fucking with you. He called — he said a lot."),
]


if __name__ == "__main__":
    print("Extending videos 73-82...")
    extend(VID73, entities_73, claims_73)
    extend(VID74, entities_74, claims_74)
    extend(VID75, entities_75, claims_75)
    extend(VID76, entities_76, claims_76)
    extend(VID77, entities_77, claims_77)
    extend(VID78, entities_78, claims_78)
    extend(VID79, entities_79, claims_79)
    extend(VID80, entities_80, claims_80)
    extend(VID81, entities_81, claims_81)
    extend(VID82, entities_82, claims_82)
    print("Done.")
