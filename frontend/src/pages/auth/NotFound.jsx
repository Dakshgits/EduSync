import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../routes/ProtectedRoute';

function Shell({ code, title, message }) {
  const { user } = useAuth();
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-6xl font-semibold tracking-tight text-primary-600">{code}</p>
        <h1 className="mt-4 text-xl font-semibold">{title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{message}</p>
        <Link to={user ? homeFor(user) : '/login'} className="btn btn-primary mt-6">{user ? 'Back to dashboard' : 'Go to sign in'}</Link>
      </div>
    </div>
  );
}
export const NotFound = () => <Shell code="404" title="Page not found" message="That address doesn’t exist, or it has moved." />;
export const Unauthorized = () => <Shell code="403" title="You don’t have access to this page" message="This area is for a different type of account." />;
