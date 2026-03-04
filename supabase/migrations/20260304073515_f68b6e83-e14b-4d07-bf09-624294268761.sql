
ALTER TABLE public.leistungsnachweise
  ADD COLUMN IF NOT EXISTS cb_kombinationsleistung boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cb_entlastungsleistung boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cb_verhinderungspflege boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cb_haushaltshilfe boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cb_deckeln_45b boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cb_deckeln_45b_betrag numeric DEFAULT NULL;
