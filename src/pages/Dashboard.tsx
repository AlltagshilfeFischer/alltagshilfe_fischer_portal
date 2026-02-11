import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import DashboardHome from './DashboardHome';
import ScheduleBuilderModern from './controlboard/ScheduleBuilderModern';
import MasterData from './controlboard/MasterData';
import NewEntries from './controlboard/NewEntries';
import BenutzerverwaltungNeu from './controlboard/BenutzerverwaltungNeu';
import Billing from './controlboard/Billing';
import Leistungsnachweise from './controlboard/Leistungsnachweise';
import Dokumentenverwaltung from './controlboard/Dokumentenverwaltung';
import MitarbeiterStart from './MitarbeiterStart';

import Settings from './Settings';
import { useUserRole } from '@/hooks/useUserRole';

export default function Dashboard() {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (role === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Kein Zugriff</h2>
          <p className="text-muted-foreground">
            Ihrem Konto wurde noch keine Rolle zugewiesen. Bitte kontaktieren Sie den Administrator.
          </p>
        </div>
      </div>
    );
  }

  if (role === 'mitarbeiter') {
    return (
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<MitarbeiterStart />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </DashboardLayout>
    );
  }

  if (role === 'buchhaltung') {
    return (
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/controlboard/billing" element={<Billing />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </DashboardLayout>
    );
  }

  if (role === 'admin') {
    return (
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/controlboard/schedule-builder" element={<ScheduleBuilderModern />} />
          <Route path="/controlboard/master-data" element={<MasterData />} />
          <Route path="/controlboard/dokumentenverwaltung" element={<Dokumentenverwaltung />} />
          <Route path="/controlboard/leistungsnachweise" element={<Leistungsnachweise />} />
          <Route path="/controlboard/billing" element={<Billing />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </DashboardLayout>
    );
  }

  // StandortSuperadmin (geschaeftsfuehrer): Vollzugriff
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/controlboard/schedule-builder" element={<ScheduleBuilderModern />} />
        <Route path="/controlboard/master-data" element={<MasterData />} />
        <Route path="/controlboard/new-entries" element={<NewEntries />} />
        <Route path="/controlboard/admin" element={<BenutzerverwaltungNeu />} />
        <Route path="/controlboard/dokumentenverwaltung" element={<Dokumentenverwaltung />} />
        <Route path="/controlboard/leistungsnachweise" element={<Leistungsnachweise />} />
        <Route path="/controlboard/billing" element={<Billing />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
