// Live provider check: node --experimental-strip-types scripts/live-geocode-check.mjs "lat,lng" ["lat,lng" ...]
// Coordinates come from the command line only. Uses real Nominatim (and Google if GOOGLE_MAPS_KEY is set).
import { googleCandidates, nominatimCandidates, selectBestAddress } from '../src/utils/addressSelect.ts';

const base = (process.env.EXPO_PUBLIC_NOMINATIM_URL || 'https://nominatim.openstreetmap.org').replace(/\/+$/, '');
const gkey = process.env.GOOGLE_MAPS_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';

for (const arg of process.argv.slice(2)) {
  const [lat, lng] = arg.split(',').map(Number);
  if ([lat, lng].some(Number.isNaN)) { console.log('skip invalid', arg); continue; }
  const c = [];
  if (gkey) {
    const g = await (await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${gkey}`)).json();
    console.log('google status:', g.status);
    c.push(...googleCandidates(g, lat, lng));
  } else console.log('google: no key set, skipped');
  const r = await fetch(`${base}/reverse?format=jsonv2&addressdetails=1&namedetails=1&zoom=18&lat=${lat}&lon=${lng}`, { headers: { 'User-Agent': 'TaskLync-Customer-App-check' } });
  console.log('osm http:', r.status);
  if (r.ok) c.push(...nominatimCandidates(await r.json(), lat, lng));
  console.log(arg, '\n  candidates:', c.map((x) => `${x.source}/${x.tier}/${x.distanceM === null ? '?' : Math.round(x.distanceM)}m`).join(', ') || 'none');
  const best = selectBestAddress(c, lat, lng);
  console.log('  selected:', best ? `[${best.source}/${best.tier}] ${best.result.address_line}` : 'null → honest coordinates fallback');
  await new Promise((s) => setTimeout(s, 1200));
}
