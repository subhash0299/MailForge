-- Harden workspace membership and ensure workspace creators can access their workspace.
-- Previously, any authenticated user could insert themselves into any workspace by
-- choosing its UUID. This migration restricts membership inserts to workspace owners.

CREATE OR REPLACE FUNCTION public.is_workspace_owner(ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces AS w
    WHERE w.id = ws_id
      AND w.owner_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_workspace_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_workspace_owner_as_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS add_workspace_owner_as_member_trigger ON public.workspaces;
CREATE TRIGGER add_workspace_owner_as_member_trigger
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.add_workspace_owner_as_member();

-- Backfill membership for existing workspaces so owners can read them under RLS.
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, w.owner_id, 'owner'
FROM public.workspaces AS w
ON CONFLICT (workspace_id, user_id) DO NOTHING;

DROP POLICY IF EXISTS "insert_own_membership" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_owner_can_add_members" ON public.workspace_members;
CREATE POLICY "workspace_owner_can_add_members" ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_owner(workspace_id));

-- A user may remove only their own membership under the existing delete policy.
-- Membership additions are now limited to the workspace owner.
