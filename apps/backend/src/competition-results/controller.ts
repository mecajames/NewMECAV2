import { Request, Response } from 'express';
import { CompetitionResultService } from './service';

export class CompetitionResultController {
  private service: CompetitionResultService;

  constructor() {
    this.service = new CompetitionResultService();
  }

  async getResult(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.findById(id);
      
      if (!result) {
        res.status(404).json({ error: 'Result not found' });
        return;
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createResult(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.create(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateResult(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.update(id, req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteResult(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getEventLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const results = await this.service.getLeaderboard(eventId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
