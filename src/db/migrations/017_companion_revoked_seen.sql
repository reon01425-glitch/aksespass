-- 017_companion_revoked_seen.sql
-- D4: banner "Satu tautan telah berakhir." hanya tampil sampai pendamping melihatnya sekali.

ALTER TABLE companions ADD COLUMN IF NOT EXISTS companion_seen_revoked_at timestamptz;

CREATE OR REPLACE FUNCTION mark_revoked_links_seen()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := app_user_id();
  v_count integer;
BEGIN
  IF v_caller_id IS NULL OR app_role() IS DISTINCT FROM 'companion' THEN
    RETURN 0;
  END IF;

  UPDATE companions
  SET companion_seen_revoked_at = now()
  WHERE companion_user_id = v_caller_id
    AND status = 'revoked'
    AND (companion_seen_revoked_at IS NULL OR revoked_at > companion_seen_revoked_at);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

ALTER FUNCTION mark_revoked_links_seen() OWNER TO aksespass_owner;
REVOKE ALL ON FUNCTION mark_revoked_links_seen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_revoked_links_seen() TO aksespass_app;
