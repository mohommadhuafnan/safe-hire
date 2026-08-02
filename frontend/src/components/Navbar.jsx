import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, LogOut, User, Globe, History, LayoutDashboard, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className="glass-panel sticky top-0 z-50 px-4 sm:px-6 py-3.5 border-b border-slate-800 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2.5 group">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold tracking-tight gradient-text">SAFE-HIRE</span>
            <span className="block text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-wider">SCAM DETECTOR AI</span>
          </div>
        </Link>

        {/* Desktop Navigation & Language */}
        <div className="hidden md:flex items-center space-x-4">
          
          {/* Language Selector Dropdown */}
          <div className="relative flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 hover:border-indigo-500/50 transition">
            <Globe className="w-4 h-4 mr-2 text-sky-400" />
            <select
              value={i18n.language}
              onChange={handleLanguageChange}
              className="bg-transparent border-none outline-none text-slate-200 cursor-pointer pr-1 focus:ring-0"
            >
              <option value="en" className="bg-slate-900">English (EN)</option>
              <option value="si" className="bg-slate-900">සිංහල (SI)</option>
              <option value="ta" className="bg-slate-900">தமிழ் (TA)</option>
              <option value="hi" className="bg-slate-900">हिंदी (HI)</option>
              <option value="bn" className="bg-slate-900">বাংলা (BN)</option>
            </select>
          </div>

          {/* Logged in User Menu */}
          {user ? (
            <div className="flex items-center space-x-3">
              <Link
                to="/dashboard"
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                <span>{t('nav.dashboard')}</span>
              </Link>
              
              <Link
                to="/history"
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <History className="w-4 h-4 text-emerald-400" />
                <span>{t('nav.history')}</span>
              </Link>

              {/* User Profile Badge */}
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs shadow-md">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-medium text-slate-200 max-w-[120px] truncate">
                  {user.full_name}
                </span>
                
                <button
                  onClick={handleLogout}
                  title={t('nav.logout')}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Unauthenticated Navigation Buttons */
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white glow-btn"
              >
                {t('nav.signup')}
              </Link>
            </div>
          )}

        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex items-center space-x-2 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-slate-800/80 space-y-3 animate-fade-in">
          {/* Mobile Language Selector */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="flex items-center text-slate-400">
              <Globe className="w-4 h-4 mr-2 text-sky-400" />
              Language:
            </span>
            <select
              value={i18n.language}
              onChange={handleLanguageChange}
              className="bg-transparent border-none outline-none text-slate-200 font-medium cursor-pointer"
            >
              <option value="en" className="bg-slate-900">English (EN)</option>
              <option value="si" className="bg-slate-900">සිංහල (SI)</option>
              <option value="ta" className="bg-slate-900">தமிழ் (TA)</option>
              <option value="hi" className="bg-slate-900">हिंदी (HI)</option>
              <option value="bn" className="bg-slate-900">বাংলা (BN)</option>
            </select>
          </div>

          {user ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-slate-200 truncate">{user.full_name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                </div>
              </div>

              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-slate-900 text-xs font-medium text-slate-200 border border-slate-800"
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                <span>{t('nav.dashboard')}</span>
              </Link>

              <Link
                to="/history"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-slate-900 text-xs font-medium text-slate-200 border border-slate-800"
              >
                <History className="w-4 h-4 text-emerald-400" />
                <span>{t('nav.history')}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('nav.logout')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center py-3 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-800"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center py-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-sky-500"
              >
                {t('nav.signup')}
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
