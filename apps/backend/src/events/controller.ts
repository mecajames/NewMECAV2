import { Request, Response } from 'express';
import { EventService } from './service';

export class EventController {
  private eventService: EventService;

  constructor() {
    this.eventService = new EventService();
  }

  async getEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const event = await this.eventService.findById(id);
      
      if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }

      res.json(event);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createEvent(req: Request, res: Response): Promise<void> {
    try {
      const event = await this.eventService.create(req.body);
      res.status(201).json(event);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const event = await this.eventService.update(id, req.body);
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.eventService.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listEvents(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const events = await this.eventService.findAll(page, limit);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUpcomingEvents(req: Request, res: Response): Promise<void> {
    try {
      const events = await this.eventService.findUpcoming();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
