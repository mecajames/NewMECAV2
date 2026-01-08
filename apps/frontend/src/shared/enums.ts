// Local copy of enums from @newmeca/shared for frontend bundle compatibility
// These must stay in sync with packages/shared/src/schemas/enums.schema.ts

export enum EventAssignmentStatus {
  REQUESTED = 'requested',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

export enum EventAssignmentRole {
  PRIMARY = 'primary',
  SUPPORTING = 'supporting',
  TRAINEE = 'trainee',
}

export enum AssignmentRequestType {
  ED_REQUEST = 'ed_request',
  JUDGE_VOLUNTEER = 'judge_volunteer',
  ADMIN_ASSIGNED = 'admin_assign',
}

export enum RatingEntityType {
  JUDGE = 'judge',
  EVENT_DIRECTOR = 'event_director',
}
