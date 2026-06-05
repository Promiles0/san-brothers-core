-- Messaging redesign v2: internal notes, replies, reactions, file attachments,
-- read receipts, conversation status/priority/assignment.
-- Run in Supabase SQL editor.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_internal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reply_to_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_type text;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS assigned_staff_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_reply_sent boolean DEFAULT false;

-- Soft constraints (skip if they already exist)
DO $$ BEGIN
  ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_status_chk
    CHECK (status IN ('open','pending','resolved','closed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_priority_chk
    CHECK (priority IN ('normal','urgent'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Storage bucket for message attachments (idempotent).
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Make sure clients cannot read internal notes via PostgREST.
-- Adjust to your existing RLS naming if a SELECT policy already exists.
DO $$ BEGIN
  CREATE POLICY "messages_hide_internal_from_clients"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    is_internal = false
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin','manager','secretary','translator')
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
