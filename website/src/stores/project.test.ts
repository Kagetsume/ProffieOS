import { describe, expect, it } from 'vitest';
import {
  $boardProfileId,
  $numBlades,
  boardProfileChanged,
  getProfileBlades,
  getProfileName,
  numBladesChanged,
} from './project';

describe('project store helpers', () => {
  it('loads known profile blades', () => {
    expect(getProfileBlades('proffie_v3').length).toBeGreaterThan(0);
    expect(getProfileBlades('unknown_profile')).toEqual(getProfileBlades('proffie_v3'));
  });

  it('returns profile name or id fallback', () => {
    expect(getProfileName('proffie_v3')).toBeTruthy();
    expect(getProfileName('unknown_profile')).toBe('unknown_profile');
  });

  it('dispatches profile and blade-count events', () => {
    boardProfileChanged('proffie_v3');
    expect($boardProfileId.getState()).toBe('proffie_v3');
    numBladesChanged(3);
    expect($numBlades.getState()).toBe(3);
  });
});
