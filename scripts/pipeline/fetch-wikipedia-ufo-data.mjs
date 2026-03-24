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
  'Category:Ufology',
  'Category:Alleged_alien_abduction_incidents',
  'Category:Lists_of_UFO_incidents',
];

const MAX_CATEGORY_DEPTH = 2;
const MAX_PAGES = 450;
const PAGE_BATCH_SIZE = 20;
const REQUEST_DELAY_MS = 120;

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

function guessNodeType(title, summary, categoryNames) {
  const haystack = `${title} ${summary} ${categoryNames.join(' ')}`.toLowerCase();

  if (
    haystack.includes('project ') ||
    haystack.includes('office') ||
    haystack.includes('committee') ||
    haystack.includes('organization') ||
    haystack.includes('network')
  ) {
    return 'organization';
  }

  if (
    haystack.includes('hearing') ||
    haystack.includes('wave') ||
    haystack.includes('flap') ||
    haystack.includes('event') ||
    haystack.includes('list of')
  ) {
    return 'event';
  }

  if (
    haystack.includes('testimony') ||
    haystack.includes('report') ||
    haystack.includes('assessment') ||
    haystack.includes('press release')
  ) {
    return 'statement';
  }

  return 'incident';
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
  const tags = Array.from(
    new Set(
      [
        'wikipedia',
        ...categories.slice(0, 8).map((entry) => categoryTag(entry)),
      ].filter(Boolean),
    ),
  );

  const nodeType = guessNodeType(title, summary, categories);
  const year = parseYear(`${title} ${summary}`);
  const wikiPath = encodeURIComponent(title.replace(/ /g, '_'));
  const sourceUrl = `https://en.wikipedia.org/wiki/${wikiPath}`;
  const mentions = inferMentions(summary);

  const coordinates = Array.isArray(page.coordinates) ? page.coordinates[0] : null;
  const hasCoordinates = Boolean(coordinates?.lat && coordinates?.lon);

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

  if (nodeType === 'incident' && hasCoordinates) {
    baseNode.lat = coordinates.lat;
    baseNode.lng = coordinates.lon;
    baseNode.location_name = title;
  }

  return {
    record_id: `wiki-${page.pageid}`,
    source_id: 'wikipedia-uap',
    url: sourceUrl,
    extraction_confidence: 'medium',
    date_resolved: Boolean(year),
    geocoded: Boolean(hasCoordinates),
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
