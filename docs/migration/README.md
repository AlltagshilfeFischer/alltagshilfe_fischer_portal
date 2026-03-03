# Supabase Cloud Migration

## Übersicht

Diese Dokumentation beschreibt die Schritte zur Migration zwischen Supabase-Projekten.

## Dateien in diesem Ordner

| Datei | Beschreibung |
|-------|-------------|
| `01_SCHEMA_BACKUP.sql` | Vollständiges Datenbankschema (Tabellen, Funktionen, RLS) |
| `02_DATA_EXPORT_QUERIES.sql` | Queries zum Exportieren aller Daten |

## Migrations-Schritte

### Phase 1: Daten-Export (VOR der Trennung!)

1. **Öffne den Supabase SQL Editor:**
   https://supabase.com/dashboard/project/nabodbmvfrhhrjeiiimm/sql/new

2. **Führe die Export-Queries aus** (`02_DATA_EXPORT_QUERIES.sql`):
   - Kopiere jede SELECT-Query einzeln
   - Exportiere die Ergebnisse als CSV/JSON
   - Speichere lokal ab

3. **Dokumente herunterladen:**
   - Gehe zu Storage: https://supabase.com/dashboard/project/nabodbmvfrhhrjeiiimm/storage/buckets
   - Lade alle Dateien aus dem `dokumente` Bucket herunter

4. **Benutzer-Liste sichern:**
   - Gehe zu Auth > Users: https://supabase.com/dashboard/project/nabodbmvfrhhrjeiiimm/auth/users
   - Exportiere die Benutzerliste (Email-Adressen notieren)

### Phase 2: Altes Supabase-Projekt trennen

1. Öffne die Projekteinstellungen
2. Gehe zu **Backend/Supabase**
3. Klicke auf **"Disconnect"** bzw. **"Trennen"**
4. Bestätige die Trennung

### Phase 3: Neues Supabase-Projekt einrichten

1. Neues Supabase-Projekt erstellen
2. Warte bis das neue Backend bereit ist
3. Die Edge Functions müssen neu deployed werden

### Phase 4: Schema aufbauen

1. Öffne den **SQL Editor** im neuen Supabase-Projekt
2. Führe `01_SCHEMA_BACKUP.sql` aus
3. Das komplette Schema wird erstellt

### Phase 5: Daten importieren

**Option A: Via SQL INSERT**
```sql
-- Beispiel für Benutzer
INSERT INTO public.benutzer (id, email, rolle, status, vorname, nachname)
VALUES
  ('uuid-1', 'admin@example.com', 'admin', 'approved', 'Max', 'Mustermann'),
  ('uuid-2', 'mitarbeiter@example.com', 'mitarbeiter', 'approved', 'Anna', 'Schmidt');
```

**Option B: Via CSV Import**
- Supabase unterstützt CSV-Import über die UI

### Phase 6: Benutzer neu einladen

Da Auth-Daten nicht übertragbar sind:
1. Lade bestehende Benutzer neu ein
2. Oder: Nutzer registrieren sich erneut
3. Admin-Account manuell in `benutzer` Tabelle setzen

## Wichtige Hinweise

⚠️ **Auth-Daten (Passwörter) können NICHT migriert werden!**
- Alle Benutzer müssen sich neu registrieren oder eingeladen werden
- Passwort-Reset-Links funktionieren nach Migration

⚠️ **Storage-Dateien separat migrieren!**
- Dateien müssen manuell herunter- und wieder hochgeladen werden
- `dateipfad` in der `dokumente`-Tabelle ggf. anpassen

⚠️ **UUIDs beibehalten!**
- Die Original-UUIDs aus dem Export verwenden
- Sonst brechen alle Fremdschlüssel-Beziehungen

## Checkliste

- [ ] Alle Export-Queries ausgeführt
- [ ] CSVs/JSONs lokal gespeichert
- [ ] Storage-Dateien heruntergeladen
- [ ] Benutzerliste notiert
- [ ] Altes Supabase getrennt
- [ ] Neues Supabase-Projekt erstellt
- [ ] Schema-SQL ausgeführt
- [ ] Daten importiert
- [ ] Storage-Bucket erstellt
- [ ] Dateien hochgeladen
- [ ] Admin-Account angelegt
- [ ] Funktionalität getestet
