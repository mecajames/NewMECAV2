import { AnnouncementType } from '@newmeca/shared';
import { AlertTriangle, Bell, Info, Wrench, type LucideIcon } from 'lucide-react';

export interface AnnouncementStyle {
  label: string;
  /** Default panel background (overridable per announcement). */
  panelColor: string;
  /** Default text color (overridable per announcement). */
  textColor: string;
  Icon: LucideIcon;
}

/** Per-type defaults: drive the banner's color + icon when no override is set. */
export const ANNOUNCEMENT_TYPE_STYLES: Record<AnnouncementType, AnnouncementStyle> = {
  [AnnouncementType.WARNING]: {
    label: 'Warning',
    panelColor: '#b45309',
    textColor: '#ffffff',
    Icon: AlertTriangle,
  },
  [AnnouncementType.NOTIFICATION]: {
    label: 'Notification',
    panelColor: '#1d4ed8',
    textColor: '#ffffff',
    Icon: Bell,
  },
  [AnnouncementType.INFO]: {
    label: 'Informational',
    panelColor: '#334155',
    textColor: '#ffffff',
    Icon: Info,
  },
  [AnnouncementType.MAINTENANCE]: {
    label: 'Maintenance',
    panelColor: '#b91c1c',
    textColor: '#ffffff',
    Icon: Wrench,
  },
};

export function styleForType(type: AnnouncementType): AnnouncementStyle {
  return ANNOUNCEMENT_TYPE_STYLES[type] ?? ANNOUNCEMENT_TYPE_STYLES[AnnouncementType.INFO];
}
