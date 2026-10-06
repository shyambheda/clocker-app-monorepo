-- Database roles (Phase 2). Custom SQL: drizzle-kit does not make roles.
-- The statements are idempotent, so a second run does not fail.
--
-- app_user: the runtime role of the API and the worker. Row Level Security applies to it.
-- It can read and write rows, but it cannot change the schema (no DDL).
-- The migrate script sets its password from DATABASE_URL (src/db/migrator.ts).
-- admin_user (the RLS-bypassing role of the admin module) comes in Phase 4.
--
-- Only CREATE ROLE sets the attributes. ALTER ROLE ... NOSUPERUSER needs a real superuser,
-- and Neon does not give one.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION;
  END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO app_user', current_database());
END
$$;
--> statement-breakpoint
-- No role except the owner can make objects in the public schema (the default from Postgres 15).
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_user;
--> statement-breakpoint
-- Tables and sequences that the migration role makes later. app_user gets data rights only.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
--> statement-breakpoint
-- Session settings for each connection of app_user.
ALTER ROLE app_user SET timezone = 'UTC';
--> statement-breakpoint
ALTER ROLE app_user SET statement_timeout = '15s';
--> statement-breakpoint
ALTER ROLE app_user SET idle_in_transaction_session_timeout = '30s';
