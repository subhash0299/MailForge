/*
# MailForge Core Schema — Tables Only

Creates all tables for MailForge. Policies are added in a separate step
to avoid forward-reference issues.

## New Tables (see full descriptions in the combined migration)
1. workspaces
2. workspace_members
3. sending_domains
4. api_keys
5. email_logs
6. delivery_attempts
7. email_events
8. suppressions
9. webhooks
10. webhook_attempts
11. audit_logs
*/

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  environment text NOT NULL DEFAULT 'development',
  created_at timestamptz NOT NULL DEFAULT now(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Workspace members
CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- 3. Sending domains
CREATE TABLE IF NOT EXISTS sending_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  domain text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  dkim_selector text NOT NULL DEFAULT 'mailforge',
  verification_token text NOT NULL DEFAULT 'mf-verify-' || encode(gen_random_bytes(8), 'hex'),
  spf_verified boolean NOT NULL DEFAULT false,
  dkim_verified boolean NOT NULL DEFAULT false,
  dmarc_verified boolean NOT NULL DEFAULT false,
  return_path_verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, domain)
);

-- 4. API keys
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_type text NOT NULL DEFAULT 'test',
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  restrictions jsonb,
  last_used_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Email logs
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  message_id text UNIQUE NOT NULL,
  recipient text NOT NULL,
  sender text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'queued',
  domain text,
  smtp_code integer,
  smtp_response text,
  error_details text,
  tags text[],
  submitted_at timestamptz NOT NULL DEFAULT now(),
  last_updated timestamptz NOT NULL DEFAULT now()
);

-- 6. Delivery attempts
CREATE TABLE IF NOT EXISTS delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id uuid NOT NULL REFERENCES email_logs(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL,
  status text NOT NULL,
  smtp_code integer,
  smtp_response text NOT NULL,
  duration_ms integer NOT NULL DEFAULT 0,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- 7. Email events
CREATE TABLE IF NOT EXISTS email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id uuid NOT NULL REFERENCES email_logs(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- 8. Suppressions
CREATE TABLE IF NOT EXISTS suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  reason text NOT NULL,
  domain text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

-- 9. Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  signing_secret text NOT NULL DEFAULT 'whsec_' || encode(gen_random_bytes(12), 'hex'),
  last_attempt_at timestamptz,
  last_response_code integer,
  success_rate numeric NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Webhook attempts
CREATE TABLE IF NOT EXISTS webhook_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  status_code integer NOT NULL,
  response_time_ms integer NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  retry_count integer NOT NULL DEFAULT 0,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- 11. Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sending_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: check workspace membership
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = ws_id
    AND workspace_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_workspace ON email_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_submitted ON email_logs(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_sending_domains_workspace ON sending_domains(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace ON api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_suppressions_workspace ON suppressions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_workspace ON webhooks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_email ON delivery_attempts(email_log_id);
CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email_log_id);
