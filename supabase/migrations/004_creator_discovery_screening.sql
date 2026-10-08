ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS profile_url text,
  ADD COLUMN IF NOT EXISTS following_count bigint,
  ADD COLUMN IF NOT EXISTS engagement_details text,
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS recent_activity text,
  ADD COLUMN IF NOT EXISTS mcn_status text NOT NULL DEFAULT 'MCN Unknown',
  ADD COLUMN IF NOT EXISTS mcn_company text,
  ADD COLUMN IF NOT EXISTS mcn_evidence text,
  ADD COLUMN IF NOT EXISTS mcn_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS eligibility_status text NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS eligibility_score integer,
  ADD COLUMN IF NOT EXISTS eligibility_reason text,
  ADD COLUMN IF NOT EXISTS recruitment_status text NOT NULL DEFAULT 'New',
  ADD COLUMN IF NOT EXISTS discovered_at timestamptz;

ALTER TABLE contact_log
  ADD COLUMN IF NOT EXISTS recruitment_invitation boolean NOT NULL DEFAULT false;

UPDATE creators
SET discovered_at = COALESCE(created_at, now())
WHERE discovered_at IS NULL;

WITH first_invitation AS (
  SELECT DISTINCT ON (cl.creator_id) cl.id
  FROM contact_log AS cl
  JOIN templates AS t ON t.id = cl.template_id
  WHERE t.type = 'MCN Invite'
  ORDER BY cl.creator_id, cl.sent_at NULLS LAST, cl.id
)
UPDATE contact_log AS cl
SET recruitment_invitation = true
FROM first_invitation AS fi
WHERE cl.id = fi.id;

UPDATE creators AS c
SET recruitment_status = CASE
  WHEN c.status = 'Replied' OR EXISTS (
    SELECT 1 FROM contact_log AS cl WHERE cl.creator_id = c.id AND cl.replied
  ) THEN 'Replied'
  WHEN c.status = 'Agreed' THEN 'Interested'
  WHEN c.status = 'Rejected' THEN 'Rejected'
  WHEN EXISTS (
    SELECT 1 FROM contact_log AS cl WHERE cl.creator_id = c.id AND cl.recruitment_invitation
  ) OR c.status IN ('Invited', 'Follow-up 1 Sent', 'Follow-up 2 Sent') THEN 'Invitation Sent'
  WHEN EXISTS (
    SELECT 1 FROM contact_log AS cl WHERE cl.creator_id = c.id AND cl.sent_at IS NOT NULL
  ) OR c.status NOT IN ('Not Contacted', 'Cold Lead') THEN 'Already Contacted'
  ELSE 'New'
END
WHERE c.recruitment_status = 'New';

