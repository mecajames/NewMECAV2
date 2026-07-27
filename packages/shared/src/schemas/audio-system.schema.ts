import { z } from 'zod';

// Structured car-audio-system description stored on profiles.audio_system (jsonb).
// Every component is free text so members can describe brands/quantities however
// they like; the structure exists so the profile, admin, and public views can
// render a consistent labeled breakdown.
export const AudioSystemSchema = z.object({
  source_unit: z.string().max(300).optional(),
  amplifiers: z.string().max(500).optional(),
  subwoofers: z.string().max(500).optional(),
  speakers: z.string().max(500).optional(),
  sound_deadening: z.string().max(300).optional(),
  signal_processing: z.string().max(300).optional(),
  power_wire: z.string().max(300).optional(),
  batteries: z.string().max(300).optional(),
  other: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
});
export type AudioSystem = z.infer<typeof AudioSystemSchema>;

export interface AudioSystemComponentField {
  key: Exclude<keyof AudioSystem, 'description'>;
  label: string;
  placeholder: string;
}

// Ordered component fields for form rendering + display (description is a
// separate long-form textarea and intentionally not in this list).
export const AUDIO_SYSTEM_COMPONENT_FIELDS: AudioSystemComponentField[] = [
  { key: 'source_unit', label: 'Source / Head Unit', placeholder: 'e.g., Pioneer DMH-WT8600NEX' },
  { key: 'amplifiers', label: 'Amplifiers', placeholder: 'e.g., 2x Rockford Fosgate T2500-1bdCP' },
  { key: 'subwoofers', label: 'Subwoofers', placeholder: 'e.g., 4x Sundown Zv6 15"' },
  { key: 'speakers', label: 'Speakers', placeholder: 'e.g., JL Audio C7 component set' },
  { key: 'sound_deadening', label: 'Sound Deadening', placeholder: 'e.g., Dynamat Xtreme, full treatment' },
  { key: 'signal_processing', label: 'Signal Processing', placeholder: 'e.g., AudioControl DM-810 DSP' },
  { key: 'power_wire', label: 'Power Wire', placeholder: 'e.g., 4 runs of 1/0 AWG OFC' },
  { key: 'batteries', label: 'Batteries / Electrical', placeholder: 'e.g., 2x XS Power D3400, 320A alternator' },
  { key: 'other', label: 'Other Equipment', placeholder: 'e.g., custom fiberglass enclosure' },
];

/** True when at least one component or the description has content. */
export function hasAudioSystemContent(audio: AudioSystem | null | undefined): boolean {
  if (!audio) return false;
  return Object.values(audio).some((v) => typeof v === 'string' && v.trim().length > 0);
}

/** One-line summary (components joined) for compact displays like the member directory. */
export function summarizeAudioSystem(audio: AudioSystem | null | undefined): string {
  if (!audio) return '';
  return AUDIO_SYSTEM_COMPONENT_FIELDS
    .map((f) => audio[f.key])
    .filter((v): v is string => !!v && v.trim().length > 0)
    .map((v) => v.trim())
    .join(' • ');
}
