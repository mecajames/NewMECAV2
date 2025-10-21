import { Request, Response } from 'express';
import { EventRegistrationService } from './service';

export class EventRegistrationController {
  private service: EventRegistrationService;

  constructor() {
    this.service = new EventRegistrationService();
  }

  async getRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const registration = await this.service.findById(id);
      
      if (!registration) {
        res.status(404).json({ error: 'Registration not found' });
        return;
      }

      res.json(registration);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createRegistration(req: Request, res: Response): Promise<void> {
    try {
      const registration = await this.service.create(req.body);
      res.status(201).json(registration);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const registration = await this.service.update(id, req.body);
      res.json(registration);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async confirmRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const registration = await this.service.confirmRegistration(id);
      res.json(registration);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async cancelRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const registration = await this.service.cancelRegistration(id);
      res.json(registration);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
