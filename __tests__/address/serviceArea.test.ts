import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  validateServiceArea,
  isLocationInServiceArea,
  SERVICE_CITIES,
  FAISALABAD_DEFAULT_REGION,
  FAISALABAD_CENTER,
  SERVICE_UNAVAILABLE_MESSAGE,
} from '../../src/config/serviceArea.config.ts';

describe('Address & Service Area Validation', () => {
  test('approves valid coordinates inside Faisalabad service area', () => {
    const center = validateServiceArea({
      lat: FAISALABAD_DEFAULT_REGION.latitude,
      lng: FAISALABAD_DEFAULT_REGION.longitude,
    });
    assert.strictEqual(center.isServiceable, true);
    assert.strictEqual(center.cityName, 'Faisalabad');
    assert.strictEqual(center.errorMessage, null);

    // Known points inside Faisalabad
    const dGround = validateServiceArea({ lat: 31.4187, lng: 73.0791 });
    assert.strictEqual(dGround.isServiceable, true);

    const kohinoor = validateServiceArea({ lat: 31.4050, lng: 73.1100 });
    assert.strictEqual(kohinoor.isServiceable, true);

    assert.strictEqual(isLocationInServiceArea(FAISALABAD_CENTER), true);
  });

  test('rejects points outside Faisalabad service boundary', () => {
    // Lahore
    const lahore = validateServiceArea({ lat: 31.5204, lng: 74.3587 });
    assert.strictEqual(lahore.isServiceable, false);
    assert.strictEqual(lahore.errorMessage, SERVICE_UNAVAILABLE_MESSAGE);

    // Karachi
    const karachi = validateServiceArea({ lat: 24.8607, lng: 67.0011 });
    assert.strictEqual(karachi.isServiceable, false);

    // Islamabad
    const islamabad = validateServiceArea({ lat: 33.6844, lng: 73.0479 });
    assert.strictEqual(islamabad.isServiceable, false);

    assert.strictEqual(isLocationInServiceArea({ lat: 31.5204, lng: 74.3587 }), false);
  });

  test('gracefully rejects missing, null, undefined, or NaN coordinates without throwing', () => {
    assert.strictEqual(validateServiceArea(null as any).isServiceable, false);
    assert.strictEqual(validateServiceArea(undefined as any).isServiceable, false);
    assert.strictEqual(validateServiceArea({} as any).isServiceable, false);
    assert.strictEqual(validateServiceArea({ lat: NaN, lng: 73.0791 }).isServiceable, false);
    assert.strictEqual(validateServiceArea({ lat: 31.4187, lng: NaN }).isServiceable, false);
    assert.strictEqual(validateServiceArea({ lat: 'abc' as any, lng: 73.0791 }).isServiceable, false);
    assert.strictEqual(validateServiceArea({ lat: 0, lng: 0 }).isServiceable, false);
  });

  test('service area bounding box encompasses default region', () => {
    const fsd = SERVICE_CITIES.find((c) => c.id === 'faisalabad');
    assert.ok(fsd, 'Faisalabad city config should exist');
    if (!fsd) return;
    assert.ok(FAISALABAD_DEFAULT_REGION.latitude >= fsd.boundingBox.minLat);
    assert.ok(FAISALABAD_DEFAULT_REGION.latitude <= fsd.boundingBox.maxLat);
    assert.ok(FAISALABAD_DEFAULT_REGION.longitude >= fsd.boundingBox.minLng);
    assert.ok(FAISALABAD_DEFAULT_REGION.longitude <= fsd.boundingBox.maxLng);
  });
});

describe('Safe Navigation Coordinator Logic', () => {
  test('defers navigation until modal dismiss completes or timeout triggers', async () => {
    let hasNavigated = false;
    let pendingNav: (() => void) | null = null;
    let timeoutId: any = null;

    const requestNavigation = (navFn: () => void) => {
      pendingNav = navFn;
      // Safety fallback timer (simulating 400ms fallback)
      timeoutId = setTimeout(() => {
        if (pendingNav) {
          const fn = pendingNav;
          pendingNav = null;
          fn();
        }
      }, 50);
    };

    const onSheetDismissed = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (pendingNav) {
        const fn = pendingNav;
        pendingNav = null;
        fn();
      }
    };

    // Case 1: Normal sheet dismiss before timeout
    requestNavigation(() => {
      hasNavigated = true;
    });

    assert.strictEqual(hasNavigated, false, 'Should not navigate synchronously');
    onSheetDismissed();
    assert.strictEqual(hasNavigated, true, 'Should navigate after sheet dismiss');

    // Case 2: Sheet dismiss never called (fallback timer fires)
    hasNavigated = false;
    requestNavigation(() => {
      hasNavigated = true;
    });
    assert.strictEqual(hasNavigated, false);
    await new Promise((r) => setTimeout(r, 60));
    assert.strictEqual(hasNavigated, true, 'Fallback timer triggered navigation');
  });

  test('coordinate guard filters undefined/NaN regions from native map callbacks', () => {
    const isValidMapRegion = (region: any): boolean => {
      return Boolean(
        region &&
        typeof region.latitude === 'number' &&
        !isNaN(region.latitude) &&
        typeof region.longitude === 'number' &&
        !isNaN(region.longitude) &&
        (Math.abs(region.latitude) > 0.0001 || Math.abs(region.longitude) > 0.0001)
      );
    };

    // Valid map region
    assert.strictEqual(isValidMapRegion({ latitude: 31.4187, longitude: 73.0791 }), true);

    // Initial unready Android map regions that caused the crash
    assert.strictEqual(isValidMapRegion(null), false);
    assert.strictEqual(isValidMapRegion(undefined), false);
    assert.strictEqual(isValidMapRegion({ latitude: 0, longitude: 0 }), false);
    assert.strictEqual(isValidMapRegion({ latitude: NaN, longitude: 73.0 }), false);
    assert.strictEqual(isValidMapRegion({ latitude: 31.4, longitude: undefined }), false);
  });
});
