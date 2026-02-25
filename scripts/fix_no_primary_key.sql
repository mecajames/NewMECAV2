-- =============================================================================
-- ADD PRIMARY KEYS TO TABLES MISSING THEM
-- Generated: 2026-02-24
--
-- All 12 tables already had an `id uuid NOT NULL DEFAULT gen_random_uuid()`
-- column — they were just missing the PRIMARY KEY constraint.
-- =============================================================================

BEGIN;
ALTER TABLE public.championship_archives ADD PRIMARY KEY (id);
ALTER TABLE public.championship_awards ADD PRIMARY KEY (id);
ALTER TABLE public.class_name_mappings ADD PRIMARY KEY (id);
ALTER TABLE public.competition_classes ADD PRIMARY KEY (id);
ALTER TABLE public.competition_formats ADD PRIMARY KEY (id);
ALTER TABLE public.moderated_images ADD PRIMARY KEY (id);
ALTER TABLE public.moderation_log ADD PRIMARY KEY (id);
ALTER TABLE public.payments ADD PRIMARY KEY (id);
ALTER TABLE public.quickbooks_connections ADD PRIMARY KEY (id);
ALTER TABLE public.ticket_attachments ADD PRIMARY KEY (id);
ALTER TABLE public.ticket_guest_tokens ADD PRIMARY KEY (id);
ALTER TABLE public.ticket_routing_rules ADD PRIMARY KEY (id);
COMMIT;
