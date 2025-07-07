
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '@/components/LandingPage';
import AuthPage from '@/components/AuthPage';
import Dashboard from '@/components/Dashboard';
import AdminPanel from '@/components/AdminPanel';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user, isAuthenticated, loading } = useAuth();

  console.log('Index render - loading:', loading, 'isAuthenticated:', isAuthenticated);

  if (loading) {
    return <LoadingSpinner message="Loading your account..." />;
  }

  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route 
            path="/" 
            element={!isAuthenticated ? <LandingPage /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/auth" 
            element={!isAuthenticated ? <AuthPage /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? (
              <ErrorBoundary>
                <Dashboard />
              </ErrorBoundary>
            ) : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/admin" 
            element={isAuthenticated && user?.role === 'admin' ? (
              <ErrorBoundary>
                <AdminPanel />
              </ErrorBoundary>
            ) : <Navigate to="/dashboard" replace />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
};

export default Index;
