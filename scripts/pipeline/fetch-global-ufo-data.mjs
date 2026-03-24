#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseCsv } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const DATASET_URL =
  'https://huggingface.co/datasets/ferinsharaf19/Ufo_data_clustered/resolve/main/source/scrubbed.csv';
const OUTPUT_PATH = path.join(ROOT, 'pipeline/input/raw-source-records-global.json');
const MAX_RECORDS = 6500;

const PRIORITY_COUNTRIES = new Set(['AU', 'RU', 'BR', 'AR', 'CL', 'MX', 'PE', 'UY', 'ZA', 'NZ', 'GB', 'CA', 'DE']);
const COUNTRY_ALIASES = {
  USA: 'US',
  UNITED_STATES: 'US',
  UNITED_KINGDOM: 'GB',
  UK: 'GB',
  ENGLAND: 'GB',
  GREAT_BRITAIN: 'GB',
  AUSTRALIA: 'AU',
  CANADA: 'CA',
  GERMANY: 'DE',
  BRAZIL: 'BR',
  ARGENTINA: 'AR',
  CHILE: 'CL',
  PERU: 'PE',
  URUGUAY: 'UY',
  RUSSIA: 'RU',
  ZIMBABWE: 'ZW',
  FINLAND: 'FI',
  ITALY: 'IT',
  BELGIUM: 'BE',
  IRAN: 'IR',
  MEXICO: 'MX',
};

function trimText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toFloat(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toInt(value) {
  const numeric = Number.parseInt(String(value), 10);
  return Number.isFinite(numeric) ? numeric : null;
}

function decodeHtmlEntity(match, entity) {
  const namedEntities = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  };

  if (entity.startsWith('#x') || entity.startsWith('#X')) {
    const value = Number.parseInt(entity.slice(2), 16);
    return Number.isFinite(value) && value >= 0 && value <= 0x10ffff
      ? String.fromCodePoint(value)
      : match;
  }

  if (entity.startsWith('#')) {
    const value = Number.parseInt(entity.slice(1), 10);
    return Number.isFinite(value) && value >= 0 && value <= 0x10ffff
      ? String.fromCodePoint(value)
      : match;
  }

  return namedEntities[entity.toLowerCase()] ?? match;
}

