import { BadRequestException } from '@nestjs/common';
import { Membership } from './memberships.entity';

export interface VehicleFields {
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehicleLicensePlate?: string;
}

const VEHICLE_FIELD_LABELS: Record<keyof VehicleFields, string> = {
  vehicleMake: 'make',
  vehicleModel: 'model',
  vehicleColor: 'color',
  vehicleLicensePlate: 'license plate',
};

const normalize = (v: string | undefined | null): string => (v ?? '').trim().toLowerCase();

/**
 * Enforce the vehicle lock: the vehicle attached to a membership/MECA ID is
 * set once. Non-admin callers may FILL fields that are still empty (e.g. a
 * legacy membership created before checkout collected the vehicle), but any
 * CHANGE to an existing value requires a support ticket, which MECA staff
 * action with an admin edit. Re-submitting the identical value is allowed so
 * save-everything forms don't false-positive.
 *
 * Throws BadRequestException listing the locked fields; admins bypass.
 */
export function assertVehicleChangeAllowed(
  membership: Pick<Membership, 'vehicleMake' | 'vehicleModel' | 'vehicleColor' | 'vehicleLicensePlate'>,
  incoming: VehicleFields,
  isAdmin: boolean,
): void {
  if (isAdmin) return;

  const lockedChanges = (Object.keys(VEHICLE_FIELD_LABELS) as Array<keyof VehicleFields>)
    .filter((field) => {
      const next = incoming[field];
      if (next === undefined) return false; // not part of this update
      const current = membership[field];
      if (!normalize(current)) return false; // empty — filling is allowed
      return normalize(current) !== normalize(next);
    })
    .map((field) => VEHICLE_FIELD_LABELS[field]);

  if (lockedChanges.length > 0) {
    throw new BadRequestException(
      `Vehicle details are locked once set — the ${lockedChanges.join(', ')} on file can only be changed by MECA staff. ` +
      `Please submit a support ticket (Support → New Ticket) describing the change you need.`,
    );
  }
}
