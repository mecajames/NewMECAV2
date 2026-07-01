import { Module, forwardRef } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { StripeModule } from '../stripe/stripe.module';
import { PayPalModule } from '../paypal/paypal.module';
import { RefundsModule } from '../payments/refunds.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketAdminController } from './ticket-admin.controller';
import { TicketGuestController } from './ticket-guest.controller';
import { TicketDepartmentsService } from './ticket-departments.service';
import { TicketStaffService } from './ticket-staff.service';
import { TicketRoutingService } from './ticket-routing.service';
import { TicketSettingsService } from './ticket-settings.service';
import { TicketAutoCloseService } from './ticket-auto-close.service';
import { TicketCustomFieldsService } from './ticket-custom-fields.service';
import { TicketCategoriesService } from './ticket-categories.service';
import { TicketPurchasesService } from './ticket-purchases.service';
import { TicketRefundService } from './ticket-refund.service';
import { TicketGuestService } from './ticket-guest.service';
import { StaffSignaturesService } from './staff-signatures.service';
import { StaffSignaturesController } from './staff-signatures.controller';
import { SavedTicketFiltersService } from './saved-ticket-filters.service';
import { SavedTicketFiltersController } from './saved-ticket-filters.controller';
import { TicketCannedResponsesService } from './ticket-canned-responses.service';
import { TicketCannedResponsesController } from './ticket-canned-responses.controller';
import { TicketSystemFiltersController } from './ticket-system-filters.controller';
import { TicketQuickLinksService } from './ticket-quick-links.service';
import { TicketQuickLinksController } from './ticket-quick-links.controller';
import { TicketConfigSyncService } from './ticket-config-sync.service';
import { TicketStaffSetupService } from './ticket-staff-setup.service';

@Module({
  imports: [UploadsModule, forwardRef(() => StripeModule), forwardRef(() => PayPalModule), RefundsModule],
  controllers: [
    TicketsController,
    TicketAdminController,
    TicketGuestController,
    StaffSignaturesController,
    SavedTicketFiltersController,
    TicketCannedResponsesController,
    TicketSystemFiltersController,
    TicketQuickLinksController,
  ],
  providers: [
    TicketsService,
    TicketDepartmentsService,
    TicketStaffService,
    TicketRoutingService,
    TicketSettingsService,
    TicketAutoCloseService,
    TicketCustomFieldsService,
    TicketCategoriesService,
    TicketPurchasesService,
    TicketRefundService,
    TicketGuestService,
    StaffSignaturesService,
    SavedTicketFiltersService,
    TicketCannedResponsesService,
    TicketQuickLinksService,
    TicketConfigSyncService,
    TicketStaffSetupService,
  ],
  exports: [
    TicketsService,
    TicketDepartmentsService,
    TicketStaffService,
    TicketRoutingService,
    TicketSettingsService,
    TicketCustomFieldsService,
    TicketCategoriesService,
    TicketGuestService,
    StaffSignaturesService,
    SavedTicketFiltersService,
    TicketCannedResponsesService,
  ],
})
export class TicketsModule {}
