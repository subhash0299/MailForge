ALTER TABLE users ADD COLUMN full_name TEXT;

CREATE TABLE IF NOT EXISTS workspace_settings (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  date_format TEXT NOT NULL DEFAULT 'dmy' CHECK (date_format IN ('mdy','dmy','ymd')),
  default_sender_email TEXT NOT NULL DEFAULT '',
  default_sender_name TEXT NOT NULL DEFAULT 'MailForge',
  notifications_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
