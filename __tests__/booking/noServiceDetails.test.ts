import { test, describe } from 'node:test';
import assert from 'node:assert';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe('Service Details screen is gone', () => {
  test('there is no service route', () => {
    assert.strictEqual(existsSync(join(root, 'app', 'service')), false);
  });

  test('nothing navigates to /service/... and the navigator does not register it', () => {
    const files = [...walk(join(root, 'app')), ...walk(join(root, 'src'))];
    const offenders = files.filter((f) => {
      const s = readFileSync(f, 'utf8');
      return /['"`]\/service\/|pathname:\s*[`'"]\/service|name="service\/\[id\]"/.test(s);
    });
    assert.deepStrictEqual(offenders, []);
  });
});
