import { Request, Response } from 'express';
import { RulebookService } from './service';

export class RulebookController {
  private service: RulebookService;

  constructor() {
    this.service = new RulebookService();
  }

  async getRulebook(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const rulebook = await this.service.findById(id);
      
      if (!rulebook) {
        res.status(404).json({ error: 'Rulebook not found' });
        return;
      }

      res.json(rulebook);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createRulebook(req: Request, res: Response): Promise<void> {
    try {
      const rulebook = await this.service.create(req.body);
      res.status(201).json(rulebook);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateRulebook(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const rulebook = await this.service.update(id, req.body);
      res.json(rulebook);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteRulebook(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listRulebooks(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const rulebooks = await this.service.findAll(page, limit);
      res.json(rulebooks);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getActiveRulebooks(req: Request, res: Response): Promise<void> {
    try {
      const rulebooks = await this.service.findActive();
      res.json(rulebooks);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
