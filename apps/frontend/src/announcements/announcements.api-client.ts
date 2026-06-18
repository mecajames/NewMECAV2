import axios from '@/lib/axios';
import type {
  Announcement,
  PublicAnnouncement,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from '@newmeca/shared';

/**
 * Announcement banner API. The public `getActive` works for both anonymous and
 * logged-in viewers (the axios instance attaches the auth token when present, so
 * the backend resolves the viewer and returns only the banners they may see).
 */
export const announcementsApi = {
  getActive: async (): Promise<PublicAnnouncement[]> => {
    const { data } = await axios.get<PublicAnnouncement[]>('/api/announcements/active');
    return data;
  },
  adminGetAll: async (): Promise<Announcement[]> => {
    const { data } = await axios.get<Announcement[]>('/api/announcements/admin/all');
    return data;
  },
  adminCreate: async (dto: CreateAnnouncementDto): Promise<Announcement> => {
    const { data } = await axios.post<Announcement>('/api/announcements/admin', dto);
    return data;
  },
  adminUpdate: async (id: string, dto: UpdateAnnouncementDto): Promise<Announcement> => {
    const { data } = await axios.put<Announcement>(`/api/announcements/admin/${id}`, dto);
    return data;
  },
  adminDelete: async (id: string): Promise<void> => {
    await axios.delete(`/api/announcements/admin/${id}`);
  },
};
