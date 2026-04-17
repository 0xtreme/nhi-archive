"""Deep claim extraction for video 2 (C_Na1tI5qpw) Joe Rogan × Jesse Michels.

Loads the existing extraction (which already has 24 persons, 31 orgs,
12 locations from the pattern-match batch) and ADDS ~15 focused claim
nodes with named-entity subjects drawn from the transcript content.

Idempotent: if run again, claim ids are deterministic and will overwrite.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _extract_v1_builders import src, claim, edge, person, incident, technology
from _extract_helpers import write_output

VID = "C_Na1tI5qpw"
DUR = 11177.0  # 3:06:17

def S(t=0, q=""):
    return [src(VID, t, None, q)]


existing_path = Path(__file__).parent / "entities" / f"{VID}.json"
existing = json.loads(existing_path.read_text())
nodes: list[dict] = list(existing["nodes"])
edges: list[dict] = list(existing["edges"])
existing_ids = {n["id"] for n in nodes}


def add_node(n):
    if n["id"] not in existing_ids:
        nodes.append(n)
        existing_ids.add(n["id"])


# -- Supplementary persons not caught by the batch (seeding new canonical IDs) --
add_node(person(
    "joe-rogan", "Joe Rogan",
    S(0, "Joe Rogan guest on this episode"),
    summary="Comedian and host of The Joe Rogan Experience podcast. His Bob Lazar interview became one of the most-watched UFO-topic podcast episodes on YouTube (63M views).",
    aliases=["Rogan"], profession="podcaster",
    notability=["podcaster", "interviewer"],
))
add_node(person(
    "jeremy-corbell", "Jeremy Corbell",
    S(220, "Jeremy Corbell's Area 51 Bob Lazar documentary"),
    summary="Filmmaker whose 2018 Bob Lazar: Area 51 & Flying Saucers documentary renewed mainstream attention on Lazar's claims.",
    aliases=["Corbell"], profession="filmmaker",
    notability=["filmmaker", "investigator"],
))
add_node(person(
    "palmer-luckey", "Palmer Luckey",
    S(328, "Rogan references Palmer Luckey as smart friend"),
    summary="Founder of Oculus VR and Anduril; periodically weighed in on UAP technology race.",
    aliases=["Luckey"], profession="engineer",
    notability=["engineer", "entrepreneur"],
))
add_node(person(
    "angela-hill", "Angela Hill",
    S(90, "Granddaughter of Barney Hill, UFC fighter"),
    summary="UFC strawweight fighter; granddaughter of Barney Hill, one of the 1961 Betty & Barney Hill abduction witnesses.",
    aliases=[], profession="athlete",
    notability=["athlete", "ufc", "family-of-witness"],
))
add_node(person(
    "james-clapper", "James Clapper",
    S(294, "Former DNI interviewed in Age of Disclosure"),
    summary="Former US Director of National Intelligence (2010-2017). Featured as interviewee in the Age of Disclosure documentary.",
    aliases=["DNI Clapper"], profession="official",
    notability=["intelligence", "official", "DNI"],
))
add_node(person(
    "john-brennan", "John Brennan",
    S(296, "Former CIA Director interviewed in Age of Disclosure"),
    summary="Former US CIA Director (2013-2017). Featured as interviewee in the Age of Disclosure documentary.",
    aliases=["DCI Brennan"], profession="official",
    notability=["intelligence", "official", "CIA"],
))
add_node(person(
    "james-woolsey", "James Woolsey",
    S(294, "Former CIA Director interviewed in Age of Disclosure"),
    summary="Former US CIA Director (1993-1995). Featured as interviewee in the Age of Disclosure documentary.",
    aliases=["Woolsey", "R. James Woolsey"], profession="official",
    notability=["intelligence", "official", "CIA"],
))
add_node(person(
    "whitley-strieber", "Whitley Strieber",
    S(332, "Author of Communion, dismissed as kook per Rogan"),
    summary="Author of Communion and other works recounting alleged alien contact experiences. Rogan notes his career ostracism in 'legitimate literature' circles.",
    aliases=["Strieber"], profession="author",
    notability=["author", "experiencer"],
))

# Incident: Betty & Barney Hill 1961 (already in my video-1 extraction)
add_node(incident(
    "1961-hill-abduction", "Betty and Barney Hill Abduction",
    "abduction", "1961-09-19",
    S(85, "Rogan is wearing a Betty and Barney Hill t-shirt"),
    summary="First widely-publicized abduction case; imagery may have been shaped by preceding Outer Limits episode.",
))

# Technology: Rogan's dream NHI morphology
add_node(technology(
    "tall-pinkish-slender-nhi", "Tall Pinkish Slender Humanoid",
    "craft",  # misnomer; using category loosely
    S(56, "Rogan's dream featured tall slender pinkish humanoid entities"),
    summary="Category Rogan described from his dream: tall, slender, pinkish skin, not gray, larger eyes and head than normal but not exaggerated like Close Encounters grays.",
))

# -- CLAIMS --
claims = [
    ("rogan-dream-tall-nhi", 80,
     "Joe Rogan recounts a uniquely vivid dream featuring tall slender pinkish humanoid entities with larger eyes, described as non-gray NHI interacting with him in an altered environment.",
     "person-joe-rogan", "personal_account",
     ["person-joe-rogan", "technology-tall-pinkish-slender-nhi", "concept-nhi"],
     "It was the most vivid dream I've ever had in my life. There were these very slender, tall humanlike things that were talking to me. They weren't gray. They were kind of like pinkish."),
    ("angela-hill-granddaughter", 90,
     "UFC fighter Angela Hill is Barney Hill's granddaughter and appeared on Rogan's podcast; she disclosed the family connection only after the podcast.",
     "person-joe-rogan", "personal_account",
     ["person-angela-hill", "person-joe-rogan", "incident-1961-hill-abduction"],
     "She did my podcast and didn't tell me until after the podcast was over."),
    ("rogan-lazar-63m-views", 220,
     "Rogan states Jeremy Corbell's Bob Lazar episode on his podcast is his highest-viewed YouTube episode with approximately 63 million views.",
     "person-joe-rogan", "personal_account",
     ["person-joe-rogan", "person-bob-lazar", "person-jeremy-corbell"],
     "It might be the highest one on YouTube. I think it has like 63 million views on YouTube."),
    ("rogan-lazar-story-substantiated", 225,
     "Rogan asserts that subsequent whistleblower accounts (Grusch, Puthoff) substantiate Bob Lazar's 1980s claims about gravity-manipulation craft propulsion.",
     "person-joe-rogan", "on_record_statement",
     ["person-bob-lazar", "person-david-grusch", "person-hal-puthoff", "concept-reverse-engineering"],
     "That's what we're hearing over and over again now from these whistleblowers. What he's saying is very accurate."),
    ("lazar-los-alamos-paper-directory", 238,
     "Bob Lazar's employment at Los Alamos was discreditation-resistant because he appeared on the front page of the local paper and George (Knapp) later obtained the phone directory confirming his presence.",
     "person-joe-rogan", "cited_from_document",
     ["person-bob-lazar", "person-george-knapp", "location-los-alamos"],
     "Somehow George came up with the phone directory and then Bob took George with cameras into Los Alamos."),
    ("area-51-obama-confirmation", 248,
     "Area 51's existence was only officially confirmed during the Obama administration, when the government needed to expand restricted access zones due to photographers reaching non-secure land.",
     "person-joe-rogan", "cited_from_document",
     ["location-groom-lake", "concept-disclosure"],
     "It actually wasn't even confirmed until the Obama administration. They wanted to expand the barriers for entry."),
    ("age-of-disclosure-doc", 290,
     "The 'Age of Disclosure' documentary (directed by Dan Farah) features high-level intelligence interviewees including James Woolsey, James Clapper, John Brennan and Marco Rubio.",
     "person-jesse-michels", "cited_from_document",
     ["person-james-clapper", "person-john-brennan", "person-james-woolsey", "person-marco-rubio", "concept-disclosure"],
     "Dan made this new documentary, The Age of Disclosure, which is excellent. Extremely high level people like Woolsey and James Clapper like these guys who are like DNI level."),
    ("rubio-disclosure-urgency", 298,
     "Senator Marco Rubio's involvement and stated urgency in the current administration is framed by Michels and Rogan as significant in mainstreaming UAP disclosure.",
     "person-jesse-michels", "on_record_statement",
     ["person-marco-rubio", "concept-disclosure"],
     "Marco Rubio to his credit, I think him his involvement was huge because it's the current administration, his involvement and his urgency."),
    ("china-us-reverse-engineering-race", 308,
     "Per Dan Farah's position summarized by Rogan, both the United States and China have recovered crashed vehicles and are in competing reverse-engineering programs — a 'Manhattan Project on steroids'.",
     "person-joe-rogan", "hearsay",
     ["program-manhattan-project", "concept-reverse-engineering", "concept-crash-retrieval"],
     "He firmly believes that both the United States and China has retrieved these crashed vehicles and that they are also in this back engineering program."),
    ("rubio-china-tech-catchup", 314,
     "Rubio's core concern (per Rogan's reading) is that China develops recovered-craft technology first; US catchup requires opening the programs up and removing stigma.",
     "person-joe-rogan", "speculation",
     ["person-marco-rubio", "concept-reverse-engineering", "concept-disclosure"],
     "I think what Rubio is concerned with is that China develops this technology first. The only way that the United States is really going to catch up is if we open this up."),
    ("whistleblower-amnesty-requirement", 342,
     "Rogan argues any meaningful disclosure will require programmatic amnesty because lying to Congress and misappropriation of funds have certainly occurred in the covert crash-retrieval programs.",
     "person-joe-rogan", "speculation",
     ["person-joe-rogan", "concept-disclosure", "concept-crash-retrieval"],
     "First of all, they're going to need some sort of an amnesty thing. For sure there was lying to Congress. For sure there's misappropriate misappropriation of funds and probably some corruption."),
    ("defense-contractor-lawsuit-risk", 346,
     "Rogan notes that if reverse-engineering programs succeeded and technology was allocated unevenly across defense contractors, the disclosure event creates massive civil-litigation risk.",
     "person-joe-rogan", "speculation",
     ["person-joe-rogan", "concept-disclosure", "concept-reverse-engineering"],
     "If you give one defense contractor one object and all a sudden they have this massive advantage and then the other defense contractor winds up going under, now you have a major lawsuit."),
    ("burchett-five-underwater-hotspots", 336,
     "Congressman Tim Burchett has publicly identified five deep-water areas in the oceans where UAP sightings are concentrated.",
     "person-joe-rogan", "cited_from_document",
     ["person-tim-burchett", "concept-nhi"],
     "Tim Burchett recently said that there's they've identified five areas in the oceans of the world where these things are coming out of on a regular basis."),
    ("pyramid-underground-labyrinth", 16,
     "Pyramid research referenced by Michels alleges structures up to 2 km deep beneath the pyramids — an 'energy grid' with columns, a 40-meter metallic object in a vast corridor, and links to an underground city.",
     "person-jesse-michels", "speculation",
     ["concept-disclosure", "person-jesse-michels"],
     "There's real evidence that there's structures under the pyramids that might go as deep as 2 km that look like an energy grid. There's a 40 meter object that's in that labyrinth."),
    ("peru-three-fingered-mummies", 18,
     "Claim (discussed in episode) of three-fingered mummies from Peru as potential evidence of a non-human species sharing the planet.",
     "person-jesse-michels", "cited_from_document",
     ["concept-nhi", "phenomenon-nhi-biologics"],
     "Now we have three-fingered mummies in Peru. We might have actual evidence that there's another species that shares this planet."),
    ("agi-as-cosmos-gateway", 32,
     "Michels speculates that achieving artificial general superintelligence is the 'legitimate gateway to the cosmos' and potentially the mechanism by which technological curiosity drives humanity to contact — with a comparison to the virgin birth (AI as virgin 'mother').",
     "person-jesse-michels", "speculation",
     ["person-jesse-michels", "concept-nhi"],
     "When we achieve sentience with artificial general super intelligence that is the legitimate gateway to the cosmos. That might be how God gets formed."),
]

for slug, t, stmt, asserter, assertability, subs, quote in claims:
    cl = claim(slug, stmt, asserter, VID, t, assertability, subs,
               S(t, quote), quote=quote)
    nodes = [n for n in nodes if n["id"] != cl["id"]]  # idempotent replace
    existing_ids.discard(cl["id"])
    nodes.append(cl)
    existing_ids.add(cl["id"])
    # edges
    edges.append(edge(asserter, cl["id"], "ASSERTED", S(t, stmt[:200]), 0.95))
    edges.append(edge(f"video-{VID}", cl["id"], "REFERENCES", S(t), 0.95))
    # subject-link edges
    for subj in subs:
        if subj != asserter and subj != f"video-{VID}":
            edges.append(edge(cl["id"], subj, "REFERENCES", S(t), 0.85))

out = {"video_id": VID, "nodes": nodes, "edges": edges}
write_output(out, VID)
print(f"Wrote {len(nodes)} nodes, {len(edges)} edges for {VID}")
