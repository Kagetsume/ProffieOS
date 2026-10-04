/**
 * Uploaded BMP flipbooks for strip_column preview (keyed by SD path string).
 *
 * @module stores/bmpAssets
 */
import { createEvent, createStore } from 'effector';
import type { StripColumnBmpAsset } from '../preview/strip-column-bmp';
import { normalizeBmpPath } from '../preview/strip-column-bmp';

export type BmpAssetsState = Record<string, StripColumnBmpAsset>;

export const bmpAssetRegistered = createEvent<{ path: string; asset: StripColumnBmpAsset }>();

export const $bmpAssets = createStore<BmpAssetsState>({}).on(
  bmpAssetRegistered,
  (state, { path, asset }) => {
    const key = normalizeBmpPath(path);
    if (!key) {
      return state;
    }
    return { ...state, [key]: asset };
  },
);

/** Register or replace decoded BMP for a layer path (preview only). */
export function registerBmpAsset(path: string, asset: StripColumnBmpAsset): void {
  bmpAssetRegistered({ path, asset });
}

/** Lookup decoded BMP by SD path from layer args. */
export function getBmpAsset(path: string): StripColumnBmpAsset | undefined {
  const key = normalizeBmpPath(path);
  if (!key) {
    return undefined;
  }
  return $bmpAssets.getState()[key];
}
