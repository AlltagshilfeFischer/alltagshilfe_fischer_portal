# React Patterns – Alltagshilfe Fischer

## Provider-Wrapping (Reihenfolge kritisch)
```
AuthProvider → ForcePasswordChange → QueryClientProvider → BrowserRouter → Routes
```

## Rollen-Schutz
```typescript
import { useUserRole } from '@/hooks/useUserRole';
const { isAdmin, isGeschaeftsfuehrer, isBuchhaltung } = useUserRole();
// Sensible Aktionen nur fuer berechtigte Rollen freigeben
```

## Daten-Fetching (TanStack React Query)
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: async () => {
    const { data, error } = await supabase.from('tabelle').select('*');
    if (error) throw error;
    return data;
  },
});
```

## Formulare (React Hook Form + Zod)
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ name: z.string().min(1, 'Pflichtfeld') });
const form = useForm({ resolver: zodResolver(schema) });
```

## Termin-System
- NIEMALS `ist_ausnahme = true` Termine ueberschreiben
- Einzeltermin: `vorlage_id = null`
- Regeltermin: Template in `termin_vorlagen` + generierte `termine`
- Zeitzone: immer `Europe/Berlin` → UTC fuer DB

## Routing (React Router v6)
- Neue Seiten: `src/pages/controlboard/`
- Route hinzufuegen in `App.tsx`
- Sidebar-Eintrag: `AppSidebar.tsx` mit `requiredRoles`
