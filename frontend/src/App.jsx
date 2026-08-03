import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AIModalProvider } from './context/AIModalContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FloatingAIChatbot from './components/FloatingAIChatbot';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import './i18n';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-xs font-mono">
        Authenticating session...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public Auth Route (Redirects logged in user straight to Dashboard)
const PublicAuthRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-xs font-mono">
        Authenticating session...
      </div>
    );
  }
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/login" 
            element={
              <PublicAuthRoute>
                <LoginPage />
              </PublicAuthRoute>
            } 
          />
          <Route 
            path="/signup" 
            element={
              <PublicAuthRoute>
                <SignupPage />
              </PublicAuthRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/history" 
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <FloatingAIChatbot />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AIModalProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AIModalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
