import axios from 'axios';

const API_BASE = '/api/championship-archives';

export interface ChampionshipArchive {
  id: string;
  season_id: string;
  year: number;
  title: string;
  hero_image_url?: string;
  world_finals_event_id?: string;
  published: boolean;
  special_awards_content?: any;
  club_awards_content?: any;
  additional_content?: any;
  created_at: string;
  updated_at: string;
}

export interface ChampionshipAward {
  id: string;
  archive_id: string;
  section: 'special_awards' | 'club_awards';
  award_name: string;
  recipient_name: string;
  recipient_team?: string;
  recipient_state?: string;
  description?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const championshipArchivesApi = {
  /**
   * Get all archives
   */
  getAll: async (includeUnpublished = false): Promise<ChampionshipArchive[]> => {
    const response = await axios.get(API_BASE, {
      params: { includeUnpublished: includeUnpublished ? 'true' : 'false' },
    });
    return response.data;
  },

  /**
   * Get archive by year
   */
  getByYear: async (year: number, includeUnpublished = false): Promise<ChampionshipArchive> => {
    const response = await axios.get(`${API_BASE}/year/${year}`, {
      params: { includeUnpublished: includeUnpublished ? 'true' : 'false' },
    });
    return response.data;
  },

  /**
   * Get archive by ID
   */
  getById: async (id: string): Promise<ChampionshipArchive> => {
    const response = await axios.get(`${API_BASE}/${id}`);
    return response.data;
  },

  /**
   * Get competition results for a year
   */
  getResultsForYear: async (year: number): Promise<any> => {
    const response = await axios.get(`${API_BASE}/year/${year}/results`);
    return response.data;
  },

  /**
   * Get state champions for a year
   */
  getStateChampionsForYear: async (year: number): Promise<any> => {
    const response = await axios.get(`${API_BASE}/year/${year}/state-champions`);
    return response.data;
  },

  /**
   * Create new archive (admin)
   */
  create: async (data: Partial<ChampionshipArchive>): Promise<ChampionshipArchive> => {
    const response = await axios.post(API_BASE, data);
    return response.data;
  },

  /**
   * Update archive (admin)
   */
  update: async (id: string, data: Partial<ChampionshipArchive>): Promise<ChampionshipArchive> => {
    const response = await axios.put(`${API_BASE}/${id}`, data);
    return response.data;
  },

  /**
   * Publish/unpublish archive (admin)
   */
  setPublished: async (id: string, published: boolean): Promise<ChampionshipArchive> => {
    const response = await axios.put(`${API_BASE}/${id}/publish`, { published });
    return response.data;
  },

  /**
   * Delete archive (admin)
   */
  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/${id}`);
  },

  // ===== AWARDS =====

  /**
   * Get all awards for an archive
   */
  getAwards: async (archiveId: string, section?: string): Promise<ChampionshipAward[]> => {
    const response = await axios.get(`${API_BASE}/${archiveId}/awards`, {
      params: section ? { section } : {},
    });
    return response.data;
  },

  /**
   * Create award (admin)
   */
  createAward: async (archiveId: string, data: Partial<ChampionshipAward>): Promise<ChampionshipAward> => {
    const response = await axios.post(`${API_BASE}/${archiveId}/awards`, data);
    return response.data;
  },

  /**
   * Update award (admin)
   */
  updateAward: async (archiveId: string, awardId: string, data: Partial<ChampionshipAward>): Promise<ChampionshipAward> => {
    const response = await axios.put(`${API_BASE}/${archiveId}/awards/${awardId}`, data);
    return response.data;
  },

  /**
   * Delete award (admin)
   */
  deleteAward: async (archiveId: string, awardId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/${archiveId}/awards/${awardId}`);
  },
};
