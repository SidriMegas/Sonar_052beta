-- Ajoute une date limite optionnelle aux paris.
-- A executer dans Supabase SQL Editor.

begin;

alter table public.paris_questions
  add column if not exists deadline_at timestamptz null;

create index if not exists idx_paris_questions_deadline_at
  on public.paris_questions (deadline_at)
  where status = 'open';

commit;