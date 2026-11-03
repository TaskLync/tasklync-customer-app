import { toQR } from 'toqr';

export interface QrSvgPathData {
  /** SVG path d-attribute describing all dark modules */
  path: string;
  /** Total dimension including quiet zone margins (viewBox = "0 0 gridSize gridSize") */
  gridSize: number;
  /** Inner matrix width / module count */
  moduleCount: number;
}

/**
 * Encodes an arbitrary string token into a crisp, vector SVG path using toqr.
 * Adds a standardized quiet zone border so cameras can cleanly acquire contrast boundaries.
 */
export function generateQrSvgPath(text: string, quietZone: number = 2): QrSvgPathData | null {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return null;
  }

  try {
    const bytes = toQR(text.trim());
    const moduleCount = Math.round(Math.sqrt(bytes.length));
    if (moduleCount * moduleCount !== bytes.length) {
      return null;
    }

    const gridSize = moduleCount + quietZone * 2;
    let path = '';

    for (let y = 0; y < moduleCount; y++) {
      for (let x = 0; x < moduleCount; x++) {
        if (bytes[y * moduleCount + x] === 1) {
          path += `M${x + quietZone},${y + quietZone}h1v1h-1z `;
        }
      }
    }

    return {
      path,
      gridSize,
      moduleCount,
    };
  } catch {
    return null;
  }
}
