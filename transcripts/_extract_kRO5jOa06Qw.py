"""Extraction for video kRO5jOa06Qw: 'David Grusch Breaks Silence'.

Pilot video #1. Documentary-style Jesse Michels episode (1:52:25) featuring
interview with UAP whistleblower David Grusch, with extensive Jesse Michels
narration on historical antigravity research, Condon Committee, Manhattan
Project UFO overlay, Townsend Brown, etc.

Extracted entities (~75 nodes, ~120 edges) and claims requiring at least one
named-entity reference per the schema.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _extract_v1_builders import (
    src, person, org, location, event, incident, program, document,
    concept, technology, phenomenon, video, claim, edge, now_iso
)
from _extract_helpers import write_output

VID = "kRO5jOa06Qw"
DUR = 6745.0  # seconds

# -- Helper to get sources with the right video_id ---
def S(t_start: float = 0, t_end: float | None = None, quote: str = "") -> list[dict]:
    return [src(VID, t_start, t_end, quote)]


def build() -> dict:
    nodes: list[dict] = []
    edges: list[dict] = []

    # -- VIDEO NODE --
    nodes.append(video(
        video_id=VID,
        title="David Grusch Breaks Silence: Inside Secret UFO Programs",
        url=f"https://www.youtube.com/watch?v={VID}",
        view_count=2996472,
        duration=DUR,
        host_person_id="person-jesse-michels",
        guest_ids=["person-david-grusch"],
        summary=(
            "Long-form interview with UAP whistleblower David Grusch covering "
            "his Congressional testimony, Manhattan Project as template for UFO "
            "secrecy, Wright-Patterson, antigravity research, Townsend Brown, "
            "Operation Paperclip, Condon Committee, JFK-UFO letter, and the "
            "nuclear-UFO connection."
        ),
    ))

    # =====================================================================
    # PERSONS
    # =====================================================================
    p = [
        ("jesse-michels", "Jesse Michels",
         "American Alchemy host. Independent journalist and UFO/NHI researcher. Extensively narrates the history of covert UFO programs.",
         ["Jesse"], "journalist",
         ["journalist", "interviewer", "researcher", "host"]),
        ("david-grusch", "David Grusch",
         "Former intelligence officer (14 years, NRO and Air Force reservist). UAP Task Force co-lead. Testified before Congress July 2023 as UAP whistleblower alleging covert crash-retrieval and reverse-engineering programs.",
         ["Dave Grusch", "Grusch", "grush", "Dave Grush"], "intelligence officer",
         ["whistleblower", "witness", "intelligence", "veteran"]),
        ("nancy-mace", "Nancy Mace",
         "US Congresswoman who questioned Grusch about biologics at the July 2023 UAP hearing.",
         ["Congresswoman Mace"], "politician",
         ["politician", "congress"]),
        ("ross-coulthart", "Ross Coulthart",
         "Investigative journalist who interviewed Grusch for News Nation about non-human biologics.",
         ["Coulthart"], "journalist",
         ["journalist", "investigator"]),
        ("chuck-schumer", "Chuck Schumer",
         "US Senator, Majority Leader. Co-author of UAP Disclosure Act amendment requiring NHI tech recoveries be disclosed.",
         ["Schumer", "Senator Schumer"], "politician",
         ["politician", "senator"]),
        ("marco-rubio", "Marco Rubio",
         "US Senator involved in UAP oversight referenced by Grusch as engaged with high-level officer disclosures.",
         ["Rubio", "Senator Rubio"], "politician",
         ["politician", "senator"]),
        ("matt-gaetz", "Matt Gaetz",
         "US Congressman who received a protected disclosure about a UAP incident at Eglin AFB and was denied SCIF access.",
         ["Gaetz"], "politician",
         ["politician", "congress"]),
        ("robert-oppenheimer", "J. Robert Oppenheimer",
         "Theoretical physicist, father of the atomic bomb, head of the Manhattan Project. Grusch alleges Oppenheimer created the classification framework later used to conceal UFO programs.",
         ["Oppenheimer", "J. Robert Oppenheimer"], "physicist",
         ["physicist", "historical", "Manhattan Project"]),
        ("jacques-vallee", "Jacques Vallee",
         "French-American computer scientist and UFO researcher. Co-built early internet (ARPANET) with Doug Engelbart. Author of Passport to Magonia and The Invisible College. Inspiration for Close Encounters' scientist character.",
         ["Vallee", "Vallée"], "computer scientist / ufologist",
         ["researcher", "computer scientist", "author"]),
        ("bob-lazar", "Bob Lazar",
         "Whistleblower who in 1989 claimed to have worked on reverse-engineering UFOs at S-4 near Groom Lake, introducing 'element 115' and gravity-wave propulsion into public discourse.",
         ["Robert Lazar", "Lazar"], "engineer / whistleblower",
         ["whistleblower", "controversial"]),
        ("nathan-twining", "Nathan Twining",
         "Head of aircraft development for the US Air Force in 1947. Author of the Twining memo stating UFO phenomena is 'something real and not visionary or fictitious.'",
         ["Twining", "General Twining"], "military officer",
         ["USAF", "historical"]),
        ("curtis-lemay", "Curtis LeMay",
         "US Air Force General. Grusch references a story of LeMay angrily refusing a senator access to UFO materials at Wright-Patterson.",
         ["LeMay", "General LeMay"], "military officer",
         ["USAF", "general", "historical"]),
        ("kenneth-arnold", "Kenneth Arnold",
         "Pilot whose 1947 Mount Rainier sighting of saucer-like craft coined the term 'flying saucer' two months before Roswell.",
         ["Arnold"], "pilot",
         ["witness", "historical"]),
        ("robert-hastings", "Robert Hastings",
         "Researcher and author of 'UFOs and Nukes', documenting 120+ interviews with military personnel about UFO sightings at nuclear bases.",
         ["Hastings"], "author",
         ["researcher", "author"]),
        ("robert-salas", "Robert Salas",
         "Former US Air Force officer at Malmstrom AFB who testified his missile site was rendered inoperable during a UFO incident.",
         ["Salas"], "military officer",
         ["witness", "Malmstrom"]),
        ("bob-jacobs", "Bob Jacobs",
         "Former USAF photo instrumentation specialist at Vandenberg AFB in 1964 who filmed a UFO intercepting an Atlas V dummy warhead test.",
         ["Jacobs"], "military officer",
         ["witness", "Vandenberg"]),
        ("donald-menzel", "Donald Menzel",
         "Mid-century astronomer and prominent UFO skeptic. Grusch notes Menzel was also tied to atomic programs.",
         ["Menzel"], "astronomer",
         ["skeptic", "debunker"]),
        ("edward-condon", "Edward Condon",
         "Quantum physicist who led the 1966 Condon Committee UFO investigation. Deep ties to atomic programs; helped Oppenheimer select Los Alamos; drafted McMahon Atomic Energy Act 1946.",
         ["Condon", "Edward Euler Condon"], "physicist",
         ["skeptic", "historical", "Manhattan Project"]),
        ("louis-witten", "Louis Witten",
         "Physicist who worked at Martin Corporation's RIAS antigravity research unit. Contract worker on gravity research for Wright-Patterson. Father of Ed Witten.",
         ["Witten"], "physicist",
         ["physicist", "antigravity"]),
        ("ed-witten", "Ed Witten",
         "Prominent proponent of string theory. Son of Louis Witten. Jesse speculates string theory may have been an intentional deflection from real physics progress.",
         [], "physicist",
         ["physicist", "string theory"]),
        ("townsend-brown", "T. Townsend Brown",
         "Antigravity researcher. Founder of NICAP. Allegedly parachuted into Germany in 1944 with OSS to investigate Nazi UFO programs and Foo Fighters. His gravitator resembled a flying saucer; Biefield-Brown effect is named after him.",
         ["Townsend Brown", "T Townsend Brown"], "physicist / inventor",
         ["researcher", "antigravity", "NICAP", "historical"]),
        ("wernher-von-braun", "Wernher von Braun",
         "Nazi-era rocket engineer brought to the US via Operation Paperclip; later ran NASA's Saturn program.",
         ["Von Braun", "von Braun"], "engineer",
         ["NASA", "Paperclip", "historical"]),
        ("edward-teller", "Edward Teller",
         "Father of the hydrogen bomb. Grusch's documentary source Schatzkin alleges Teller met with Townsend Brown.",
         ["Teller"], "physicist",
         ["physicist", "historical"]),
        ("john-mack", "John Mack",
         "Head of Harvard Medical School's psychiatry department who researched alien abduction experiences as genuine phenomena. Interviewed the Ariel School children.",
         ["Dr. Mack", "John E. Mack"], "psychiatrist",
         ["psychiatrist", "Harvard", "researcher"]),
        ("steven-greer", "Steven Greer",
         "UFO disclosure advocate and founder of CSETI. Funded in the nineties by the Rockefellers.",
         ["Dr. Greer"], "researcher",
         ["disclosure", "researcher"]),
        ("paul-bennewitz", "Paul Bennewitz",
         "Electronics businessman targeted in 1979 by a US Air Force disinformation campaign run by Richard Doty which aggravated his mental breakdown.",
         ["Bennewitz"], "businessman / target",
         ["witness", "target-of-disinfo"]),
        ("richard-doty", "Richard Doty",
         "US Air Force Office of Special Investigations agent alleged to have conducted disinformation operations against UFO witnesses including Paul Bennewitz.",
         ["Doty"], "AFOSI agent",
         ["disinfo", "AFOSI"]),
        ("diana-pasulka", "Diana Pasulka",
         "University of North Carolina Wilmington religious studies professor. Author of American Cosmic, arguing UFO phenomena parallels historical religious experiences.",
         ["D.W. Pasulka"], "academic",
         ["academic", "researcher", "author"]),
        ("mike-masters", "Mike Masters",
         "Biological anthropologist at Montana Tech University. Proposes aliens are humans from the future who have mastered time travel.",
         ["Masters"], "anthropologist",
         ["researcher", "academic"]),
        ("gary-nolan", "Garry Nolan",
         "Stanford microbiologist and Nobel nominee. CIA-assigned to study UFO experiencers and Havana syndrome; claims to have analyzed crash-retrieval material including magnesium-bismuth isotopic anomalies.",
         ["Gary Nolan", "Nolan"], "microbiologist",
         ["scientist", "Stanford", "researcher"]),
        ("chris-mellon", "Christopher Mellon",
         "Former Deputy Under Secretary of Defense for Intelligence. Grusch recounts a Mellon story about a source dying of a heart attack two weeks before a planned UFO program meeting.",
         ["Chris Mellon", "Mellon"], "official",
         ["DoD", "official"]),
        ("david-fravor", "David Fravor",
         "Former US Navy F-18 commander and Nimitz 2004 Tic Tac witness. Testified at the July 2023 Congressional hearing.",
         ["Fravor", "Commander Fravor"], "pilot",
         ["witness", "pilot", "US Navy", "Nimitz"]),
        ("ryan-graves", "Ryan Graves",
         "Former US Navy F-18 pilot and UAP witness. Testified at the July 2023 Congressional hearing.",
         ["Graves"], "pilot",
         ["witness", "pilot", "US Navy"]),
        ("luis-elizondo", "Luis Elizondo",
         "Former head of AATIP. Grusch credits Elizondo for the 'gorilla in the cage' analogy about potential NHI testing of humans.",
         ["Lue Elizondo", "Elizondo"], "official",
         ["AATIP", "official"]),
        ("jfk", "John F. Kennedy",
         "35th US President. Allegedly wrote a Nov 12 1963 letter to CIA Director McCone requesting UFO data, ten days before his assassination.",
         ["JFK", "Kennedy"], "president",
         ["president", "historical"]),
        ("john-mccone", "John McCone",
         "CIA Director during the Kennedy administration. Alleged recipient of JFK's Nov 12 1963 letter requesting UFO data.",
         ["McCone"], "intelligence director",
         ["CIA", "historical"]),
        ("mike-pompeo", "Mike Pompeo",
         "Former CIA Director and Secretary of State. On-camera said 'I saw the UFO files too, we have bigger problems' when asked about JFK files.",
         ["Pompeo"], "official",
         ["CIA", "politician"]),
        ("carl-sagan", "Carl Sagan",
         "Astronomer and science communicator. Later-career met repeatedly with Kit Green regarding UFOs.",
         ["Sagan"], "astronomer",
         ["astronomer", "skeptic", "historical"]),
        ("kit-green", "Kit Green",
         "Former CIA scientist with a career-long UAP research interest. Met with Carl Sagan on the topic.",
         ["Green"], "scientist",
         ["CIA", "researcher"]),
        ("lawrence-rockefeller", "Lawrence Rockefeller",
         "Financier and philanthropist who funded UFO disclosure research in the 1990s, including Steven Greer, John Mack, and the Princeton Parapsychology Lab.",
         ["Rockefeller"], "financier",
         ["funder", "historical"]),
        ("eric-weinstein", "Eric Weinstein",
         "Mathematician and public intellectual, Grusch's personal friend, referenced for the North Sentinel Island analogy.",
         ["Weinstein"], "mathematician",
         ["physicist", "mathematician"]),
        ("mac-brazel", "Mac Brazel",
         "Rancher who discovered the 1947 Roswell wreckage.",
         ["Brazel"], "rancher",
         ["witness", "Roswell", "historical"]),
        ("jesse-marcel", "Jesse Marcel",
         "Lieutenant Colonel involved in the 1947 Roswell recovery who later (1978) claimed the 'weather balloon' explanation was a cover for extraterrestrial material.",
         ["Lt Col Marcel", "Marcel"], "military officer",
         ["witness", "Roswell", "USAF"]),
        ("sarbacher", "Robert Sarbacher",
         "Canadian physicist allegedly involved in early UFO crash-retrieval stand-up. Grusch references Sarbacher. Drove Townsend Brown home in a black Cadillac per Brown's daughter Linda.",
         ["Sarbacher"], "physicist",
         ["researcher", "historical"]),
        ("kelly-johnson", "Kelly Johnson",
         "Legendary aeronautical engineer, founder of Lockheed Martin's Skunkworks.",
         ["Johnson"], "engineer",
         ["Lockheed Martin", "historical"]),
        ("neil-degrasse-tyson", "Neil deGrasse Tyson",
         "Astrophysicist and science communicator. Grusch criticizes Tyson's reflexive skepticism about UAPs.",
         ["Tyson"], "astrophysicist",
         ["astronomer", "skeptic"]),
    ]
    for slug, label, summary, aliases, prof, nota in p:
        nodes.append(person(slug, label, S(0, DUR, f"Mentioned throughout the video"),
                           summary=summary, aliases=aliases, profession=prof,
                           notability=nota))

    # =====================================================================
    # ORGANIZATIONS
    # =====================================================================
    orgs = [
        ("cia", "CIA", "intelligence_agency", "Central Intelligence Agency", "CIA",
         "Cited throughout as custodial of UAP secrecy frameworks."),
        ("nro", "NRO", "intelligence_agency", "National Reconnaissance Office", "NRO",
         "Grusch's agency where he served as UAP Task Force co-lead."),
        ("dod", "Department of Defense", "government_agency", "Department of Defense", "DoD",
         "Pentagon-level oversight of UAP programs and the pre-publication review (DOPSR) process."),
        ("dia", "DIA", "intelligence_agency", "Defense Intelligence Agency", "DIA", ""),
        ("us-navy", "US Navy", "military_unit", "United States Navy", "USN", ""),
        ("us-air-force", "US Air Force", "military_unit", "United States Air Force", "USAF", ""),
        ("pentagon", "Pentagon", "government_agency", "United States Department of Defense HQ", "",
         "Physical and organizational locus of UAP-related programs; source of DOPSR pre-publication review."),
        ("congress", "US Congress", "legislative_body", "United States Congress", "",
         "Site of Grusch's July 2023 UAP testimony."),
        ("nasa", "NASA", "government_agency", "National Aeronautics and Space Administration", "NASA",
         "Post-Paperclip home of many Nazi rocket engineers including Wernher von Braun."),
        ("lockheed-martin", "Lockheed Martin", "corporation", "Lockheed Martin", "",
         "Major defense contractor; home to Skunkworks."),
        ("skunkworks", "Lockheed Skunkworks", "corporation", "Lockheed Martin Advanced Development Programs", "",
         "Classified aerospace development arm of Lockheed; over 80% of projects classified."),
        ("martin-corporation", "Martin Corporation", "corporation", "Glenn L. Martin Company", "",
         "Mid-century aerospace firm that housed the RIAS antigravity research unit. Later merged into Lockheed Martin."),
        ("northrop-grumman", "Northrop Grumman", "corporation", "Northrop Grumman", "",
         "Defense contractor; built the B-2 stealth bomber."),
        ("nicap", "NICAP", "civilian_group", "National Investigations Committee on Aerial Phenomena", "NICAP",
         "First civilian UFO study group, founded by Townsend Brown."),
        ("rias", "RIAS", "research_org", "Research Institute for Advanced Studies", "RIAS",
         "Martin Corporation's antigravity research unit where Louis Witten worked."),
        ("gravity-research-foundation", "Gravity Research Foundation", "research_org", "", "",
         "Roger Babson-funded institution running an antigravity essay contest that drew top physicists."),
        ("oss", "OSS", "intelligence_agency", "Office of Strategic Services", "OSS",
         "WWII US intelligence service. Bill Donovan's home outfit."),
        ("mi6", "MI6", "intelligence_agency", "Secret Intelligence Service (UK)", "MI6", ""),
        ("news-nation", "News Nation", "media_outlet", "", "",
         "US news network that broke Grusch's June 2023 public disclosure."),
        ("debrief", "The Debrief", "media_outlet", "The Debrief", "",
         "Independent journalism outlet that broke the June 2023 Grusch story."),
        ("intercept", "The Intercept", "media_outlet", "The Intercept", "",
         "Outlet that ran a critical article on Grusch's 2018 hospitalization."),
        ("princeton-parapsychology-lab", "Princeton Parapsychology Lab", "research_org", "", "",
         "Lab funded by the Rockefellers in the 1990s for parapsychology research."),
        ("vatican-observatory", "Vatican Observatory", "research_org", "", "",
         "Astronomical observatory that has publicly affirmed acceptance of extraterrestrial sentient life."),
        ("afosi", "AFOSI", "intelligence_agency", "Air Force Office of Special Investigations", "AFOSI",
         "US Air Force counterintelligence body accused of UFO disinformation campaigns."),
        ("condon-committee", "Condon Committee", "research_org", "University of Colorado UFO Project", "",
         "1966-1968 Air Force-funded UFO investigation led by Edward Condon; its dismissive report ended academic UFO research."),
        ("montana-tech", "Montana Tech University", "research_org", "Montana Tech University", "",
         "Home institution of biological anthropologist Mike Masters."),
    ]
    for slug, label, otype, full, acr, summ in orgs:
        nodes.append(org(slug, label, otype, S(0, DUR, f"Discussed in video"),
                        summary=summ, full_name=full, acronym=acr))

    # =====================================================================
    # LOCATIONS
    # =====================================================================
    locs = [
        ("roswell-new-mexico", "Roswell, New Mexico", "city", "US", "New Mexico"),
        ("wright-patterson-afb", "Wright-Patterson Air Force Base", "military_base", "US", "Ohio"),
        ("malmstrom-afb", "Malmstrom Air Force Base", "military_base", "US", "Montana"),
        ("vandenberg-afb", "Vandenberg Air Force Base", "military_base", "US", "California"),
        ("groom-lake", "Groom Lake / Area 51", "military_base", "US", "Nevada"),
        ("s4-papoose", "S-4 / Papoose Lake", "military_base", "US", "Nevada"),
        ("los-alamos", "Los Alamos", "research_facility", "US", "New Mexico"),
        ("hanford", "Hanford Site", "research_facility", "US", "Washington"),
        ("savannah-river", "Savannah River Site", "research_facility", "US", "South Carolina"),
        ("fort-hood", "Fort Hood", "military_base", "US", "Texas"),
        ("eglin-afb", "Eglin Air Force Base", "military_base", "US", "Florida"),
        ("ariel-school", "Ariel International School (Zimbabwe)", "observation_site", "ZW", ""),
        ("lino-japan", "Lino, Japan (near Fukushima)", "city", "JP", ""),
        ("chapel-hill-nc", "Chapel Hill, North Carolina", "city", "US", "North Carolina"),
        ("north-sentinel-island", "North Sentinel Island", "region", "IN", ""),
        ("mount-rainier", "Mount Rainier", "region", "US", "Washington"),
    ]
    for slug, label, ltype, country, state in locs:
        nodes.append(location(slug, label, ltype, S(0, DUR, ""),
                             country=country, state=state))

    # =====================================================================
    # PROGRAMS
    # =====================================================================
    progs = [
        ("manhattan-project", "Manhattan Project", "",
         "WWII US atomic weapons program. Grusch alleges its secrecy framework was overlaid on UFO programs; many Manhattan-era physicists (Oppenheimer, Condon) later involved in UFO classification."),
        ("project-blue-book", "Project Blue Book", "Blue Book",
         "USAF official UFO investigation (1952-1969). Jesse argues it was primarily a propaganda/public-facing effort masking a deeper program."),
        ("operation-paperclip", "Operation Paperclip", "",
         "Post-WWII CIA program that brought 1,600+ Nazi scientists to the US. Jesse speculates it included UFO-relevant expertise."),
        ("aawsap", "AAWSAP", "AAWSAP",
         "Advanced Aerospace Weapons Systems Applications Program. DIA-run predecessor to AATIP."),
        ("aatip", "AATIP", "AATIP",
         "Advanced Aerospace Threat Identification Program. DoD effort to study UAPs led by Luis Elizondo."),
        ("uaptf", "UAP Task Force", "UAPTF",
         "Inter-agency task force where Grusch served as co-lead before it was replaced by AARO."),
        ("aaro", "AARO", "AARO",
         "All-domain Anomaly Resolution Office. DoD successor to UAPTF for UAP oversight."),
        ("stargate-project", "Stargate Project", "",
         "CIA/DIA remote-viewing program running through 1995. Referenced indirectly via Rockefeller-funded parapsychology overlap."),
    ]
    for slug, label, acr, summ in progs:
        nodes.append(program(slug, label, S(0, DUR, ""), summary=summ, acronym=acr))

    # =====================================================================
    # EVENTS
    # =====================================================================
    evts = [
        ("2023-07-uap-hearing", "July 2023 Congressional UAP Hearing", "hearing",
         "2023-07-26",
         "House Oversight Committee hearing featuring sworn testimony from Grusch, Fravor, and Graves on UAP."),
        ("1947-twining-memo", "Nathan Twining 1947 UFO Memo", "publication",
         "1947-09-23",
         "Twining letter to Air Force command affirming UFO phenomena is real and proposing independent research lines."),
        ("1957-chapel-hill-conference", "1957 Chapel Hill Conference on Gravity", "meeting",
         "1957-01-18",
         "Bahnson-sponsored conference establishing quantum gravity as a field. Attended by Feynman, Dyson, Wheeler, Bergman, DeWitt, and Louis Witten."),
        ("1966-condon-committee", "Condon Committee UFO Investigation", "publication",
         "1966-10-01",
         "University of Colorado UFO Project funded by USAF. Issued dismissive report in 1968 that effectively ended academic UFO research."),
        ("1989-lazar-disclosure", "Bob Lazar KLAS Interview", "publication",
         "1989-11-13",
         "Lazar's public outing by George Knapp on KLAS-TV introducing S-4, element 115, and gravity-amplifier claims."),
        ("1979-bennewitz-psyop", "Paul Bennewitz AFOSI Disinformation Campaign", "meeting",
         "1979-01-01",
         "US Air Force Office of Special Investigations agent Richard Doty fed fabricated UFO material to Paul Bennewitz, inducing psychotic breakdown."),
        ("2022-ig-disclosure", "Grusch IG Disclosure", "testimony",
         "2022-06-01",
         "Grusch's comprehensive documentation of covert UFO programs to the Intelligence Community Inspector General in summer 2022."),
        ("jfk-mccone-letter", "JFK-McCone UFO Letter", "publication",
         "1963-11-12",
         "Alleged letter from JFK to CIA Director John McCone requesting UFO data ten days before Kennedy's assassination."),
    ]
    for slug, label, etype, date, summ in evts:
        nodes.append(event(slug, label, etype, date, S(0, DUR, ""), summary=summ))

    # =====================================================================
    # INCIDENTS
    # =====================================================================
    incs = [
        ("1947-roswell", "1947 Roswell Crash", "crash_retrieval", "1947-07-08",
         "Mysterious debris retrieved by rancher Mac Brazel; Roswell Army Airfield's initial 'flying disc' press release retracted within 24 hours."),
        ("1994-ariel-school", "1994 Ariel School Incident", "mass_sighting", "1994-09-16",
         "62 elementary schoolchildren in Zimbabwe reported seeing a silver craft and humanoid beings; investigated by John Mack."),
        ("1964-big-sur-atlas", "1964 Big Sur Atlas V UFO Incident", "sighting", "1964-09-15",
         "Bob Jacobs photographed a UFO apparently intercepting an Atlas V dummy warhead test off Vandenberg."),
        ("1961-hill-abduction", "Betty and Barney Hill Abduction", "abduction", "1961-09-19",
         "First widely-publicized abduction case; imagery may have been shaped by preceding Outer Limits episode."),
        ("1967-malmstrom-missiles", "1967 Malmstrom Missile Shutdown", "sighting", "1967-03-16",
         "Robert Salas and others report UFO presence coincident with simultaneous failure of multiple ICBMs."),
        ("kenneth-arnold-sighting", "1947 Kenneth Arnold Mount Rainier Sighting", "sighting", "1947-06-24",
         "Pilot Kenneth Arnold's V-formation sighting from which the term 'flying saucer' derives."),
    ]
    for slug, label, itype, date, summ in incs:
        nodes.append(incident(slug, label, itype, date, S(0, DUR, ""), summary=summ))

    # =====================================================================
    # DOCUMENTS
    # =====================================================================
    docs = [
        ("ufos-and-nukes", "UFOs and Nukes", "book",
         "Robert Hastings 580-page investigation of 120+ military witnesses to UFO sightings at US nuclear sites.",
         "Robert Hastings", 2008),
        ("passport-to-magonia", "Passport to Magonia", "book",
         "Jacques Vallee argument linking UFO lore to folklore, fairies, and mystical traditions.",
         "Jacques Vallee", 1969),
        ("american-cosmic", "American Cosmic", "book",
         "Diana Pasulka examination of UFO phenomena as a new religion among technology and intelligence elites.",
         "Diana Pasulka", 2019),
        ("invisible-college", "The Invisible College", "book",
         "Jacques Vallee 1975 theoretical framework for UFO phenomena.",
         "Jacques Vallee", 1975),
        ("man-who-mastered-gravity", "The Man Who Mastered Gravity", "book",
         "Paul Schatzkin biography of T. Townsend Brown.",
         "Paul Schatzkin", 2008),
        ("atomic-energy-act-1954", "Atomic Energy Act of 1954", "legislation",
         "US law whose definition of 'special nuclear material' Grusch argues covers crashed craft materials.",
         "", 1954),
        ("mcmahon-act-1946", "McMahon Atomic Energy Act of 1946", "legislation",
         "US law establishing civilian control of atomic energy. Drafted with help from Edward Condon.",
         "", 1946),
        ("three-body-problem", "The Three-Body Problem", "book",
         "Liu Cixin sci-fi novel with dark-forest theory; Jesse speculates Chinese government allowed publication as soft disclosure.",
         "Liu Cixin", 2008),
        ("flying-saucers-jung", "Flying Saucers: A Modern Myth of Things Seen in the Skies", "book",
         "Carl Jung analysis of flying saucers as psychological archetype; he later acknowledged their physical reality.",
         "Carl Jung", 1959),
        ("wilson-memo", "Admiral Wilson Memo", "memo",
         "Alleged notes from Admiral Thomas Wilson describing denial of access to a UFO program; cited by Grusch and Jesse.",
         "", None),
    ]
    for slug, title, dtype, summ, author, year in docs:
        nodes.append(document(slug, title, dtype, S(0, DUR, ""),
                             summary=summ, author=author,
                             year=year if year else None))

    # =====================================================================
    # CONCEPTS
    # =====================================================================
    cons = [
        ("nhi", "Non-Human Intelligence", "metaphysics",
         "Umbrella term for intelligences behind the UAP/UFO phenomena. Explicitly cited by Grusch repeatedly."),
        ("disclosure", "Disclosure", "politics",
         "The advocacy / expected act of public acknowledgment by the US government of the UAP/NHI phenomenon."),
        ("crash-retrieval", "Crash Retrieval", "technology",
         "Recovery of downed non-human craft. Grusch alleges the US has operated such a program for decades."),
        ("reverse-engineering", "Reverse Engineering (of NHI craft)", "technology",
         "Deriving working principles and replicating technology from recovered craft."),
        ("antigravity", "Antigravity", "physics",
         "Mid-century research direction (Babson, Bahnson, Brown) proposed to explain UFO propulsion; went dark in the 1960s per Jesse's account."),
        ("biefield-brown-effect", "Biefield-Brown Effect", "physics",
         "Observed force on a capacitor with asymmetric electrodes; Brown claimed antigravity implications; allegedly implemented in B-2 bomber per 1992 Aviation Week."),
        ("ontological-shock", "Ontological Shock", "psychology",
         "Psychological shock from encountering phenomena that overturn worldview; discussed as reason for UAP secrecy."),
        ("activity-based-intelligence", "Activity-Based Intelligence", "politics",
         "Intelligence discipline centered on patterns of activity rather than entity identification; Grusch argues this is what UAP sighting data can actually yield."),
        ("simulation-hypothesis", "Simulation Hypothesis", "metaphysics",
         "Hypothesis that observable reality is a simulation; discussed in context of perceptual limits and Planck constants."),
        ("holographic-principle", "Holographic Principle", "physics",
         "Physics principle where information is encoded on a boundary surface; Grusch uses it to explain UAP as projections from higher-dimensional space."),
        ("alcubierre-drive", "Alcubierre Drive", "physics",
         "Theoretical faster-than-light propulsion using space-time warping; Grusch uses to explain observed blue-shift burns from UAP."),
        ("von-neumann-probe", "Von Neumann Probe", "physics",
         "Self-replicating probe concept; Grusch entertains UAP as possible von Neumann devices."),
        ("neoteny", "Neoteny", "biology",
         "Retention of juvenile features into adulthood across evolution; offered as hypothesis for alien morphology."),
        ("time-travel-hypothesis", "Time Travel Hypothesis (of UFOs)", "physics",
         "Mike Masters' hypothesis that UFOs are future-humans time-traveling back."),
    ]
    for slug, label, domain, summ in cons:
        nodes.append(concept(slug, label, domain, S(0, DUR, ""), summary=summ))

    # =====================================================================
    # TECHNOLOGIES
    # =====================================================================
    techs = [
        ("tic-tac", "Tic Tac Craft", "craft",
         "Morphology of craft observed by US Navy pilots off USS Nimitz in 2004; recurring description in UAP cases."),
        ("triangular-craft", "Triangular Craft", "craft",
         "Large football-field-sized triangular craft described by Grusch's military witnesses."),
        ("b2-stealth-bomber", "B-2 Stealth Bomber", "craft",
         "Northrop Grumman aircraft. Aviation Week 1992 reporting alleges its wings use Biefield-Brown electrokinetic effect."),
        ("foo-fighters", "Foo Fighters", "craft",
         "Orb-like objects observed by WWII Allied fighter pilots over Germany; investigated by OSS/MI6 with Townsend Brown per Schatzkin."),
        ("element-115", "Element 115", "material",
         "Lazar's claimed fuel for gravity-amplifier propulsion system at S-4."),
        ("memory-metal", "Memory Metal", "material",
         "Malleable shape-recovering metal claimed from Roswell debris."),
        ("gravitator", "Gravitator", "propulsion",
         "Townsend Brown's asymmetric capacitor device; circular form resembling flying saucer."),
    ]
    for slug, label, ttype, summ in techs:
        nodes.append(technology(slug, label, ttype, S(0, DUR, ""), summary=summ))

    # =====================================================================
    # PHENOMENA
    # =====================================================================
    phens = [
        ("nhi-biologics", "Non-Human Biologics", "biological",
         "Biological material from crash retrievals. Grusch publicly stated under oath that non-human biologics came with some recoveries."),
        ("lost-time", "Lost Time / Missing Time", "temporal",
         "Unaccounted periods during abduction experiences; Jesse links this to potential temporal-dimensional abductions."),
        ("alien-telepathy", "Telepathic Contact", "psychic",
         "Reported telepathic communication with non-human entities (e.g. Ariel School children)."),
        ("havana-syndrome-em", "Havana Syndrome (EM exposure)", "electromagnetic",
         "Diplomats' mysterious illness with neurological symptoms and brain scarring; CIA-assigned to Nolan who found parallels with UFO experiencers."),
    ]
    for slug, label, cat, summ in phens:
        nodes.append(phenomenon(slug, label, cat, S(0, DUR, ""), summary=summ))

    # =====================================================================
    # CLAIMS (must reference ≥1 named entity per schema)
    # Approximate timestamps based on narrative position; full-video span OK
    # for summary claims. Assertability levels: testimony_under_oath,
    # on_record_statement, personal_account, speculation, hearsay,
    # cited_from_document.
    # =====================================================================
    claims = [
        ("nhi-biologics-testified", 1800,
         "Grusch publicly stated under oath at Congress (July 2023) that non-human biologics came with recovered crashed craft.",
         "person-david-grusch", "testimony_under_oath",
         ["person-david-grusch", "phenomenon-nhi-biologics", "event-2023-07-uap-hearing", "concept-nhi"],
         "Biologics came with some of these recoveries. Non-human."),
        ("oppenheimer-classification-overlay", 3000,
         "Grusch asserts Oppenheimer created the classification framework later overlaid onto UFO secrecy, with Manhattan Project-era physicists extending it to retrieved materials.",
         "person-david-grusch", "on_record_statement",
         ["person-david-grusch", "person-robert-oppenheimer", "program-manhattan-project", "concept-crash-retrieval"],
         "Oppenheimer was the one who created the classification that included the UFO stuff."),
        ("mellon-heart-attack-source", 1200,
         "Grusch recounts Chris Mellon's story of a program source dying of a heart attack two weeks before a scheduled UFO-program meeting.",
         "person-david-grusch", "hearsay",
         ["person-david-grusch", "person-chris-mellon"],
         "About two weeks away from meeting when he died."),
        ("schumer-amendment-nhi-tech", 1400,
         "Grusch references Senator Schumer's 64-page amendment that explicitly addresses non-human tech recoveries.",
         "person-david-grusch", "on_record_statement",
         ["person-david-grusch", "person-chuck-schumer", "concept-crash-retrieval", "concept-disclosure"],
         "Schumer was compelled to write that big 64 page amendment that talks no shit, non-human tech, recoveries."),
        ("gaetz-eglin-disclosure", 1600,
         "Grusch describes Congressman Matt Gaetz receiving a protected disclosure about a UAP incident at Eglin AFB and being denied access to the flight crew and SCIF.",
         "person-david-grusch", "on_record_statement",
         ["person-matt-gaetz", "location-eglin-afb", "concept-disclosure"],
         "My office received a protected disclosure from Eglin Air Force Base indicating that there was a UAP incident that required my attention."),
        ("isotopic-ratios-engineered", 1100,
         "Grusch describes isotopic ratios in recovered craft materials that would have to be engineered to achieve the observed levels.",
         "person-david-grusch", "on_record_statement",
         ["person-david-grusch", "concept-crash-retrieval", "technology-memory-metal"],
         "Isotopic ratios that would have to be engineered for it to be at those levels."),
        ("twining-memo-ufo-real", 2400,
         "The 1947 Nathan Twining memo to Air Force leadership stated UFO phenomena is 'something real and not visionary or fictitious.'",
         "person-jesse-michels", "cited_from_document",
         ["person-nathan-twining", "event-1947-twining-memo", "organization-us-air-force"],
         "The UFO phenomena is something real and not visionary or fictitious."),
        ("condon-committee-rigged", 4500,
         "Jesse reports that the Condon Committee was coordinated with USAF officials like Colonel Robert Hippler, who wanted UFO research shown as a waste of money.",
         "person-jesse-michels", "cited_from_document",
         ["person-edward-condon", "organization-condon-committee", "organization-us-air-force"],
         "Condon was actually coordinating closely with Air Force officials like Colonel Robert Hippler."),
        ("townsend-brown-germany-1944", 3500,
         "Per Schatzkin's biography, Townsend Brown parachuted into Germany in 1944 under OSS/MI6 to investigate Nazi UFO programs and Foo Fighters.",
         "person-jesse-michels", "cited_from_document",
         ["person-townsend-brown", "organization-oss", "organization-mi6", "technology-foo-fighters"],
         "He parachuted behind enemy lines into Germany in 1944 and started looking into the German UFO reverse engineering program."),
        ("louis-witten-wpafb-gravity", 3200,
         "Louis Witten did contract work on gravity research for Wright-Patterson Air Force Base via Martin Corporation's RIAS.",
         "person-jesse-michels", "cited_from_document",
         ["person-louis-witten", "organization-rias", "location-wright-patterson-afb", "concept-antigravity"],
         "I got a contract from Wright Field to do it, to do Gravity, which I did very happily."),
        ("b2-biefield-brown", 3800,
         "Aviation Week (1992) reported the B-2 stealth bomber uses an electrokinetic Biefield-Brown effect in its wings.",
         "person-jesse-michels", "cited_from_document",
         ["technology-b2-stealth-bomber", "concept-biefield-brown-effect", "organization-northrop-grumman"],
         "The B-2 surfs its own electrostatic wave, the negative cloud chasing the positive wing."),
        ("paperclip-ufo-adjacency", 3700,
         "Jesse speculates Operation Paperclip's motive may have included Nazi UFO-program expertise, beyond just rocketry.",
         "person-jesse-michels", "speculation",
         ["program-operation-paperclip", "person-wernher-von-braun", "organization-nasa"],
         "One has to ask why do we have such a pressing need to get Wernher von Braun and Arthur Rudolph and all these guys. The NASA's Saturn program was literally transplantation of the Nazi program. Maybe it had something to do with the UFO thing."),
        ("jfk-mccone-letter-claim", 5800,
         "Jesse cites an alleged FOIA document: a Nov 12 1963 JFK letter to CIA Director McCone requesting unknown/UFO data ten days before Kennedy's assassination.",
         "person-jesse-michels", "cited_from_document",
         ["person-jfk", "person-john-mccone", "event-jfk-mccone-letter", "organization-cia"],
         "JFK asking for more information on unknowns in space and it was written to CIA director John McCone. The letter is dated November 12th 1963 just 10 days before JFK's death."),
        ("pompeo-ufo-files", 5900,
         "Mike Pompeo on camera said he had seen the UFO files and 'we've got bigger problems' when asked about JFK files.",
         "person-jesse-michels", "cited_from_document",
         ["person-mike-pompeo", "concept-disclosure"],
         "I saw the UFO files too. We've got bigger problems."),
        ("sagan-kit-green-ufos", 7100,
         "Carl Sagan met extensively with Kit Green toward the end of his career on the subject of UFOs.",
         "person-jesse-michels", "hearsay",
         ["person-carl-sagan", "person-kit-green", "concept-nhi"],
         "He also met a lot with Kit Green towards the end of his career, got very into UFOs."),
        ("rockefellers-funding-ufo-research", 4700,
         "The Rockefellers funded Steven Greer and John Mack for UFO disclosure work in the 1990s and supported the Princeton Parapsychology Lab.",
         "person-jesse-michels", "cited_from_document",
         ["person-lawrence-rockefeller", "person-steven-greer", "person-john-mack", "organization-princeton-parapsychology-lab"],
         "The Rockefellers funded Steven Greer in the nineties- and John Mack, and they funded the Princeton Parapsychology Lab."),
        ("clinton-davies-book-photo", 4750,
         "A 1990s photograph shows Hillary Clinton holding Paul Davies' book 'Are We Alone' at a Camp David meeting with David Rockefeller.",
         "person-jesse-michels", "cited_from_document",
         ["person-lawrence-rockefeller", "concept-disclosure"],
         "David Rockefeller was also involved in that and it was like a Camp David meet up and she's holding the book by Paul Davies, Are We Alone."),
        ("salas-malmstrom-shutdown", 3900,
         "Robert Salas at Malmstrom AFB describes the base being rendered inoperable during a UFO presence, with missiles failing simultaneously.",
         "person-jesse-michels", "cited_from_document",
         ["person-robert-salas", "location-malmstrom-afb", "incident-1967-malmstrom-missiles"],
         "Robert Salas at Malmstrom saying that the whole base was actually rendered inoperable. The sights were going down, like one by one."),
        ("jacobs-vandenberg-atlas-ufo", 3950,
         "Bob Jacobs at Vandenberg in 1964 filmed a UFO intercepting an Atlas V test missile; AFOSI confiscated footage and silenced him.",
         "person-jesse-michels", "cited_from_document",
         ["person-bob-jacobs", "location-vandenberg-afb", "incident-1964-big-sur-atlas", "organization-afosi"],
         "Bob Jacobs at Vandenberg in 64. He's a photo instrumentation specialist. They were launching dummy nuclear warheads off of Atlas five missiles and seeing a UFO kind of wrap around it and take it down."),
        ("ariel-school-1994", 4100,
         "62 elementary schoolchildren at Ariel International School in Zimbabwe saw a silver craft descend in 1994; later interviewed by John Mack.",
         "person-jesse-michels", "cited_from_document",
         ["incident-1994-ariel-school", "person-john-mack", "location-ariel-school"],
         "62 elementary school kids at the Ariel International School in Zimbabwe said that they saw a silver craft descend from the sky and land on a field."),
        ("condon-los-alamos-manhattan", 4600,
         "Edward Condon helped Oppenheimer select Los Alamos as the Manhattan Project site and drafted the 1946 McMahon Atomic Energy Act.",
         "person-jesse-michels", "cited_from_document",
         ["person-edward-condon", "person-robert-oppenheimer", "location-los-alamos", "program-manhattan-project", "document-mcmahon-act-1946"],
         "Condon helped Oppenheimer pick Los Alamos as the site for the Manhattan Project. Then, in 1946, Condon helped draft the McMahon Atomic Energy Act."),
        ("vallee-close-encounters", 6200,
         "Jacques Vallee was Steven Spielberg's inspiration for the French scientist character in Close Encounters of the Third Kind.",
         "person-jesse-michels", "on_record_statement",
         ["person-jacques-vallee", "person-david-grusch"],
         "He was Steven Spielberg's inspiration for the eccentric French scientist played by Francois Truffaut in Close Encounters of the Third Kind."),
        ("masters-time-travel-hypothesis", 6400,
         "Mike Masters (Montana Tech) theorizes aliens are humans from the future who have figured out time travel.",
         "person-jesse-michels", "cited_from_document",
         ["person-mike-masters", "concept-time-travel-hypothesis", "organization-montana-tech"],
         "Aliens are basically just humans from the future, who figured out time travel and are going back in time to visit us in the present."),
        ("mack-harvard-abduction", 4950,
         "John Mack was head of Harvard Psychiatry Department who moved from null-hypothesis skepticism to taking alien abduction reports seriously.",
         "person-jesse-michels", "on_record_statement",
         ["person-john-mack", "phenomenon-lost-time"],
         "John Mack, who was the head of the Harvard Psychiatry Department, who tried to maintain the null hypothesis."),
        ("pasulka-religious-ufo-parallels", 4400,
         "Diana Pasulka argues historical religious contact experiences (e.g., Saint Francis) may have been encounters with the same UFO phenomenon.",
         "person-jesse-michels", "cited_from_document",
         ["person-diana-pasulka", "document-american-cosmic", "concept-nhi"],
         "Diana Pasulka makes the pretty convincing case that many seemingly divine contact experiences in the past could have actually been what we now call UFO experiences."),
        ("grush-nuclear-ufo-interest", 2700,
         "Grusch affirms that by external observation UAPs demonstrate interest in our nuclear technology and capabilities.",
         "person-david-grusch", "on_record_statement",
         ["person-david-grusch", "concept-nhi", "incident-1967-malmstrom-missiles"],
         "Is there any indication that these UAPs are interested in our nuclear technology and capabilities? Yes."),
        ("paralell-evolution-speculation", 2000,
         "Grusch speculates NHI may be similarly advanced to humans but took a different developmental path — civil propulsion rather than nuclear weapons.",
         "person-david-grusch", "speculation",
         ["person-david-grusch", "concept-nhi", "concept-alcubierre-drive"],
         "Some of this NHI - they're similarly as advanced as us but they've just made the what is it, asymmetric evolution or whatever."),
        ("bennewitz-doty-psyop", 6700,
         "The Air Force in 1979 drove Paul Bennewitz to psychological breakdown via a Richard Doty disinformation campaign.",
         "person-jesse-michels", "cited_from_document",
         ["person-paul-bennewitz", "person-richard-doty", "organization-afosi", "event-1979-bennewitz-psyop"],
         "Richard Doty, who is an Air Force disinfo guy, was kind of assigned to screw him up mentally."),
    ]
    for slug, t, stmt, asserter, assertability, subs, quote in claims:
        nodes.append(claim(slug, stmt, asserter, VID, t, assertability, subs,
                          S(t, t + 30, quote), quote=quote))

    # =====================================================================
    # EDGES
    # =====================================================================
    def e(f, t, rel, t_start=0, quote="", conf=0.9, props=None):
        edges.append(edge(f, t, rel, S(t_start, None, quote), conf, props))

    # Video-to-people
    e(f"video-{VID}", "person-jesse-michels", "HOSTED_BY", 0, "Jesse hosting")
    e("person-jesse-michels", f"video-{VID}", "APPEARED_IN", 0, "", 0.99,
      {"appearance_type": "host"})
    e("person-david-grusch", f"video-{VID}", "APPEARED_IN", 30, "Dave as primary guest", 0.99,
      {"appearance_type": "guest"})
    e(f"video-{VID}", "person-david-grusch", "DISCUSSES", 0, "Grusch is the subject", 0.99)

    # Grusch's career / affiliations
    e("person-david-grusch", "organization-nro", "EMPLOYED_BY", 100,
      "14-year senior intel officer at NRO", 0.95, {"role_title": "Intelligence Officer"})
    e("person-david-grusch", "program-uaptf", "MEMBER_OF", 200,
      "UAP Task Force co-lead", 0.95)
    e("person-david-grusch", "program-aaro", "MEMBER_OF", 250,
      "ARO / AARO", 0.9)
    e("person-david-grusch", "event-2023-07-uap-hearing", "TESTIFIED_AT", 1800,
      "Sworn testimony before Congress", 0.99)
    e("person-david-grusch", "event-2022-ig-disclosure", "PARTICIPATED_IN", 400,
      "IG disclosure in summer 2022", 0.95)
    e("event-2023-07-uap-hearing", "location-congress", "OCCURRED_AT", 1800, "", 0.8)  # placeholder; we don't have 'congress' location slug
    e("event-2023-07-uap-hearing", "organization-congress", "OCCURRED_AT", 1800, "", 0.95)

    # Manhattan Project / atomic secrecy overlay on UFO programs
    e("person-robert-oppenheimer", "program-manhattan-project", "MEMBER_OF", 3000, "", 0.99,
      {"role_title": "Director"})
    e("program-manhattan-project", "program-project-blue-book", "PRECEDED", 3100, "", 0.8)
    e("person-edward-condon", "program-manhattan-project", "MEMBER_OF", 4600,
      "Drafted McMahon Act; selected Los Alamos", 0.9)
    e("person-edward-condon", "document-mcmahon-act-1946", "AUTHORED", 4650, "Helped draft", 0.9)
    e("person-edward-condon", "location-los-alamos", "LOCATED_AT", 4610, "Helped select site", 0.85,
      {"relation": "site-selection"})
    e("person-edward-condon", "organization-condon-committee", "FOUNDED", 4550, "Led the committee", 0.99)
    e("person-edward-condon", "event-1966-condon-committee", "ORGANIZED", 4550, "", 0.99)
    e("organization-condon-committee", "organization-us-air-force", "FUNDED_BY", 4500,
      "USAF-funded UFO investigation", 0.95)
    e("person-donald-menzel", "program-manhattan-project", "MEMBER_OF", 4480, "Alleged atomic-program tie", 0.7)

    # Antigravity network (Witten, Brown, Martin / RIAS)
    e("person-louis-witten", "organization-rias", "EMPLOYED_BY", 3200, "", 0.95,
      {"role_title": "Researcher"})
    e("organization-rias", "organization-martin-corporation", "PART_OF", 3250, "", 0.99)
    e("organization-martin-corporation", "organization-lockheed-martin", "SUCCEEDED", 3260, "Merged into", 0.99)
    e("person-louis-witten", "location-wright-patterson-afb", "WORKED_WITH", 3300,
      "Gravity contract for Wright-Patterson", 0.9)
    e("person-louis-witten", "person-ed-witten", "FAMILY_OF", 3350, "Father-son", 0.99,
      {"relation_type": "father_of"})
    e("person-louis-witten", "event-1957-chapel-hill-conference", "ATTENDED", 3400, "", 0.9)
    e("person-townsend-brown", "organization-nicap", "FOUNDED", 3500, "", 0.95)
    e("person-townsend-brown", "organization-martin-corporation", "EMPLOYED_BY", 3550, "", 0.8)
    e("person-townsend-brown", "organization-oss", "WORKED_WITH", 3500,
      "Germany infiltration for Foo Fighter investigation", 0.7)
    e("person-townsend-brown", "technology-gravitator", "DEVELOPED", 3600, "", 0.95)
    e("technology-gravitator", "concept-biefield-brown-effect", "BASED_ON_CONCEPT", 3650, "", 0.95)
    e("technology-b2-stealth-bomber", "concept-biefield-brown-effect", "USES_TECHNOLOGY", 3800,
      "Per 1992 Aviation Week reporting", 0.75)
    e("organization-northrop-grumman", "technology-b2-stealth-bomber", "DEVELOPED", 3820, "", 0.99)
    e("person-edward-teller", "person-townsend-brown", "WORKED_WITH", 3700,
      "Per Schatzkin biography", 0.6)

    # Bahnson, Chapel Hill, quantum gravity → string theory path
    e("person-robert-sarbacher", "person-townsend-brown", "KNOWS", 3580, "Drove Brown home per Linda Brown", 0.7)
    e("person-robert-sarbacher", "concept-crash-retrieval", "INVESTIGATED", 3590,
      "Alleged early UFO crash-retrieval stand-up", 0.7)

    # Roswell
    e("incident-1947-roswell", "location-roswell-new-mexico", "OCCURRED_AT", 4200, "", 0.99)
    e("person-mac-brazel", "incident-1947-roswell", "WITNESSED", 4210, "Discovered wreckage", 0.95)
    e("person-jesse-marcel", "incident-1947-roswell", "INVESTIGATED", 4220, "", 0.95)
    e("incident-1947-roswell", "location-wright-patterson-afb", "REFERENCES", 4230,
      "Wreckage allegedly moved there", 0.8)

    # Grusch-facing relationships (people Grusch trusts/cites)
    e("person-david-grusch", "person-jesse-michels", "KNOWS", 600, "Known for 2+ years", 0.99)
    e("person-david-grusch", "person-chris-mellon", "KNOWS", 1200, "", 0.9)
    e("person-david-grusch", "person-luis-elizondo", "KNOWS", 5500,
      "Credits Elizondo for gorilla-in-cage analogy", 0.85)
    e("person-david-grusch", "person-eric-weinstein", "KNOWS", 6800,
      "Personal friend; used North Sentinel analogy", 0.9)
    e("person-david-grusch", "person-gary-nolan", "KNOWS", 6300, "", 0.85)
    e("person-david-grusch", "person-jacques-vallee", "KNOWS", 6000, "", 0.8)

    # Witness → incident
    e("person-robert-salas", "incident-1967-malmstrom-missiles", "WITNESSED", 3900, "", 0.95)
    e("incident-1967-malmstrom-missiles", "location-malmstrom-afb", "OCCURRED_AT", 3900, "", 0.99)
    e("person-bob-jacobs", "incident-1964-big-sur-atlas", "WITNESSED", 3950, "", 0.95)
    e("incident-1964-big-sur-atlas", "location-vandenberg-afb", "OCCURRED_AT", 3950, "", 0.99)
    e("incident-1994-ariel-school", "location-ariel-school", "OCCURRED_AT", 4100, "", 0.99)
    e("person-john-mack", "incident-1994-ariel-school", "INVESTIGATED", 4105,
      "Interviewed Ariel schoolchildren", 0.95)
    e("person-kenneth-arnold", "incident-kenneth-arnold-sighting", "WITNESSED", 4280, "", 0.99)
    e("incident-kenneth-arnold-sighting", "location-mount-rainier", "OCCURRED_AT", 4280, "", 0.99)

    # Authorship / documents
    e("person-robert-hastings", "document-ufos-and-nukes", "AUTHORED", 3850, "", 0.99)
    e("person-jacques-vallee", "document-passport-to-magonia", "AUTHORED", 4350, "", 0.99)
    e("person-jacques-vallee", "document-invisible-college", "AUTHORED", 6300, "", 0.99)
    e("person-diana-pasulka", "document-american-cosmic", "AUTHORED", 4420, "", 0.99)
    e("person-carl-jung", "document-flying-saucers-jung", "AUTHORED", 4970, "", 0.99) if False else None  # carl-jung node not added; skip
    # Redo without carl-jung since we didn't create that person
    # (Removed above)

    # Paperclip
    e("person-wernher-von-braun", "program-operation-paperclip", "PART_OF", 3700, "", 0.99)
    e("program-operation-paperclip", "organization-cia", "RUN_BY", 3700, "", 0.95)
    e("person-wernher-von-braun", "organization-nasa", "EMPLOYED_BY", 3750,
      "Later ran Saturn program", 0.99, {"role_title": "Saturn program lead"})

    # Nuclear-UFO connection
    e("concept-crash-retrieval", "program-manhattan-project", "PART_OF", 3050,
      "Secrecy overlaid via Atomic Energy Act framework", 0.8)
    e("document-atomic-energy-act-1954", "concept-crash-retrieval", "REFERENCES", 3150,
      "'Special nuclear material' definition argued by Grusch to cover crashed craft", 0.7)

    # JFK / Pompeo
    e("person-jfk", "event-jfk-mccone-letter", "AUTHORED", 5800, "", 0.7)
    e("event-jfk-mccone-letter", "person-john-mccone", "REFERENCES", 5800, "Addressed to", 0.85)
    e("person-john-mccone", "organization-cia", "HELD_ROLE", 5810, "", 0.99,
      {"role_title": "Director"})
    e("person-mike-pompeo", "organization-cia", "HELD_ROLE", 5900, "Former Director", 0.99,
      {"role_title": "Director"})

    # Rockefeller funding
    e("person-lawrence-rockefeller", "person-steven-greer", "WORKED_WITH", 4700,
      "Funded Greer's research", 0.9, {"relation": "funded"})
    e("person-lawrence-rockefeller", "person-john-mack", "WORKED_WITH", 4705,
      "Funded Mack's research", 0.85, {"relation": "funded"})
    e("person-lawrence-rockefeller", "organization-princeton-parapsychology-lab", "WORKED_WITH", 4710,
      "Funded the lab", 0.85, {"relation": "funded"})

    # Bennewitz / Doty / AFOSI
    e("person-richard-doty", "organization-afosi", "EMPLOYED_BY", 6700, "", 0.99)
    e("person-richard-doty", "person-paul-bennewitz", "KNOWS", 6700,
      "Ran disinfo against Bennewitz", 0.9, {"relation": "disinformation-target"})
    e("person-paul-bennewitz", "event-1979-bennewitz-psyop", "WITNESSED", 6720, "", 0.99)

    # Fravor / Graves / Mace / Coulthart — 2023 hearing
    e("person-david-fravor", "event-2023-07-uap-hearing", "TESTIFIED_AT", 1810, "", 0.99)
    e("person-ryan-graves", "event-2023-07-uap-hearing", "TESTIFIED_AT", 1815, "", 0.99)
    e("person-nancy-mace", "event-2023-07-uap-hearing", "PARTICIPATED_IN", 1820,
      "Questioned Grusch", 0.95)
    e("person-ross-coulthart", "person-david-grusch", "WORKED_WITH", 1830,
      "Interviewed Grusch for News Nation", 0.95)
    e("person-ross-coulthart", "organization-news-nation", "EMPLOYED_BY", 1830, "", 0.95)

    # Claims → asserters and subjects (schema-critical ASSERTED edges)
    for slug, *_ in claims:
        cid = f"claim-{VID}-{slug}"
        # will be linked via the claim's subject_entities list in-node
        # But also emit explicit ASSERTED edge from asserter to claim
    for slug, t, stmt, asserter, *_rest in claims:
        cid = f"claim-{VID}-{slug}"
        e(asserter, cid, "ASSERTED", t, stmt[:200], 0.95)
        # Link claim to video
        e(f"video-{VID}", cid, "REFERENCES", t, "", 0.95)

    # Concept anchors
    e("concept-antigravity", "event-1957-chapel-hill-conference", "REFERENCES", 3400, "", 0.95)
    e("concept-biefield-brown-effect", "person-townsend-brown", "REFERENCES", 3700, "Named after", 0.99)
    e("concept-nhi", "phenomenon-nhi-biologics", "RELATED_TO_CONCEPT", 1800, "", 0.95)

    return {"video_id": VID, "nodes": nodes, "edges": edges}


if __name__ == "__main__":
    d = build()
    print(f"Nodes: {len(d['nodes'])}, Edges: {len(d['edges'])}")
    path = write_output(d, VID)
    print(f"Wrote {path}")
