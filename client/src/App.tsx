import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/admin/Login';
import Overview from './pages/admin/Overview';
import Children from './pages/admin/Children';
import Chores from './pages/admin/Chores';
import ChoreTemplates from './pages/admin/ChoreTemplates';
import Bounties from './pages/admin/Bounties';
import Prizes from './pages/admin/Prizes';
import PrizeRequests from './pages/admin/PrizeRequests';
import Ledger from './pages/admin/Ledger';
import ManualAdjustment from './pages/admin/ManualAdjustment';
import Settings from './pages/admin/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="children" element={<Children />} />
        <Route path="chores" element={<Chores />} />
        <Route path="chore-templates" element={<ChoreTemplates />} />
        <Route path="bounties" element={<Bounties />} />
        <Route path="prizes" element={<Prizes />} />
        <Route path="prize-requests" element={<PrizeRequests />} />
        <Route path="ledger" element={<Ledger />} />
        <Route path="adjustments" element={<ManualAdjustment />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
