import { Request, Response } from 'express';
import { MembershipService } from './service';

export class MembershipController {
  private service: MembershipService;

  constructor() {
    this.service = new MembershipService();
  }

  async getMembership(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const membership = await this.service.findById(id);
      
      if (!membership) {
        res.status(404).json({ error: 'Membership not found' });
        return;
      }

      res.json(membership);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createMembership(req: Request, res: Response): Promise<void> {
    try {
      const membership = await this.service.create(req.body);
      res.status(201).json(membership);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateMembership(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const membership = await this.service.update(id, req.body);
      res.json(membership);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteMembership(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserActiveMembership(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const membership = await this.service.getActiveMembership(userId);
      
      if (!membership) {
        res.status(404).json({ error: 'No active membership found' });
        return;
      }

      res.json(membership);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async renewMembership(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { membershipType } = req.body;
      const membership = await this.service.renewMembership(userId, membershipType);
      res.json(membership);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
