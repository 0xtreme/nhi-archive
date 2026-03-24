#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const OUTPUT_PATH = path.join(ROOT, 'pipeline/input/raw-source-records-wikipedia.json');
const API_URL = 'https://en.wikipedia.org/w/api.php';

const START_CATEGORIES = [
  'Category:UFO_sightings',
  'Category:UFO_sightings_by_country',
  'Category:Ufology',
  'Category:Alleged_alien_abduction_incidents',
  'Category:Lists_of_UFO_incidents',
  'Category:UFO_sightings_in_Australia',
  'Category:UFO_sightings_in_Brazil',
  'Category:UFO_sightings_in_Russia',
  'Category:UFO_sightings_in_Mexico',
  'Category:UFO_sightings_in_the_United_Kingdom',
];

const MAX_CATEGORY_DEPTH = 3;
const MAX_PAGES = 700;
const PAGE_BATCH_SIZE = 20;
const REQUEST_DELAY_MS = 120;

const COUNTRY_HINTS = [
  { code: 'US', label: 'United States', lat: 39.8283, lng: -98.5795, pattern: /\b(united states|u\.s\.|usa|american)\b/ },
  { code: 'CA', label: 'Canada', lat: 56.1304, lng: -106.3468, pattern: /\bcanada\b/ },
  { code: 'GB', label: 'United Kingdom', lat: 55.3781, lng: -3.436, pattern: /\b(united kingdom|uk|england|scotland|wales)\b/ },
  { code: 'AU', label: 'Australia', lat: -25.2744, lng: 133.7751, pattern: /\baustralia\b/ },
  { code: 'NZ', label: 'New Zealand', lat: -40.9006, lng: 174.886, pattern: /\bnew zealand\b/ },
  { code: 'BR', label: 'Brazil', lat: -14.235, lng: -51.9253, pattern: /\bbrazil\b/ },
  { code: 'AR', label: 'Argentina', lat: -38.4161, lng: -63.6167, pattern: /\bargentina\b/ },
  { code: 'CL', label: 'Chile', lat: -35.6751, lng: -71.543, pattern: /\bchile\b/ },
  { code: 'PE', label: 'Peru', lat: -9.19, lng: -75.0152, pattern: /\bperu\b/ },
  { code: 'UY', label: 'Uruguay', lat: -32.5228, lng: -55.7658, pattern: /\buruguay\b/ },
  { code: 'MX', label: 'Mexico', lat: 23.6345, lng: -102.5528, pattern: /\bmexico\b/ },
  { code: 'RU', label: 'Russia', lat: 61.524, lng: 105.3188, pattern: /\b(russia|soviet|ussr)\b/ },
  { code: 'FI', label: 'Finland', lat: 61.9241, lng: 25.7482, pattern: /\bfinland\b/ },
  { code: 'BE', label: 'Belgium', lat: 50.5039, lng: 4.4699, pattern: /\bbelgium\b/ },
  { code: 'IR', label: 'Iran', lat: 32.4279, lng: 53.688, pattern: /\biran\b/ },
  { code: 'ZW', label: 'Zimbabwe', lat: -19.0154, lng: 29.1549, pattern: /\bzimbabwe\b/ },
  { code: 'IT', label: 'Italy', lat: 41.8719, lng: 12.5674, pattern: /\bitaly\b/ },
  { code: 'DE', label: 'Germany', lat: 51.1657, lng: 10.4515, pattern: /\bgermany\b/ },
  { code: 'FR', label: 'France', lat: 46.2276, lng: 2.2137, pattern: /\bfrance\b/ },
  { code: 'ZA', label: 'South Africa', lat: -30.5595, lng: 22.9375, pattern: /\bsouth africa\b/ },
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function parseYear(value) {
  if (!value) {
    return null;
  }
  const match = value.match(/\b(18|19|20)\d{2}\b/);
  return match ? match[0] : null;
}

function trimSummary(text) {
  const compact = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!compact) {
    return 'Wikipedia record imported by automated enrichment pipeline.';
  }
  if (compact.length <= 520) {
    return compact;
  }
  return `${compact.slice(0, 517)}...`;
}

function categoryTag(rawCategory) {
  return rawCategory.replace(/^Category:/, '').replace(/_/g, ' ').toLowerCase();
}

