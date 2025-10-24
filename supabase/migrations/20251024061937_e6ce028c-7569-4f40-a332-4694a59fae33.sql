-- Add color column to kunden table for calendar display
ALTER TABLE kunden 
ADD COLUMN farbe_kalender TEXT DEFAULT '#10B981';