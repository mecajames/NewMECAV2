/**
 * Coverage for the MECA-ID generation overflow bug.
 *
 * The assignable range is 701500-789999. The TOP of the nominal new-system range
 * holds RESERVED/special IDs (799996-800000, 85xxxx, 9xxxxx). Before the fix,
 * generateNextMecaId considered everything < 800000, so a single reserved 799999
 * row made it return "800000" — out of range AND colliding with
 * profiles_meca_id_unique, which threw and broke EVERY downstream profile/member
 * creation (ensureProfile included). These tests prove reserved IDs are ignored.
 */
function makeService(mecaIds: (string | null)[]) {
  const emFork = {
    find: jest.fn().mockResolvedValue(mecaIds.map((meca_id) => ({ meca_id }))),
  };
  const em = { fork: () => emFork };
  const { ProfilesService } = require('../profiles.service');
  return new ProfilesService(em, {} as any, {} as any, {} as any);
}

describe('ProfilesService.generateNextMecaId — reserved-ID overflow', () => {
  it('ignores reserved high IDs and continues the normal block', async () => {
    // 701521 is the real max normal member; the rest are reserved/legacy.
    const svc = makeService(['701521', '799996', '799999', '800000', '850003', '999196']);
    expect(await svc.generateNextMecaId()).toBe('701522');
  });

  it('starts at 701501 when no IDs exist in the normal block', async () => {
    const svc = makeService(['800000', '999196', null]);
    expect(await svc.generateNextMecaId()).toBe('701501');
  });

  it('returns max+1 within the normal block', async () => {
    const svc = makeService(['701500', '701505', '701502']);
    expect(await svc.generateNextMecaId()).toBe('701506');
  });

  it('throws (does not silently overflow) when the assignable range is exhausted', async () => {
    const svc = makeService(['789999']);
    await expect(svc.generateNextMecaId()).rejects.toThrow(/range exhausted/i);
  });
});
