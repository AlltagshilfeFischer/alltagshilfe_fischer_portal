-- Create storage bucket for customer documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dokumente',
  'dokumente',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
);

-- Create table for document metadata
CREATE TABLE public.dokumente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titel TEXT NOT NULL,
  beschreibung TEXT,
  dateiname TEXT NOT NULL,
  dateipfad TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  groesse_bytes BIGINT NOT NULL,
  kunden_id UUID NOT NULL REFERENCES public.kunden(id) ON DELETE CASCADE,
  hochgeladen_von UUID NOT NULL REFERENCES public.benutzer(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on dokumente table
ALTER TABLE public.dokumente ENABLE ROW LEVEL SECURITY;

-- Admins can manage all documents
CREATE POLICY "Admins can manage all dokumente"
ON public.dokumente
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Mitarbeiter can read documents for their assigned customers
CREATE POLICY "Mitarbeiter can read assigned customer dokumente"
ON public.dokumente
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM mitarbeiter m
    JOIN termine t ON t.mitarbeiter_id = m.id
    WHERE m.benutzer_id = auth.uid()
    AND t.kunden_id = dokumente.kunden_id
  )
);

-- Storage policies for dokumente bucket
-- Admins can upload documents
CREATE POLICY "Admins can upload dokumente"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'dokumente' 
  AND is_admin(auth.uid())
);

-- Admins can update documents
CREATE POLICY "Admins can update dokumente"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'dokumente'
  AND is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'dokumente'
  AND is_admin(auth.uid())
);

-- Admins can delete documents
CREATE POLICY "Admins can delete dokumente"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'dokumente'
  AND is_admin(auth.uid())
);

-- Admins can view all documents
CREATE POLICY "Admins can view all dokumente"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'dokumente'
  AND is_admin(auth.uid())
);

-- Mitarbeiter can view documents for their assigned customers
CREATE POLICY "Mitarbeiter can view assigned customer dokumente"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'dokumente'
  AND EXISTS (
    SELECT 1
    FROM dokumente d
    JOIN termine t ON t.kunden_id = d.kunden_id
    JOIN mitarbeiter m ON m.id = t.mitarbeiter_id
    WHERE m.benutzer_id = auth.uid()
    AND d.dateipfad = storage.objects.name
  )
);

-- Create index for better query performance
CREATE INDEX idx_dokumente_kunden_id ON public.dokumente(kunden_id);
CREATE INDEX idx_dokumente_created_at ON public.dokumente(created_at DESC);