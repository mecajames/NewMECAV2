import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketAdminController } from './ticket-admin.controller';
import { TicketGuestController } from './ticket-guest.controller';
import { TicketDepartmentsService } from './ticket-departments.service';
import { TicketStaffService } from './ticket-staff.service';
import { TicketRoutingService } from './ticket-routing.service';
import { TicketSettingsService } from './ticket-settings.service';
import { TicketGuestService } from './ticket-guest.service';

@Module({
  controllers: [TicketsController, TicketAdminController, TicketGuestController],
  providers: [
    TicketsService,
    TicketDepartmentsService,
    TicketStaffService,
    TicketRoutingService,
    TicketSettingsService,
    TicketGuestService,
  ],
  exports: [
    TicketsService,
    TicketDepartmentsService,
    TicketStaffService,
    TicketRoutingService,
    TicketSettingsService,
    TicketGuestService,
  ],
})
export class TicketsModule {}
