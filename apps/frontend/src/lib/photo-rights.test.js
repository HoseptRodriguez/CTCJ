import { describe, expect, it } from 'vitest';

import { CLUB_PHOTOS } from '../components/ui/ClubPhoto.jsx';
import widths from '../components/ui/clubPhotoWidths.json';

import { PHOTO_RIGHTS, isPhotoPublishable, photoRightsProblems } from './photo-rights.js';

describe('photo rights', () => {
  it('every photo has its origin, author and rights registered', () => {
    for (const [name, r] of Object.entries(PHOTO_RIGHTS)) {
      expect(r.source, name).toBeTruthy();
      expect(r.author, name).toBeTruthy();
      expect(typeof r.identifiablePeople, name).toBe('boolean');
      expect(typeof r.minors, name).toBe('boolean');
      expect(typeof r.imageAuthorization, name).toBe('boolean');
    }
  });

  it('a minor without the guardian authorization is never publishable', () => {
    expect(isPhotoPublishable('nino-saque')).toBe(false);
    expect(isPhotoPublishable('jugador-saque-azul')).toBe(false);
    expect(isPhotoPublishable('canchas-panoramica-nubes')).toBe(true);
    expect(isPhotoPublishable('foto-sin-registrar')).toBe(false);
  });

  it('the app only knows publishable photos', () => {
    for (const name of [...Object.keys(CLUB_PHOTOS), ...Object.keys(widths)]) {
      expect(isPhotoPublishable(name), name).toBe(true);
    }
  });

  it('the build check reports a published or used photo of a minor, and unregistered photos', () => {
    expect(
      photoRightsProblems({ published: ['canchas-panoramica-nubes'], referenced: [] }),
    ).toEqual([]);
    const problems = photoRightsProblems({
      published: ['nino-saque', 'nueva-foto'],
      referenced: ['nino-saque'],
    });
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/nino-saque.*menor.*public\/img\/club y la usa el código/);
    expect(problems[1]).toMatch(/nueva-foto.*no está en photo-rights\.js/);
  });
});
