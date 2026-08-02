import { beforeEach, describe, expect, it } from 'vitest';

import { createGetSystemSetting } from '../../../../src/modules/identity/application/useCases/getSystemSetting.js';
import { createSetSystemSetting } from '../../../../src/modules/identity/application/useCases/setSystemSetting.js';

import { createFakeSystemSettingRepository } from './fakes.js';

describe('getSystemSetting / setSystemSetting', () => {
  let systemSettingRepository;
  let getSystemSetting;
  let setSystemSetting;

  beforeEach(() => {
    systemSettingRepository = createFakeSystemSettingRepository();
    getSystemSetting = createGetSystemSetting({ systemSettingRepository, clubId: 'club-1' });
    setSystemSetting = createSetSystemSetting({ systemSettingRepository, clubId: 'club-1' });
  });

  it('returns null for a never-set key', async () => {
    expect(await getSystemSetting({ key: 'booking.blockOnOverdueMembership' })).toBeNull();
  });

  it('round-trips a value through set then get', async () => {
    await setSystemSetting({
      key: 'booking.blockOnOverdueMembership',
      value: true,
      updatedByUserId: 'admin-1',
    });

    const result = await getSystemSetting({ key: 'booking.blockOnOverdueMembership' });
    expect(result.value).toBe(true);
    expect(result.updatedBy).toBe('admin-1');
  });

  it('is generic -- has no idea what any key means, just stores whatever value it is given', async () => {
    await setSystemSetting({
      key: 'some.other.key',
      value: { nested: 'shape' },
      updatedByUserId: null,
    });
    const result = await getSystemSetting({ key: 'some.other.key' });
    expect(result.value).toEqual({ nested: 'shape' });
  });
});
