#!/bin/bash

# Apply the phone and notification fields migration
echo "Applying migration: 0006_add_phone_and_notification_fields.sql"

# Extract the database URL from .env
DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2 | tr -d '"')

# Run the migration against the database
psql "$DATABASE_URL" -f migrations/0006_add_phone_and_notification_fields.sql

echo "Migration applied successfully!"

# Verify the changes
echo "Verifying the changes..."
psql "$DATABASE_URL" -c "\d user"
