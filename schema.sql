CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS trips (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),origin text NOT NULL,destination text NOT NULL,departure_at timestamptz NOT NULL,capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 100),fare_bututs integer NOT NULL CHECK(fare_bututs>=0),active boolean NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS reservations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),trip_id uuid NOT NULL REFERENCES trips(id),seat_number integer NOT NULL,customer_name text NOT NULL,customer_phone text NOT NULL,status text NOT NULL CHECK(status IN ('held','confirmed','expired','cancelled')),hold_expires_at timestamptz,amount_bututs integer NOT NULL,provider_payment_id text UNIQUE,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS reservations_trip_seat_idx ON reservations(trip_id,seat_number);
CREATE UNIQUE INDEX IF NOT EXISTS confirmed_seat_unique ON reservations(trip_id,seat_number) WHERE status='confirmed';
CREATE TABLE IF NOT EXISTS payment_events (event_id text PRIMARY KEY,received_at timestamptz NOT NULL DEFAULT now());