ALTER TABLE creators
  ALTER COLUMN discovered_at SET DEFAULT now(),
  ALTER COLUMN discovered_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'creators_mcn_status_check'
      AND conrelid = 'creators'::regclass
  ) THEN
    ALTER TABLE creators
      ADD CONSTRAINT creators_mcn_status_check
      CHECK (mcn_status IN ('Checking MCN', 'MCN Signed', 'Not MCN Signed', 'MCN Unknown'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'creators_eligibility_status_check'
      AND conrelid = 'creators'::regclass
  ) THEN
    ALTER TABLE creators
      ADD CONSTRAINT creators_eligibility_status_check
      CHECK (eligibility_status IN ('Pending', 'Eligible', 'Not Eligible'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'creators_mcn_evidence_check'
      AND conrelid = 'creators'::regclass
  ) THEN
    ALTER TABLE creators
      ADD CONSTRAINT creators_mcn_evidence_check
      CHECK (
        mcn_status IN ('MCN Unknown', 'Checking MCN')
        OR (
          mcn_status IN ('MCN Signed', 'Not MCN Signed')
          AND nullif(trim(mcn_evidence), '') IS NOT NULL
          AND mcn_checked_at IS NOT NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'creators_eligible_requires_mcn_check'
      AND conrelid = 'creators'::regclass
  ) THEN
    ALTER TABLE creators
      ADD CONSTRAINT creators_eligible_requires_mcn_check
      CHECK (eligibility_status <> 'Eligible' OR mcn_status = 'Not MCN Signed');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'creators_eligibility_score_check'
      AND conrelid = 'creators'::regclass
  ) THEN
    ALTER TABLE creators
      ADD CONSTRAINT creators_eligibility_score_check
      CHECK (eligibility_score IS NULL OR eligibility_score BETWEEN 0 AND 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'creators_following_count_check'
      AND conrelid = 'creators'::regclass
  ) THEN
    ALTER TABLE creators
      ADD CONSTRAINT creators_following_count_check
      CHECK (following_count IS NULL OR following_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'creators_recruitment_status_check'
      AND conrelid = 'creators'::regclass
  ) THEN
    ALTER TABLE creators
      ADD CONSTRAINT creators_recruitment_status_check
      CHECK (recruitment_status IN (
        'New',
        'Already Contacted',
        'Invitation Sent',
        'Replied',
        'Interested',
        'Not Interested',
        'Joined',
        'Follow-up Required',
        'No Response',
        'Rejected'
      ));
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_creators_discovered_at ON creators(discovered_at);
CREATE INDEX IF NOT EXISTS idx_creators_mcn_status ON creators(mcn_status);
CREATE INDEX IF NOT EXISTS idx_creators_eligibility_status ON creators(eligibility_status);
CREATE INDEX IF NOT EXISTS idx_creators_recruitment_status ON creators(recruitment_status);
CREATE INDEX IF NOT EXISTS idx_creators_normalized_handle
  ON creators (lower(ltrim(trim(tiktok_handle), '@')));
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_log_single_recruitment_invitation
  ON contact_log(creator_id)
  WHERE recruitment_invitation;
CREATE UNIQUE INDEX IF NOT EXISTS idx_creators_profile_url_unique
  ON creators (lower(trim(trailing '/' FROM trim(profile_url))))
  WHERE profile_url IS NOT NULL AND trim(profile_url) <> '';

CREATE OR REPLACE FUNCTION public.enforce_recruitment_invitation_screening()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  creator_mcn_status text;
  creator_eligibility_status text;
BEGIN
  IF NEW.recruitment_invitation THEN
    SELECT mcn_status, eligibility_status
      INTO creator_mcn_status, creator_eligibility_status
      FROM public.creators
      WHERE id = NEW.creator_id
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot record an invitation for a missing creator.';
    END IF;
    IF creator_mcn_status = 'MCN Signed' THEN
      RAISE EXCEPTION 'Recruitment invitations are blocked for MCN Signed creators.';
    END IF;
    IF creator_mcn_status <> 'Not MCN Signed'
       OR creator_eligibility_status <> 'Eligible' THEN
      RAISE EXCEPTION 'Recruitment invitations require confirmed Not MCN Signed status and Eligible status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_recruitment_invitation_screening ON contact_log;
CREATE TRIGGER trg_enforce_recruitment_invitation_screening
BEFORE INSERT OR UPDATE ON contact_log
FOR EACH ROW EXECUTE FUNCTION public.enforce_recruitment_invitation_screening();

CREATE OR REPLACE FUNCTION public.find_creator_duplicates(
  handle_values text[],
  profile_url_values text[]
)
RETURNS TABLE (creator_id uuid, tiktok_handle text, profile_url text)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT c.id, c.tiktok_handle, c.profile_url
  FROM public.creators AS c
  WHERE lower(ltrim(trim(c.tiktok_handle), '@')) = ANY(COALESCE(handle_values, ARRAY[]::text[]))
     OR lower(trim(trailing '/' FROM trim(c.profile_url))) = ANY(COALESCE(profile_url_values, ARRAY[]::text[]));
$$;

REVOKE ALL ON FUNCTION public.find_creator_duplicates(text[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_creator_duplicates(text[], text[]) TO authenticated;
