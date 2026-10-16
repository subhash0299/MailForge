/*
# MailForge RLS Policies

## Security Changes
- Adds row-level security policies to all MailForge tables.
- Users can only access data within workspaces they are members of.
- workspace_members: users can see/manage their own membership.
- workspaces: owner has full CRUD.
- All workspace-scoped tables: membership checked via is_workspace_member() function.
- Child tables (delivery_attempts, email_events, webhook_attempts): scoped through parent FK.
- audit_logs: workspace members can read; any member can insert.
- 4 separate policies per table (SELECT, INSERT, UPDATE, DELETE).
*/

-- Workspaces policies
DROP POLICY IF EXISTS "select_own_workspaces" ON workspaces;
CREATE POLICY "select_own_workspaces" ON workspaces FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = workspaces.id AND workspace_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_workspaces" ON workspaces;
CREATE POLICY "insert_own_workspaces" ON workspaces FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_workspaces" ON workspaces;
CREATE POLICY "update_own_workspaces" ON workspaces FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_workspaces" ON workspaces;
CREATE POLICY "delete_own_workspaces" ON workspaces FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- Workspace members policies
DROP POLICY IF EXISTS "select_own_membership" ON workspace_members;
CREATE POLICY "select_own_membership" ON workspace_members FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_membership" ON workspace_members;
CREATE POLICY "insert_own_membership" ON workspace_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_membership" ON workspace_members;
CREATE POLICY "delete_own_membership" ON workspace_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Sending domains policies
DROP POLICY IF EXISTS "select_own_domains" ON sending_domains;
CREATE POLICY "select_own_domains" ON sending_domains FOR SELECT
  TO authenticated USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "insert_own_domains" ON sending_domains;
CREATE POLICY "insert_own_domains" ON sending_domains FOR INSERT
  TO authenticated WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "update_own_domains" ON sending_domains;
CREATE POLICY "update_own_domains" ON sending_domains FOR UPDATE
  TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "delete_own_domains" ON sending_domains;
CREATE POLICY "delete_own_domains" ON sending_domains FOR DELETE
  TO authenticated USING (is_workspace_member(workspace_id));

-- API keys policies
DROP POLICY IF EXISTS "select_own_api_keys" ON api_keys;
CREATE POLICY "select_own_api_keys" ON api_keys FOR SELECT
  TO authenticated USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "insert_own_api_keys" ON api_keys;
CREATE POLICY "insert_own_api_keys" ON api_keys FOR INSERT
  TO authenticated WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "update_own_api_keys" ON api_keys;
CREATE POLICY "update_own_api_keys" ON api_keys FOR UPDATE
  TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "delete_own_api_keys" ON api_keys;
CREATE POLICY "delete_own_api_keys" ON api_keys FOR DELETE
  TO authenticated USING (is_workspace_member(workspace_id));

-- Email logs policies
DROP POLICY IF EXISTS "select_own_email_logs" ON email_logs;
CREATE POLICY "select_own_email_logs" ON email_logs FOR SELECT
  TO authenticated USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "insert_own_email_logs" ON email_logs;
CREATE POLICY "insert_own_email_logs" ON email_logs FOR INSERT
  TO authenticated WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "update_own_email_logs" ON email_logs;
CREATE POLICY "update_own_email_logs" ON email_logs FOR UPDATE
  TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "delete_own_email_logs" ON email_logs;
CREATE POLICY "delete_own_email_logs" ON email_logs FOR DELETE
  TO authenticated USING (is_workspace_member(workspace_id));

-- Delivery attempts policies (scoped via email_logs parent)
DROP POLICY IF EXISTS "select_own_attempts" ON delivery_attempts;
CREATE POLICY "select_own_attempts" ON delivery_attempts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM email_logs WHERE email_logs.id = delivery_attempts.email_log_id AND is_workspace_member(email_logs.workspace_id))
  );

DROP POLICY IF EXISTS "insert_own_attempts" ON delivery_attempts;
CREATE POLICY "insert_own_attempts" ON delivery_attempts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM email_logs WHERE email_logs.id = delivery_attempts.email_log_id AND is_workspace_member(email_logs.workspace_id))
  );

-- Email events policies (scoped via email_logs parent)
DROP POLICY IF EXISTS "select_own_events" ON email_events;
CREATE POLICY "select_own_events" ON email_events FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM email_logs WHERE email_logs.id = email_events.email_log_id AND is_workspace_member(email_logs.workspace_id))
  );

DROP POLICY IF EXISTS "insert_own_events" ON email_events;
CREATE POLICY "insert_own_events" ON email_events FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM email_logs WHERE email_logs.id = email_events.email_log_id AND is_workspace_member(email_logs.workspace_id))
  );

-- Suppressions policies
DROP POLICY IF EXISTS "select_own_suppressions" ON suppressions;
CREATE POLICY "select_own_suppressions" ON suppressions FOR SELECT
  TO authenticated USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "insert_own_suppressions" ON suppressions;
CREATE POLICY "insert_own_suppressions" ON suppressions FOR INSERT
  TO authenticated WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "update_own_suppressions" ON suppressions;
CREATE POLICY "update_own_suppressions" ON suppressions FOR UPDATE
  TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "delete_own_suppressions" ON suppressions;
CREATE POLICY "delete_own_suppressions" ON suppressions FOR DELETE
  TO authenticated USING (is_workspace_member(workspace_id));

-- Webhooks policies
DROP POLICY IF EXISTS "select_own_webhooks" ON webhooks;
CREATE POLICY "select_own_webhooks" ON webhooks FOR SELECT
  TO authenticated USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "insert_own_webhooks" ON webhooks;
CREATE POLICY "insert_own_webhooks" ON webhooks FOR INSERT
  TO authenticated WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "update_own_webhooks" ON webhooks;
CREATE POLICY "update_own_webhooks" ON webhooks FOR UPDATE
  TO authenticated USING (is_workspace_member(workspace_id)) WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "delete_own_webhooks" ON webhooks;
CREATE POLICY "delete_own_webhooks" ON webhooks FOR DELETE
  TO authenticated USING (is_workspace_member(workspace_id));

-- Webhook attempts policies (scoped via webhooks parent)
DROP POLICY IF EXISTS "select_own_webhook_attempts" ON webhook_attempts;
CREATE POLICY "select_own_webhook_attempts" ON webhook_attempts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM webhooks WHERE webhooks.id = webhook_attempts.webhook_id AND is_workspace_member(webhooks.workspace_id))
  );

DROP POLICY IF EXISTS "insert_own_webhook_attempts" ON webhook_attempts;
CREATE POLICY "insert_own_webhook_attempts" ON webhook_attempts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM webhooks WHERE webhooks.id = webhook_attempts.webhook_id AND is_workspace_member(webhooks.workspace_id))
  );

-- Audit logs policies
DROP POLICY IF EXISTS "select_own_audit_logs" ON audit_logs;
CREATE POLICY "select_own_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "insert_own_audit_logs" ON audit_logs;
CREATE POLICY "insert_own_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (is_workspace_member(workspace_id));
