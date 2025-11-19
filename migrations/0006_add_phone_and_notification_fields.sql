ALTER TABLE "user" ADD COLUMN "phone" varchar(20);
ALTER TABLE "user" ADD COLUMN "sms_notifications" boolean NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN "push_notifications" boolean NOT NULL DEFAULT true;
CREATE TABLE "push_subscriptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
