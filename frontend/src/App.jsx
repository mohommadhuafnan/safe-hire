import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AIModalProvider } from './context/AIModalContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FloatingAIChatbot from './components/FloatingAIChatbot';
import CyberParticlesBackground from './components/CyberParticlesBackground';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import './i18n';

import { useTranslation } from 'react-i18next';

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
  const { i18n } = useTranslation();

  React.useEffect(() => {
    const currentLang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0].toLowerCase();
    document.documentElement.setAttribute('data-language', currentLang);
    document.documentElement.setAttribute('lang', currentLang);
  }, [i18n.language]);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      <CyberParticlesBackground />
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
