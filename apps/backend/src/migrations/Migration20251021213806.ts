import { Migration } from '@mikro-orm/migrations';

export class Migration20251021213806 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "profiles" ("id" uuid not null, "email" text not null, "full_name" text not null, "phone" text null, "role" text check ("role" in ('user', 'event_director', 'retailer', 'admin')) not null default 'user', "membership_status" text check ("membership_status" in ('none', 'active', 'expired')) not null default 'none', "membership_expiry" timestamptz null, "avatar_url" text null, "bio" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "profiles_pkey" primary key ("id"));`);

    this.addSql(`create table "memberships" ("id" uuid not null, "user_id" uuid not null, "membership_type" text check ("membership_type" in ('annual', 'lifetime')) not null, "start_date" timestamptz not null, "end_date" timestamptz null, "amount_paid" numeric(10,2) not null, "payment_status" text check ("payment_status" in ('pending', 'paid', 'refunded')) not null default 'pending', "transaction_id" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "memberships_pkey" primary key ("id"));`);

    this.addSql(`create table "events" ("id" uuid not null, "title" text not null, "description" text null, "event_date" timestamptz not null, "registration_deadline" timestamptz null, "venue_name" text not null, "venue_address" text not null, "latitude" numeric(10,8) null, "longitude" numeric(11,8) null, "flyer_url" text null, "event_director_id" uuid null, "status" text check ("status" in ('upcoming', 'ongoing', 'completed', 'cancelled')) not null default 'upcoming', "max_participants" int null, "registration_fee" numeric(10,2) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "events_pkey" primary key ("id"));`);

    this.addSql(`create table "event_registrations" ("id" uuid not null, "event_id" uuid not null, "user_id" uuid not null, "registration_status" text check ("registration_status" in ('pending', 'confirmed', 'cancelled')) not null default 'pending', "payment_status" text check ("payment_status" in ('pending', 'paid', 'refunded')) not null default 'pending', "amount_paid" numeric(10,2) null, "transaction_id" text null, "registered_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "event_registrations_pkey" primary key ("id"));`);

    this.addSql(`create table "competition_results" ("id" uuid not null, "event_id" uuid not null, "competitor_id" uuid not null, "category" text null, "placement" int null, "score_sound" numeric(10,2) null, "score_install" numeric(10,2) null, "score_overall" numeric(10,2) null, "notes" text null, "created_by" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "competition_results_pkey" primary key ("id"));`);

    this.addSql(`create table "rulebooks" ("id" uuid not null, "title" text not null, "year" int not null, "category" text null, "description" text null, "file_url" text not null, "is_active" boolean not null default true, "display_order" int null, "summary_points" jsonb null, "uploaded_by" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "rulebooks_pkey" primary key ("id"));`);

    this.addSql(`alter table "memberships" add constraint "memberships_user_id_foreign" foreign key ("user_id") references "profiles" ("id") on update cascade;`);

    this.addSql(`alter table "events" add constraint "events_event_director_id_foreign" foreign key ("event_director_id") references "profiles" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "event_registrations" add constraint "event_registrations_event_id_foreign" foreign key ("event_id") references "events" ("id") on update cascade;`);
    this.addSql(`alter table "event_registrations" add constraint "event_registrations_user_id_foreign" foreign key ("user_id") references "profiles" ("id") on update cascade;`);

    this.addSql(`alter table "competition_results" add constraint "competition_results_event_id_foreign" foreign key ("event_id") references "events" ("id") on update cascade;`);
    this.addSql(`alter table "competition_results" add constraint "competition_results_competitor_id_foreign" foreign key ("competitor_id") references "profiles" ("id") on update cascade;`);
    this.addSql(`alter table "competition_results" add constraint "competition_results_created_by_foreign" foreign key ("created_by") references "profiles" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "rulebooks" add constraint "rulebooks_uploaded_by_foreign" foreign key ("uploaded_by") references "profiles" ("id") on update cascade on delete set null;`);
  }

}
