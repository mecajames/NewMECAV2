import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketAdminController } from './ticket-admin.controller';
import { TicketGuestController } from './ticket-guest.controller';
import { TicketDepartmentsService } from './ticket-departments.service';
import { TicketStaffService } from './ticket-staff.service';
import { TicketRoutingService } from './ticket-routing.service';
import { TicketSettingsService } from './ticket-settings.service';
import { TicketGuestService } from './ticket-guest.service';
import { StaffSignaturesService } from './staff-signatures.service';
import { StaffSignaturesController } from './staff-signatures.controller';
import { SavedTicketFiltersService } from './saved-ticket-filters.service';
import { SavedTicketFiltersController } from './saved-ticket-filters.controller';
import { TicketCannedResponsesService } from './ticket-canned-responses.service';
import { TicketCannedResponsesController } from './ticket-canned-responses.controller';
import { TicketSystemFiltersController } from './ticket-system-filters.controller';

@Module({
  imports: [UploadsModule],
  controllers: [
    TicketsController,
    TicketAdminController,
    TicketGuestController,
    StaffSignaturesController,
    SavedTicketFiltersController,
    TicketCannedResponsesController,
    TicketSystemFiltersController,
  ],
  providers: [
    TicketsService,
    TicketDepartmentsService,
    TicketStaffService,
    TicketRoutingService,
    TicketSettingsService,
    TicketGuestService,
    StaffSignaturesService,
    SavedTicketFiltersService,
    TicketCannedResponsesService,
  ],
  exports: [
    TicketsService,
    TicketDepartmentsService,
    TicketStaffService,
    TicketRoutingService,
    TicketSettingsService,
    TicketGuestService,
    StaffSignaturesService,
    SavedTicketFiltersService,
    TicketCannedResponsesService,
  ],
})
export class TicketsModule {}
