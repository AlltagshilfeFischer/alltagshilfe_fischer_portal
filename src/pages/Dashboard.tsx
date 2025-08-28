import { Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import DashboardHome from './DashboardHome';
import ScheduleBuilder from './controlboard/ScheduleBuilder';
import MasterData from './controlboard/MasterData';
import NewEntries from './controlboard/NewEntries';

export default function Dashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/controlboard/schedule-builder" element={<ScheduleBuilder />} />
        <Route path="/controlboard/master-data" element={<MasterData />} />
        <Route path="/controlboard/new-entries" element={<NewEntries />} />
      </Routes>
    </DashboardLayout>
  );
}