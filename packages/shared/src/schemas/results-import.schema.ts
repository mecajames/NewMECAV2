import { z } from 'zod';

// Parsed Result from file import
export const ParsedResultSchema = z.object({
  memberID: z.string(),
  name: z.string(),
  class: z.string(),
  classAbbreviation: z.string(),
  score: z.number(),
  placement: z.number().optional(),
  points: z.number().optional(),
  vehicleInfo: z.string().optional(),
  format: z.string().optional(),
  wattage: z.number().optional(),
  frequency: z.number().optional(),
});
export type ParsedResult = z.infer<typeof ParsedResultSchema>;

// Array of parsed results
export const ParsedResultsSchema = z.array(ParsedResultSchema);
export type ParsedResults = z.infer<typeof ParsedResultsSchema>;
