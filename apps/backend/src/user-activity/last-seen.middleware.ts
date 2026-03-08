import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserActivityService } from './user-activity.service';

@Injectable()
export class LastSeenMiddleware implements NestMiddleware {
  constructor(private readonly userActivityService: UserActivityService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const userId = req.headers['x-user-id'] as string | undefined;

    if (userId) {
      // Fire-and-forget: don't block the request
      this.userActivityService.updateLastSeen(userId).catch(() => {});
    }

    next();
  }
}
