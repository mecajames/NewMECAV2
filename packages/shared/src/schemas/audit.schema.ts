import { z } from "zod";
import { EntryMethodSchema, AuditActionSchema } from "./enums.schema";

// Create Session DTO
export const CreateAuditSessionSchema = z.object({
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
  entryMethod: EntryMethodSchema,
  format: z.string().optional(),
  filePath: z.string().optional(),
  originalFilename: z.string().optional(),
});
export type CreateAuditSessionDto = z.infer<typeof CreateAuditSessionSchema>;

// Results Entry Session Schema
export const ResultsEntrySessionSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
  entryMethod: EntryMethodSchema,
  format: z.string().nullable(),
  filePath: z.string().nullable(),
  originalFilename: z.string().nullable(),
  resultCount: z.number(),
  sessionStart: z.coerce.date(),
  sessionEnd: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type ResultsEntrySession = z.infer<typeof ResultsEntrySessionSchema>;

// Log Action DTO
export const LogAuditActionSchema = z.object({
  sessionId: z.string().uuid().optional(),
  resultId: z.string().uuid().optional(),
  action: AuditActionSchema,
  oldData: z.record(z.string(), z.unknown()).nullable(),
  newData: z.record(z.string(), z.unknown()).nullable(),
  userId: z.string().uuid(),
  ipAddress: z.string().optional(),
});
export type LogAuditActionDto = z.infer<typeof LogAuditActionSchema>;

// Results Audit Log Schema
export const ResultsAuditLogSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid().nullable(),
  resultId: z.string().uuid().nullable(),
  userId: z.string().uuid().nullable(),
  action: AuditActionSchema,
  oldData: z.record(z.string(), z.unknown()).nullable(),
  newData: z.record(z.string(), z.unknown()).nullable(),
  timestamp: z.coerce.date(),
});
export type ResultsAuditLog = z.infer<typeof ResultsAuditLogSchema>;

// Session with Entries Response
export const SessionWithEntriesSchema = ResultsEntrySessionSchema.extend({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
  }).nullable(),
  entries: z.array(z.object({
    id: z.string().uuid(),
    competitorName: z.string(),
    competitionClass: z.string(),
    format: z.string(),
    score: z.union([z.number(), z.string()]),
    placement: z.union([z.number(), z.string()]),
    pointsEarned: z.number(),
    mecaId: z.string().nullable(),
    timestamp: z.coerce.date(),
  })),
});
export type SessionWithEntries = z.infer<typeof SessionWithEntriesSchema>;

// All Logs Response
export const EventAllLogsSchema = z.object({
  imports: z.array(SessionWithEntriesSchema),
  modifications: z.array(ResultsAuditLogSchema),
  deletions: z.array(ResultsAuditLogSchema),
});
export type EventAllLogs = z.infer<typeof EventAllLogsSchema>;

