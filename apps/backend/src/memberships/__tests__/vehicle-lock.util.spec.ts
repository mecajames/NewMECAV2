import { BadRequestException } from '@nestjs/common';
import { assertVehicleChangeAllowed } from '../vehicle-lock.util';

describe('assertVehicleChangeAllowed', () => {
  const onFile = {
    vehicleMake: 'Toyota',
    vehicleModel: 'Camry',
    vehicleColor: 'Blue',
    vehicleLicensePlate: 'ABC1234',
  };

  it('allows an admin to change anything', () => {
    expect(() =>
      assertVehicleChangeAllowed(onFile, { vehicleMake: 'Honda' }, true),
    ).not.toThrow();
  });

  it('allows a member to fill fields that are still empty', () => {
    const partial = { ...onFile, vehicleColor: undefined, vehicleLicensePlate: '' };
    expect(() =>
      assertVehicleChangeAllowed(partial, { vehicleColor: 'Red', vehicleLicensePlate: 'XYZ999' }, false),
    ).not.toThrow();
  });

  it('allows re-submitting the identical values (case/whitespace-insensitive)', () => {
    expect(() =>
      assertVehicleChangeAllowed(onFile, {
        vehicleMake: '  toyota ',
        vehicleModel: 'CAMRY',
        vehicleColor: 'blue',
        vehicleLicensePlate: 'abc1234',
      }, false),
    ).not.toThrow();
  });

  it('rejects a member changing an existing value and names the locked fields', () => {
    expect(() =>
      assertVehicleChangeAllowed(onFile, { vehicleMake: 'Honda', vehicleModel: 'Civic' }, false),
    ).toThrow(BadRequestException);
    try {
      assertVehicleChangeAllowed(onFile, { vehicleMake: 'Honda', vehicleModel: 'Civic' }, false);
    } catch (err: any) {
      expect(err.message).toContain('make');
      expect(err.message).toContain('model');
      expect(err.message).toContain('support ticket');
    }
  });

  it('ignores fields not included in the update', () => {
    expect(() => assertVehicleChangeAllowed(onFile, {}, false)).not.toThrow();
    expect(() =>
      assertVehicleChangeAllowed(onFile, { vehicleColor: 'Blue' }, false),
    ).not.toThrow();
  });
});