function decodeHtmlEntities(input) {
  let output = String(input ?? '');

  for (let index = 0; index < 3; index += 1) {
    const next = output.replace(/&([a-zA-Z]+|#[0-9]+|#x[0-9a-fA-F]+);?/g, decodeHtmlEntity);
    if (next === output) {
      break;
    }
    output = next;
  }

  return output;
}

function parseDateParts(value) {
  const cleaned = trimText(value);
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!match) {
    return {
      year: null,
      month: null,
      day: null,
    };
  }

  const month = toInt(match[1]);
  const day = toInt(match[2]);
  let year = toInt(match[3]);
  if (year !== null && year < 100) {
    year += year >= 30 ? 1900 : 2000;
  }

  return { year, month, day };
}

function normalizeCountry(value, city = '') {
  const cleaned = trimText(value).toUpperCase().replace(/[^A-Z]/g, '_').replace(/^_+|_+$/g, '');
  if (!cleaned || cleaned === 'NAN' || cleaned === 'NA' || cleaned === 'NULL') {
    const cityLower = trimText(city).toLowerCase();
    if (cityLower.includes('uk') || cityLower.includes('england') || cityLower.includes('scotland')) {
      return 'GB';
    }
    return null;
  }

  if (cleaned.length === 2) {
    return cleaned;
  }

  return COUNTRY_ALIASES[cleaned] ?? null;
}

function sanitizeDescription(value, context) {
  const cleaned = trimText(decodeHtmlEntities(value));
  if (!cleaned) {
    return `Global ${context.shape} sighting reported near ${context.city}, ${context.country} (${context.year}).`;
  }
  if (cleaned.length < 10) {
    return `Brief ${context.shape} sighting near ${context.city}, ${context.country} (${context.year}).`;
  }
  return cleaned.length > 520 ? `${cleaned.slice(0, 517)}...` : cleaned;
}

function normalizeShape(shape) {
  const normalized = trimText(shape).toLowerCase();
  if (!normalized) {
    return 'unknown';
  }
  return normalized.replace(/[^a-z0-9]+/g, '-');
}

function toIsoDate(year, month, day) {
  if (!year) {
    return undefined;
  }
  if (month && day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  if (month) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
  return `${year}`;
}

function countryWeight(country) {
  if (country === 'US') {
    return 0.45;
  }
  if (PRIORITY_COUNTRIES.has(country)) {
    return 1.5;
  }
  return 1;
}

function dedupeKey(record) {
  const lat = record.node.lat.toFixed(3);
  const lng = record.node.lng.toFixed(3);
  const year = record.node.date_start?.slice(0, 4) ?? '0000';
  const shape = record.node.tags.find((tag) => tag.startsWith('shape:')) ?? 'shape:unknown';
  return `${lat}|${lng}|${year}|${shape}`;
}

async function fetchDataset() {
  const response = await fetch(DATASET_URL, {
    headers: {
      'User-Agent': 'nhi-archive-global-ingestion/1.0 (public research)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download global dataset (${response.status})`);
  }

  return response.text();
}

function toRecords(rows) {
  const records = [];

  rows.forEach((row, index) => {
    const city = trimText(decodeHtmlEntities(row.city ?? row['Location.City']));
    const state = trimText(decodeHtmlEntities(row.state ?? row['Location.State']));
    const country = normalizeCountry(decodeHtmlEntities(row.country ?? row['Location.Country']), city);
    const shape = normalizeShape(decodeHtmlEntities(row.shape ?? row['Data.Shape']));

    const fromDatetime = parseDateParts(row.datetime);
    const year = fromDatetime.year ?? toInt(row['Dates.Sighted.Year']);
    const month = fromDatetime.month ?? toInt(row['Dates.Sighted.Month']);
    const day = fromDatetime.day ?? toInt(row['Date.Sighted.Day']);

    const lat = toFloat(row.latitude ?? row['Location.Coordinates.Latitude ']);
    const lng = toFloat(row['longitude '] ?? row.longitude ?? row['Location.Coordinates.Longitude ']);

    if (!country || !city || lat === null || lng === null || year === null) {
      return;
    }

    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return;
    }

    if (year < 1900 || year > 2026) {
      return;
    }

    const date_start = toIsoDate(year, month, day);
    const locationName = [city, state, country].filter(Boolean).join(', ');
    const label = `${city} sighting (${year})`;
    const summary = sanitizeDescription(row.comments ?? row['Data.Description excerpt'], {
      city,
      country,
      year,
      shape,
    });
    const durationSeconds = toFloat(row['duration (seconds)'] ?? row['Data.Encounter duration']);

    records.push({
      record_id: `global-${index + 1}`,
      source_id: 'global-ufo-scrubbed',
      url: `${DATASET_URL}#row-${index + 2}`,
      extraction_confidence: 'medium',
      date_resolved: Boolean(month && day),
      geocoded: true,
      _country: country,
      _weight: countryWeight(country),
      node: {
        id: `incident-global-${index + 1}`,
        node_type: 'incident',
        label,
        summary,
        tags: [
          'global sightings',
          'scrubbed dataset',
          'nuforc-derived',
          `country:${country.toLowerCase()}`,
          `shape:${shape}`,
        ],
        date_start,
        confidence: 'medium',
        sources: [DATASET_URL],
        lat,
        lng,
        location_name: locationName,
        classification: 'NL',
        duration_minutes: durationSeconds ? Math.round(durationSeconds / 60) : undefined,
        case_status: 'unexplained',
      },
      mentions: {
        persons: [],
        organizations: ['org-nuforc'],
        events: [],
        designations: [],
        locations: [],
      },
    });
  });

  return records;
}

function selectBalanced(records) {
  const deduped = [];
  const seen = new Set();

  const sorted = [...records].sort((left, right) => {
    if (left._weight !== right._weight) {
      return right._weight - left._weight;
    }
    const leftYear = Number.parseInt(left.node.date_start?.slice(0, 4) ?? '0', 10);
    const rightYear = Number.parseInt(right.node.date_start?.slice(0, 4) ?? '0', 10);
    return rightYear - leftYear;
  });

  for (const record of sorted) {
    const key = dedupeKey(record);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(record);
  }

  const perCountryLimit = new Map();
  const selected = [];

  for (const record of deduped) {
    if (selected.length >= MAX_RECORDS) {
      break;
    }

    const country = record._country;
    const current = perCountryLimit.get(country) ?? 0;
    const limit = country === 'US' ? 1900 : PRIORITY_COUNTRIES.has(country) ? 320 : 240;

    if (current >= limit) {
      continue;
    }

    perCountryLimit.set(country, current + 1);
    selected.push(record);
  }

  return selected.map((record) => {
    const { _country: _omitCountry, _weight: _omitWeight, ...clean } = record;
    return clean;
  });
}

async function main() {
  const csvText = await fetchDataset();
  const rows = parseCsv(csvText, {
    columns: true,
    skip_empty_lines: true,
  });

  const records = selectBalanced(toRecords(rows));

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(
    OUTPUT_PATH,
    `${JSON.stringify({ generated_at: new Date().toISOString(), records }, null, 2)}\n`,
    'utf8',
  );

  console.log('Global UFO enrichment complete');
  console.log(`- Records generated: ${records.length}`);
  console.log(`- Output: ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main().catch((error) => {
  console.error('Global enrichment failed:', error);
  process.exitCode = 1;
});
