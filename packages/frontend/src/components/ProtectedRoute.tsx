import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, token, setAuth, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      // If already authenticated with a token, just verify it once
      if (isAuthenticated && token) {
        try {
          // Verify token is still valid
          const user = await authService.getCurrentUser();
          setAuth(user, token);
        } catch (error) {
          // Token is invalid, clear auth
          console.log('Token verification failed');
          clearAuth();
        } finally {
          setLoading(false);
        }
      } else {
        // No auth, stop loading
        setLoading(false);
      }
    };

    verifyAuth();
  }, []); // Run only once on mount

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
