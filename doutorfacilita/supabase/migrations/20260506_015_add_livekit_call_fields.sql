-- 015 — LiveKit call metadata + realtime publication
--
-- Adds:
--   * consultations.doctor_called_at (timestamptz, nullable) — when doctor pressed "Chamar próximo"
--   * UNIQUE constraint on consultations.livekit_room_name (column already exists from migration 004)
--   * Publish 'consultations' on supabase_realtime so frontend subscribes to row changes
--
-- All operations are idempotent (safe to re-run).

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS doctor_called_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'consultations_livekit_room_name_unique'
      AND conrelid = 'public.consultations'::regclass
  ) THEN
    ALTER TABLE public.consultations
      ADD CONSTRAINT consultations_livekit_room_name_unique UNIQUE (livekit_room_name);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'consultations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.consultations;
  END IF;
END$$;

COMMENT ON COLUMN public.consultations.doctor_called_at IS
  'Set when the doctor presses "Chamar próximo" in cockpit and the LiveKit room is created/reused. Front-end watches this field via Realtime to flip the patient join button.';
