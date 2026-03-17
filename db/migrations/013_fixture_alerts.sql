-- Add alert_message to result for delayed/cancelled fixture messaging
ALTER TABLE result ADD COLUMN IF NOT EXISTS alert_message TEXT;
