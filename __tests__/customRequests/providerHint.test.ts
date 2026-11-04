import { test, describe } from 'node:test';
import assert from 'node:assert';
import { isAgencyProvider, providerTypeHint } from '../../src/utils/providerHint.ts';

describe('custom request provider hint (agency vs individual)', () => {
  test('opened from the agency profile -> declares COMPANY', () => {
    assert.strictEqual(providerTypeHint({ openedFromAgencyProfile: true, profileProviderType: undefined }), 'COMPANY');
    assert.strictEqual(isAgencyProvider({ openedFromAgencyProfile: true }), true);
  });

  test('the profile itself says COMPANY -> declares COMPANY (e.g. deep link without the param)', () => {
    assert.strictEqual(providerTypeHint({ openedFromAgencyProfile: false, profileProviderType: 'COMPANY' }), 'COMPANY');
  });

  test('an individual worker sends no hint — the server derives it', () => {
    assert.strictEqual(providerTypeHint({ openedFromAgencyProfile: false, profileProviderType: 'INDIVIDUAL' }), undefined);
    assert.strictEqual(providerTypeHint({ openedFromAgencyProfile: false }), undefined);
  });

  test('never asserts INDIVIDUAL, because the profile mapper defaults to it when the type is missing', () => {
    for (const profile of ['INDIVIDUAL', undefined, null, '']) {
      assert.notStrictEqual(
        providerTypeHint({ openedFromAgencyProfile: false, profileProviderType: profile as any }),
        'INDIVIDUAL',
      );
    }
  });

  test('an agency profile wins over a defaulted INDIVIDUAL in the loaded profile', () => {
    assert.strictEqual(
      providerTypeHint({ openedFromAgencyProfile: true, profileProviderType: 'INDIVIDUAL' }),
      'COMPANY',
    );
  });
});
