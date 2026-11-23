import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute, { homeFor } from './routes/ProtectedRoute';
import StudentLayout from './layouts/StudentLayout';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import { NotFound, Unauthorized } from './pages/auth/NotFound';
import StudentDashboard from './pages/student/Dashboard';
import MyGroup from './pages/student/MyGroup';
import CreateGroup from './pages/student/CreateGroup';
import Invitations from './pages/student/Invitations';
import Assignments from './pages/student/Assignments';
import AssignmentDetails from './pages/student/AssignmentDetails';
import Profile from './pages/shared/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import ManageAssignments from './pages/admin/ManageAssignments';
import AssignmentForm from './pages/admin/AssignmentForm';
import AssignmentMonitor from './pages/admin/AssignmentMonitor';
import SubmissionMonitor from './pages/admin/SubmissionMonitor';
import GroupMonitoring from './pages/admin/GroupMonitoring';
import StudentMonitoring from './pages/admin/StudentMonitoring';
import Analytics from './pages/admin/Analytics';
import { Spinner } from './components/common/Feedback';

function Root() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner className="h-6 w-6" /></div>;
  return <Navigate to={user ? homeFor(user) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute role="STUDENT"><StudentLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/group" element={<MyGroup />} />
        <Route path="/group/create" element={<CreateGroup />} />
        <Route path="/invitations" element={<Invitations />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/assignments/:id" element={<AssignmentDetails />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route element={<ProtectedRoute role="ADMIN"><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/assignments" element={<ManageAssignments />} />
        <Route path="/admin/assignments/new" element={<AssignmentForm />} />
        <Route path="/admin/assignments/:id" element={<AssignmentMonitor />} />
        <Route path="/admin/assignments/:id/edit" element={<AssignmentForm />} />
        <Route path="/admin/submissions" element={<SubmissionMonitor />} />
        <Route path="/admin/groups" element={<GroupMonitoring />} />
        <Route path="/admin/students" element={<StudentMonitoring />} />
        <Route path="/admin/analytics" element={<Analytics />} />
        <Route path="/admin/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