function isNoisyCategory(rawCategory) {
  const normalized = categoryTag(rawCategory);
  const patterns = [
    /^\d{3,4} births$/,
    /^\d{3,4} deaths$/,
    /^\d{3,4} in .+/,
    /^living people$/,
    /articles/,
    /wikipedia/,
    /all pages/,
    /cs1/,
    /short description/,
    /use dmy dates/,
    /use mdy dates/,
    /coordinates on wikidata/,
    /pages using/,
    /template/,
    /commons category link/,
    /use [a-z ]+ english/,
    /written from/,
    /engvarb/,
    /harv and sfn/,
  ];

  return patterns.some((pattern) => pattern.test(normalized));
}

function guessNodeType(title, summary, categoryNames) {
  const haystack = `${title} ${summary} ${categoryNames.join(' ')}`.toLowerCase();
  const incidentSignal =
    /\b(sighting|incident|encounter|abduction|ufo|uap|phenomenon|case)\b/.test(haystack) ||
    /\b(flap|wave)\b/.test(haystack);

  if (/\b(project|office|committee|organization|network)\b/.test(haystack)) {
    return 'organization';
  }

  if (/\b(hearing|event)\b/.test(haystack) || haystack.includes('list of')) {
    return 'event';
  }

  if (
    /\b(testimony|assessment|press release|statement|memo|declaration)\b/.test(haystack) ||
    (/\breport\b/.test(haystack) && !incidentSignal)
  ) {
    return 'statement';
  }

  return 'incident';
}

function inferCountryFromText(text) {
  if (!text) {
    return null;
  }

  const normalized = String(text).toLowerCase();
  for (const country of COUNTRY_HINTS) {
    if (country.pattern.test(normalized)) {
      return country;
    }
  }

  return null;
}

function deterministicJitter(seed, scale) {
  const numeric = Number.parseInt(String(seed), 10) || 0;
  const sine = Math.sin(numeric * 12.9898) * 43758.5453;
  return (sine - Math.floor(sine) - 0.5) * scale;
}

function inferMentions(summary) {
  const lower = summary.toLowerCase();

  const people = [];
  if (lower.includes('hynek')) {
    people.push('person-j-allen-hynek');
  }
  if (lower.includes('grusch')) {
    people.push('person-david-grusch');
  }
  if (lower.includes('fravor')) {
    people.push('person-david-fravor');
  }
  if (lower.includes('dietrich')) {
    people.push('person-alex-dietrich');
  }
  if (lower.includes('elizondo')) {
    people.push('person-luis-elizondo');
  }

  const organizations = [];
  if (lower.includes('blue book')) {
    organizations.push('org-project-blue-book');
  }
  if (lower.includes('aaro')) {
    organizations.push('org-aaro');
  }
  if (lower.includes('aatip')) {
    organizations.push('org-aatip');
  }
  if (lower.includes('mufon')) {
    organizations.push('org-mufon');
  }
  if (lower.includes('nuforc')) {
    organizations.push('org-nuforc');
  }

  return {
    persons: Array.from(new Set(people)),
    organizations: Array.from(new Set(organizations)),
    events: [],
    designations: [],
    locations: [],
  };
}

async function fetchJson(params) {
  const url = new URL(API_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'nhi-archive-data-enrichment/1.0 (public research)',
    },
  });

  if (!response.ok) {
    throw new Error(`Wikipedia API request failed (${response.status}): ${url.toString()}`);
  }

  return response.json();
}

async function fetchCategoryMembers(categoryTitle) {
  const members = [];
  let continuation;

  do {
    const payload = await fetchJson({
      action: 'query',
      format: 'json',
      list: 'categorymembers',
      cmtitle: categoryTitle,
      cmlimit: 'max',
      cmtype: 'page|subcat',
      cmcontinue: continuation,
    });

    const chunk = payload?.query?.categorymembers ?? [];
    members.push(...chunk);
    continuation = payload?.continue?.cmcontinue;
    await sleep(REQUEST_DELAY_MS);
  } while (continuation);

  return members;
}

async function crawlCategoryGraph() {
  const pages = new Map();
  const visitedCategories = new Set();
  const queue = START_CATEGORIES.map((category) => ({ category, depth: 0 }));

  while (queue.length > 0 && pages.size < MAX_PAGES) {
    const current = queue.shift();
    if (!current || visitedCategories.has(current.category)) {
      continue;
    }

    visitedCategories.add(current.category);
    const members = await fetchCategoryMembers(current.category);

    for (const member of members) {
      if (pages.size >= MAX_PAGES) {
        break;
      }

      if (member.ns === 0) {
        pages.set(member.pageid, {
          pageid: member.pageid,
          title: member.title,
        });
      }

      if (member.ns === 14 && current.depth < MAX_CATEGORY_DEPTH) {
        queue.push({ category: member.title, depth: current.depth + 1 });
      }
    }
  }

  return Array.from(pages.values());
}

