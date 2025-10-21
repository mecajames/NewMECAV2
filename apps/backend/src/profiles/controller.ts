import { Request, Response } from 'express';
import { ProfileService } from './service';

export class ProfileController {
  private profileService: ProfileService;

  constructor() {
    this.profileService = new ProfileService();
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const profile = await this.profileService.findById(id);
      
      if (!profile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createProfile(req: Request, res: Response): Promise<void> {
    try {
      const profile = await this.profileService.create(req.body);
      res.status(201).json(profile);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const profile = await this.profileService.update(id, req.body);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.profileService.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listProfiles(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const profiles = await this.profileService.findAll(page, limit);
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
