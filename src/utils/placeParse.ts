/**
 * Pure parsers for Google Places address components (Places API (New) `longText` and legacy
 * `long_name` shapes). Unit-testable; never invents values.
 */

export interface ParsedPlaceComponents {
  streetNumber: string;
  route: string;
  premise: string;
  area: string;
  city: string;
  country: string;
  postalCode: string;
}

function text(c: any): string {
  const v = c?.longText ?? c?.long_name ?? c?.shortText ?? c?.short_name;
  return typeof v === 'string' ? v.trim() : '';
}

/** First component (in Google's specific → general order) whose types include any wanted type, by priority of the wanted list. */
function pick(components: any[], ...wanted: string[]): string {
  for (const w of wanted) {
    const c = components.find((x) => Array.isArray(x?.types) && x.types.includes(w));
    const t = c ? text(c) : '';
    if (t) return t;
  }
  return '';
}

/**
 * City prefers `locality`, then `postal_town`, then tehsil (`administrative_area_level_3`), and only
 * then the district (`administrative_area_level_2`) — the audit found the previous loop let the
 * district overwrite the locality because it is listed after it (LOC-026).
 */
export function parsePlaceComponents(components: unknown): ParsedPlaceComponents {
  const list: any[] = Array.isArray(components) ? components : [];
  return {
    streetNumber: pick(list, 'street_number'),
    route: pick(list, 'route'),
    premise: pick(list, 'premise', 'subpremise'),
    area: pick(list, 'neighborhood', 'sublocality_level_1', 'sublocality', 'sublocality_level_2'),
    city: pick(list, 'locality', 'postal_town', 'administrative_area_level_3', 'administrative_area_level_2'),
    country: pick(list, 'country'),
    postalCode: pick(list, 'postal_code'),
  };
}

/** De-duplicates predictions by place id and by (case-insensitive) description; keeps order. */
export function dedupePredictions<T extends { place_id: string; description: string }>(items: T[], max = 5): T[] {
  const ids = new Set<string>();
  const texts = new Set<string>();
  const out: T[] = [];
  for (const p of items) {
    if (!p?.place_id || ids.has(p.place_id)) continue;
    const t = (p.description || '').trim().toLowerCase();
    if (t && texts.has(t)) continue;
    ids.add(p.place_id);
    if (t) texts.add(t);
    out.push(p);
    if (out.length >= max) break;
  }
  return out;
}