async function fetchPageDetails(pageIds) {
  const details = [];

  for (let index = 0; index < pageIds.length; index += PAGE_BATCH_SIZE) {
    const batch = pageIds.slice(index, index + PAGE_BATCH_SIZE);
    const payload = await fetchJson({
      action: 'query',
      format: 'json',
      prop: 'extracts|coordinates|categories',
      explaintext: 1,
      exintro: 1,
      cllimit: 'max',
      pageids: batch.join('|'),
    });

    const pages = payload?.query?.pages ?? {};
    details.push(...Object.values(pages));
    await sleep(REQUEST_DELAY_MS);
  }

  return details;
}

function toRecord(page) {
  const title = page.title;
  const summary = trimSummary(page.extract ?? '');
  const categories = (page.categories ?? []).map((entry) => entry.title);
  const cleanCategoryTags = categories
    .filter((entry) => !isNoisyCategory(entry))
    .map((entry) => categoryTag(entry))
    .slice(0, 10);
  const locationSignal = `${title} ${summary} ${cleanCategoryTags.join(' ')}`;
  const inferredCountry = inferCountryFromText(locationSignal);
  const tags = Array.from(
    new Set([
      'wikipedia',
      ...cleanCategoryTags,
      ...(inferredCountry ? [`country:${inferredCountry.code.toLowerCase()}`] : []),
    ]),
  );

  const nodeType = guessNodeType(title, summary, categories);
  const year = parseYear(`${title} ${summary}`);
  const wikiPath = encodeURIComponent(title.replace(/ /g, '_'));
  const sourceUrl = `https://en.wikipedia.org/wiki/${wikiPath}`;
  const mentions = inferMentions(summary);

  const coordinates = Array.isArray(page.coordinates) ? page.coordinates[0] : null;
  const hasCoordinates =
    typeof coordinates?.lat === 'number' && Number.isFinite(coordinates.lat) &&
    typeof coordinates?.lon === 'number' && Number.isFinite(coordinates.lon);

  const nodeId = `${nodeType}-${slugify(title)}-${page.pageid}`;
  const baseNode = {
    id: nodeId,
    node_type: nodeType,
    label: title,
    summary,
    tags,
    confidence: 'medium',
    sources: [sourceUrl],
  };

  if (year) {
    baseNode.date_start = year;
  }

  if (nodeType === 'incident') {
    baseNode.case_status = 'unexplained';
  }

  if (nodeType === 'incident') {
    if (hasCoordinates) {
      baseNode.lat = coordinates.lat;
      baseNode.lng = coordinates.lon;
      baseNode.location_name = title;
    } else if (inferredCountry) {
      // Country-centroid fallback keeps global incidents visible on map when article-level coordinates are absent.
      baseNode.lat = Number((inferredCountry.lat + deterministicJitter(page.pageid, 1.1)).toFixed(5));
      baseNode.lng = Number((inferredCountry.lng + deterministicJitter(page.pageid + 47, 1.6)).toFixed(5));
      baseNode.location_name = inferredCountry.label;
      baseNode.tags = Array.from(new Set([...(baseNode.tags ?? []), 'country-centroid-estimate']));
    }
  }

  const geocoded =
    nodeType === 'incident' &&
    typeof baseNode.lat === 'number' &&
    typeof baseNode.lng === 'number';

  return {
    record_id: `wiki-${page.pageid}`,
    source_id: 'wikipedia-uap',
    url: sourceUrl,
    extraction_confidence: 'medium',
    date_resolved: Boolean(year),
    geocoded,
    node: baseNode,
    mentions,
  };
}

async function main() {
  const pages = await crawlCategoryGraph();
  const details = await fetchPageDetails(pages.map((page) => page.pageid));

  const records = details
    .filter((page) => page && !page.missing && typeof page.title === 'string' && page.title.length > 0)
    .map(toRecord);

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(
    OUTPUT_PATH,
    `${JSON.stringify({ generated_at: new Date().toISOString(), records }, null, 2)}\n`,
    'utf8',
  );

  console.log('Wikipedia enrichment complete');
  console.log(`- Records generated: ${records.length}`);
  console.log(`- Output: ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main().catch((error) => {
  console.error('Wikipedia enrichment failed:', error);
  process.exitCode = 1;
});
