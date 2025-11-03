import { Migration } from '@mikro-orm/migrations';

export class Migration20251101172851 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "notifications" ("id" uuid not null, "user_id" uuid not null, "from_user_id" uuid null, "title" text not null, "message" text not null, "type" text not null default 'message', "read" boolean not null default false, "link" text null, "created_at" timestamptz not null, "read_at" timestamptz null, constraint "notifications_pkey" primary key ("id"));`);

    this.addSql(`create table "media_files" ("id" uuid not null, "title" text not null, "description" text null, "file_url" text not null, "file_type" text not null, "file_size" bigint not null default 0, "mime_type" text not null, "dimensions" text null, "is_external" boolean not null default false, "tags" text[] null, "created_by" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "media_files_pkey" primary key ("id"));`);

    this.addSql(`create table "seasons" ("id" uuid not null, "year" int not null, "name" text not null, "start_date" date not null, "end_date" date not null, "is_current" boolean not null default false, "is_next" boolean not null default false, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "seasons_pkey" primary key ("id"));`);

    this.addSql(`create table "site_settings" ("id" uuid not null, "setting_key" text not null, "setting_value" text not null, "setting_type" text not null, "description" text null, "updated_by" text not null, "updated_at" timestamptz not null, constraint "site_settings_pkey" primary key ("id"));`);
    this.addSql(`alter table "site_settings" add constraint "site_settings_setting_key_unique" unique ("setting_key");`);

    this.addSql(`alter table "notifications" add constraint "notifications_user_id_foreign" foreign key ("user_id") references "profiles" ("id") on update cascade;`);
    this.addSql(`alter table "notifications" add constraint "notifications_from_user_id_foreign" foreign key ("from_user_id") references "profiles" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "media_files" add constraint "media_files_created_by_foreign" foreign key ("created_by") references "profiles" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "profiles" drop constraint if exists "profiles_role_check";`);
    this.addSql(`alter table "profiles" drop constraint if exists "profiles_membership_status_check";`);

    this.addSql(`alter table "competition_results" drop constraint "competition_results_created_by_foreign";`);
    this.addSql(`alter table "competition_results" drop constraint "competition_results_competitor_id_foreign";`);

    this.addSql(`alter table "rulebooks" drop constraint "rulebooks_uploaded_by_foreign";`);

    this.addSql(`alter table "profiles" add column "meca_id" text null;`);
    this.addSql(`alter table "profiles" alter column "email" type text using ("email"::text);`);
    this.addSql(`alter table "profiles" alter column "email" drop not null;`);
    this.addSql(`alter table "profiles" alter column "full_name" type text using ("full_name"::text);`);
    this.addSql(`alter table "profiles" alter column "full_name" drop not null;`);
    this.addSql(`alter table "profiles" alter column "role" drop default;`);
    this.addSql(`alter table "profiles" alter column "role" type text using ("role"::text);`);
    this.addSql(`alter table "profiles" alter column "role" drop not null;`);
    this.addSql(`alter table "profiles" alter column "membership_status" drop default;`);
    this.addSql(`alter table "profiles" alter column "membership_status" type text using ("membership_status"::text);`);
    this.addSql(`alter table "profiles" alter column "membership_status" drop not null;`);
    this.addSql(`alter table "profiles" add constraint "profiles_meca_id_unique" unique ("meca_id");`);

    this.addSql(`alter table "competition_results" add column "competitor_name" text not null, add column "competition_class" text not null, add column "score" numeric(10,2) not null, add column "points_earned" int not null, add column "season_id" uuid null, add column "class_id" uuid null;`);
    this.addSql(`alter table "competition_results" alter column "competitor_id" drop default;`);
    this.addSql(`alter table "competition_results" alter column "competitor_id" type uuid using ("competitor_id"::text::uuid);`);
    this.addSql(`alter table "competition_results" alter column "competitor_id" drop not null;`);
    this.addSql(`alter table "competition_results" alter column "placement" type int using ("placement"::int);`);
    this.addSql(`alter table "competition_results" alter column "placement" set not null;`);
    this.addSql(`alter table "competition_results" alter column "created_by" drop default;`);
    this.addSql(`alter table "competition_results" alter column "created_by" type uuid using ("created_by"::text::uuid);`);
    this.addSql(`alter table "competition_results" alter column "created_by" set not null;`);
    this.addSql(`alter table "competition_results" rename column "category" to "vehicle_info";`);
    this.addSql(`alter table "competition_results" add constraint "competition_results_competitor_id_foreign" foreign key ("competitor_id") references "profiles" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "rulebooks" alter column "category" type text using ("category"::text);`);
    this.addSql(`alter table "rulebooks" alter column "category" set not null;`);
    this.addSql(`alter table "rulebooks" rename column "file_url" to "pdf_url";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "competition_results" drop constraint "competition_results_competitor_id_foreign";`);

    this.addSql(`alter table "profiles" drop constraint "profiles_meca_id_unique";`);

    this.addSql(`alter table "profiles" alter column "email" type text using ("email"::text);`);
    this.addSql(`alter table "profiles" alter column "email" set not null;`);
    this.addSql(`alter table "profiles" alter column "full_name" type text using ("full_name"::text);`);
    this.addSql(`alter table "profiles" alter column "full_name" set not null;`);
    this.addSql(`alter table "profiles" alter column "role" type text using ("role"::text);`);
    this.addSql(`alter table "profiles" alter column "role" set default 'user';`);
    this.addSql(`alter table "profiles" alter column "role" set not null;`);
    this.addSql(`alter table "profiles" alter column "membership_status" type text using ("membership_status"::text);`);
    this.addSql(`alter table "profiles" alter column "membership_status" set default 'none';`);
    this.addSql(`alter table "profiles" alter column "membership_status" set not null;`);
    this.addSql(`alter table "profiles" add constraint "profiles_role_check" check("role" in ('user', 'event_director', 'retailer', 'admin'));`);
    this.addSql(`alter table "profiles" add constraint "profiles_membership_status_check" check("membership_status" in ('none', 'active', 'expired'));`);

    this.addSql(`alter table "competition_results" add column "score_sound" numeric(10,2) null, add column "score_install" numeric(10,2) null, add column "score_overall" numeric(10,2) null;`);
    this.addSql(`alter table "competition_results" alter column "competitor_id" drop default;`);
    this.addSql(`alter table "competition_results" alter column "competitor_id" type uuid using ("competitor_id"::text::uuid);`);
    this.addSql(`alter table "competition_results" alter column "competitor_id" set not null;`);
    this.addSql(`alter table "competition_results" alter column "placement" type int using ("placement"::int);`);
    this.addSql(`alter table "competition_results" alter column "placement" drop not null;`);
    this.addSql(`alter table "competition_results" alter column "created_by" drop default;`);
    this.addSql(`alter table "competition_results" alter column "created_by" type uuid using ("created_by"::text::uuid);`);
    this.addSql(`alter table "competition_results" alter column "created_by" drop not null;`);
    this.addSql(`alter table "competition_results" rename column "vehicle_info" to "category";`);
    this.addSql(`alter table "competition_results" add constraint "competition_results_created_by_foreign" foreign key ("created_by") references "profiles" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "competition_results" add constraint "competition_results_competitor_id_foreign" foreign key ("competitor_id") references "profiles" ("id") on update cascade;`);

    this.addSql(`alter table "rulebooks" add column "uploaded_by" uuid null;`);
    this.addSql(`alter table "rulebooks" alter column "category" type text using ("category"::text);`);
    this.addSql(`alter table "rulebooks" alter column "category" drop not null;`);
    this.addSql(`alter table "rulebooks" add constraint "rulebooks_uploaded_by_foreign" foreign key ("uploaded_by") references "profiles" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "rulebooks" rename column "pdf_url" to "file_url";`);
  }

}
