import {
  getGraceConfig,
  applyGraceSettings,
  validateGraceSettings,
  amnestyDeadlineFromEndDate,
  resetGraceConfigForTests,
  GRACE_SETTING_KEYS,
} from '../grace-config';
import { MecaIdService } from '../meca-id.service';

/**
 * Behavior tests for the configurable grace / amnesty windows (Site Settings →
 * Grace & Amnesty, super-admin only). Pins:
 *   - built-in defaults (30 / 45 / amnesty through Aug 25 2026 PT)
 *   - settings rows override the defaults; blank amnesty date = amnesty OFF
 *   - invalid stored values are ignored (defaults win) instead of crashing
 *   - MecaIdService window getters follow the configured values
 */
describe('grace-config', () => {
  afterEach(() => resetGraceConfigForTests());

  it('ships with the original defaults: 30 self-serve / 45 admin / amnesty through Aug 25 2026 PT', () => {
    const cfg = getGraceConfig();
    expect(cfg.selfServeDays).toBe(30);
    expect(cfg.adminDays).toBe(45);
    expect(cfg.amnestyEndDate).toBe('2026-08-25');
    // Matches the original hard-coded RELAUNCH_GRACE_DEADLINE.
    expect(cfg.amnestyDeadline?.toISOString()).toBe('2026-08-26T07:00:00.000Z');
  });

  it('applies configured values from site_settings rows', () => {
    applyGraceSettings([
      { setting_key: GRACE_SETTING_KEYS.selfServeDays, setting_value: '60' },
      { setting_key: GRACE_SETTING_KEYS.adminDays, setting_value: '90' },
      { setting_key: GRACE_SETTING_KEYS.amnestyEndDate, setting_value: '2026-12-31' },
    ]);
    const cfg = getGraceConfig();
    expect(cfg.selfServeDays).toBe(60);
    expect(cfg.adminDays).toBe(90);
    expect(cfg.amnestyDeadline?.toISOString()).toBe(amnestyDeadlineFromEndDate('2026-12-31').toISOString());
  });

  it('a PRESENT-but-blank amnesty date turns the amnesty OFF', () => {
    applyGraceSettings([{ setting_key: GRACE_SETTING_KEYS.amnestyEndDate, setting_value: '' }]);
    expect(getGraceConfig().amnestyDeadline).toBeNull();
    expect(MecaIdService.isAmnestyActive()).toBe(false);
    // With no amnesty, both retention windows fall back to the configured days.
    expect(MecaIdService.effectiveRetentionGraceDays()).toBe(45);
    expect(MecaIdService.selfServiceRetentionGraceDays()).toBe(30);
  });

  it('ignores invalid stored values and never lets admin < self-serve', () => {
    applyGraceSettings([
      { setting_key: GRACE_SETTING_KEYS.selfServeDays, setting_value: 'garbage' },
      { setting_key: GRACE_SETTING_KEYS.adminDays, setting_value: '-5' },
      { setting_key: GRACE_SETTING_KEYS.amnestyEndDate, setting_value: 'not-a-date' },
    ]);
    const cfg = getGraceConfig();
    expect(cfg.selfServeDays).toBe(30);
    expect(cfg.adminDays).toBe(45);
    expect(cfg.amnestyEndDate).toBe('2026-08-25'); // default kept

    applyGraceSettings([
      { setting_key: GRACE_SETTING_KEYS.selfServeDays, setting_value: '60' },
      { setting_key: GRACE_SETTING_KEYS.adminDays, setting_value: '40' },
    ]);
    expect(getGraceConfig().adminDays).toBe(60); // clamped up to self-serve
  });

  it('MecaIdService windows are amnesty-blanket while active, configured days after', () => {
    applyGraceSettings([
      { setting_key: GRACE_SETTING_KEYS.selfServeDays, setting_value: '35' },
      { setting_key: GRACE_SETTING_KEYS.adminDays, setting_value: '50' },
      { setting_key: GRACE_SETTING_KEYS.amnestyEndDate, setting_value: '2027-01-15' },
    ]);
    const deadline = MecaIdService.amnestyDeadline()!;
    const before = new Date(deadline.getTime() - 1000);
    const after = new Date(deadline.getTime() + 1000);
    expect(MecaIdService.effectiveRetentionGraceDays(before)).toBe(MecaIdService.RELAUNCH_GRACE_DAYS);
    expect(MecaIdService.selfServiceRetentionGraceDays(before)).toBe(MecaIdService.RELAUNCH_GRACE_DAYS);
    expect(MecaIdService.effectiveRetentionGraceDays(after)).toBe(50);
    expect(MecaIdService.selfServiceRetentionGraceDays(after)).toBe(35);
  });

  it('validateGraceSettings rejects bad input and passes normalized values through', () => {
    expect(() => validateGraceSettings({ selfServeDays: 0, adminDays: 45 })).toThrow(/Self-service/);
    expect(() => validateGraceSettings({ selfServeDays: 30, adminDays: 10 })).toThrow(/Admin grace/);
    expect(() => validateGraceSettings({ selfServeDays: 30, adminDays: 45, amnestyEndDate: '08/25/2026' })).toThrow(/YYYY-MM-DD/);
    expect(validateGraceSettings({ selfServeDays: 30, adminDays: 45, amnestyEndDate: '' }))
      .toEqual({ selfServeDays: 30, adminDays: 45, amnestyEndDate: null });
    expect(validateGraceSettings({ selfServeDays: 20, adminDays: 40, amnestyEndDate: '2026-10-01' }))
      .toEqual({ selfServeDays: 20, adminDays: 40, amnestyEndDate: '2026-10-01' });
  });
});
