-- Allow an agenda opinion assignment to exist before the user submits text.
BEGIN;

ALTER TABLE public.agenda_opinions ALTER COLUMN opinion DROP NOT NULL;

COMMIT;
