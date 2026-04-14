-- Rename columns in customers table to German (skip email as it already exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN first_name TO vorname;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN last_name TO nachname;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN phone TO telefon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN address TO adresse;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN birth_date TO geburtsdatum;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'emergency_contact_name'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN emergency_contact_name TO notfallkontakt_name;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'emergency_contact_phone'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN emergency_contact_phone TO notfallkontakt_telefon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN notes TO notizen;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'capacity_per_day'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN capacity_per_day TO kapazitaet_pro_tag;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'operating_days'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN operating_days TO betriebstage;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'operating_hours_start'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN operating_hours_start TO betriebszeiten_start;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'operating_hours_end'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN operating_hours_end TO betriebszeiten_ende;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN created_at TO erstellt_am;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN updated_at TO aktualisiert_am;
  END IF;
END $$;

-- Rename columns in employees table to German
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN user_id TO benutzer_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'employee_number'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN employee_number TO mitarbeiter_nummer;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'hire_date'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN hire_date TO einstellungsdatum;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'hourly_rate'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN hourly_rate TO stundenlohn;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'qualifications'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN qualifications TO qualifikationen;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN is_active TO ist_aktiv;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN notes TO notizen;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'max_appointments_per_day'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN max_appointments_per_day TO max_termine_pro_tag;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'working_days'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN working_days TO arbeitstage;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'working_hours_start'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN working_hours_start TO arbeitszeiten_start;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'working_hours_end'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN working_hours_end TO arbeitszeiten_ende;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'vacation_days'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN vacation_days TO urlaubstage;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN created_at TO erstellt_am;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.employees RENAME COLUMN updated_at TO aktualisiert_am;
  END IF;
END $$;

-- Rename columns in appointments table to German
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN customer_id TO kunden_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN employee_id TO mitarbeiter_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN title TO titel;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN description TO beschreibung;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'appointment_date'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN appointment_date TO termin_datum;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN start_time TO startzeit;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN end_time TO endzeit;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN notes TO notizen;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'private_notes'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN private_notes TO private_notizen;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN created_at TO erstellt_am;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.appointments RENAME COLUMN updated_at TO aktualisiert_am;
  END IF;
END $$;

-- Rename columns in profiles table to German
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN user_id TO benutzer_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN first_name TO vorname;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN last_name TO nachname;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN phone TO telefon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN created_at TO erstellt_am;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN updated_at TO aktualisiert_am;
  END IF;
END $$;

-- Rename columns in schedule_templates table to German
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schedule_templates' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.schedule_templates RENAME COLUMN customer_id TO kunden_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schedule_templates' AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE public.schedule_templates RENAME COLUMN employee_id TO mitarbeiter_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schedule_templates' AND column_name = 'day_of_week'
  ) THEN
    ALTER TABLE public.schedule_templates RENAME COLUMN day_of_week TO wochentag;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schedule_templates' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE public.schedule_templates RENAME COLUMN start_time TO startzeit;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schedule_templates' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE public.schedule_templates RENAME COLUMN end_time TO endzeit;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schedule_templates' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.schedule_templates RENAME COLUMN is_active TO ist_aktiv;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schedule_templates' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.schedule_templates RENAME COLUMN created_at TO erstellt_am;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schedule_templates' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.schedule_templates RENAME COLUMN updated_at TO aktualisiert_am;
  END IF;
END $$;