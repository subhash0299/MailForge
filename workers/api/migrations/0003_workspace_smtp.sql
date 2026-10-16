CREATE TABLE IF NOT EXISTS workspace_smtp_configs (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  host TEXT NOT NULL,
  port INTEGER NOT NULL CHECK (port >= 1 AND port <= 65535 AND port != 25),
  security TEXT NOT NULL CHECK (security IN ('tls','starttls')),
  username TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  sender_email TEXT NOT NULL COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
