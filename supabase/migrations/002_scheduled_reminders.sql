ALTER TABLE contact_log
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contact_log_status_check'
      AND conrelid = 'contact_log'::regclass
  ) THEN
    ALTER TABLE contact_log
      ADD CONSTRAINT contact_log_status_check
      CHECK (status IN ('pending_send', 'sent'));
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_contact_log_pending_send
  ON contact_log(creator_id)
  WHERE status = 'pending_send';

CREATE TABLE IF NOT EXISTS scheduled_reminder_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  workflow_key text NOT NULL CHECK (
    workflow_key IN (
      'follow_up_7_days',
      'follow_up_30_days',
      'sample_reminder_day_3',
      'sample_reminder_day_7'
    )
  ),
  source_contact_id uuid NOT NULL REFERENCES contact_log(id) ON DELETE CASCADE,
  queued_contact_id uuid REFERENCES contact_log(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_key, source_contact_id)
);

ALTER TABLE scheduled_reminder_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scheduled_reminder_runs'
      AND policyname = 'authenticated_full_access'
  ) THEN
    CREATE POLICY "authenticated_full_access" ON scheduled_reminder_runs
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_templates_updated_at ON templates;
CREATE TRIGGER trg_templates_updated_at
BEFORE UPDATE ON templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
CREATE TRIGGER trg_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
