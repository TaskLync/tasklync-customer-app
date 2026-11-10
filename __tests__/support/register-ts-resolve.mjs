import { register } from 'node:module';

// Lets pure-logic tests import app modules that use Metro-style extensionless relative imports.
register('./ts-resolve-hooks.mjs', import.meta.url);
