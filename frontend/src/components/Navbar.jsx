import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, LogOut, User, Globe, History, LayoutDashboard, Menu, X, Crown, Sparkles } from 'lucide-react';

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

  const scrollToPricing = () => {
    setMobileMenuOpen(false);
    if (window.location.pathname !== '/') {
      navigate('/#pricing');
      setTimeout(() => {
        const el = document.getElementById('pricing');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById('pricing');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-3 sm:top-4 z-50 px-3 sm:px-6">
      <nav className="max-w-6xl mx-auto rounded-full bg-slate-950/70 border border-white/15 backdrop-blur-2xl shadow-2xl shadow-slate-950/80 px-4 sm:px-6 py-2.5 transition-all duration-300">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo & macOS Dots */}
          <div className="flex items-center space-x-3">
            {/* macOS Window Controls Dots */}
            <div className="hidden sm:flex items-center space-x-1.5 pr-2 border-r border-white/10">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block shadow-sm shadow-rose-500/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block shadow-sm shadow-amber-500/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block shadow-sm shadow-emerald-500/50" />
            </div>

            <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900 border border-white/20 p-0.5 shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300 overflow-hidden flex items-center justify-center">
                <img src="/images/logo.png" alt="SAFE-HIRE AI Logo" className="w-full h-full object-cover rounded-full" />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-extrabold tracking-tight gradient-text leading-none">SAFE-HIRE</span>
                <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">AI SCAM DETECTOR</span>
              </div>
            </Link>
          </div>

          {/* Desktop Controls (Floating Pill Style) */}
          <div className="hidden md:flex items-center space-x-3">
            
            {/* Pricing Link Button */}
            <button
              onClick={scrollToPricing}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all duration-300 hover:scale-105"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Pricing (LKR)</span>
            </button>

            {/* Language Selector Dropdown */}
            <div className="relative flex items-center bg-slate-900/80 border border-white/10 rounded-full px-3 py-1.5 text-xs text-slate-200 hover:border-indigo-400/50 transition duration-300">
              <Globe className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
              <select
                value={i18n.language}
                onChange={handleLanguageChange}
                className="bg-transparent border-none outline-none text-slate-200 cursor-pointer pr-1 focus:ring-0 text-xs font-semibold"
              >
                <option value="en" className="bg-slate-900">English</option>
                <option value="si" className="bg-slate-900">සිංහල</option>
                <option value="ta" className="bg-slate-900">தமிழ்</option>
                <option value="hi" className="bg-slate-900">हिंदी</option>
                <option value="bn" className="bg-slate-900">বাংলা</option>
              </select>
            </div>

            {/* Logged in User Menu */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-white/10">
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('nav.dashboard')}</span>
                </Link>
                
                <Link
                  to="/history"
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition"
                >
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('nav.history')}</span>
                </Link>

                {/* User Profile Badge */}
                <div className="flex items-center space-x-2 pl-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 via-sky-400 to-emerald-400 flex items-center justify-center text-white font-bold text-xs shadow-md">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 max-w-[100px] truncate">
                    {user.full_name}
                  </span>
                  
                  <button
                    onClick={handleLogout}
                    title={t('nav.logout')}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-full hover:bg-rose-500/10 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Unauthenticated Pill Buttons */
              <div className="flex items-center space-x-2 pl-2 border-l border-white/10">
                <Link
                  to="/login"
                  className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/signup"
                  className="px-5 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 text-slate-950 shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all duration-300"
                >
                  {t('nav.signup')}
                </Link>
              </div>
            )}

          </div>

          {/* Mobile Toggle Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full bg-slate-900 border border-white/10 text-slate-200 hover:text-white focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Mobile Menu Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-white/10 space-y-3 animate-fade-in">
            
            <button
              onClick={scrollToPricing}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold"
            >
              <span className="flex items-center">
                <Crown className="w-4 h-4 mr-2 text-amber-400 animate-pulse" />
                View Premium Pricing Plans
              </span>
              <span className="text-[10px] text-amber-400 font-bold uppercase">LKR 999+</span>
            </button>

            {/* Mobile Language Selector */}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-full bg-slate-900 border border-white/10 text-xs">
              <span className="flex items-center text-slate-400">
                <Globe className="w-4 h-4 mr-2 text-sky-400" />
                Language:
              </span>
              <select
                value={i18n.language}
                onChange={handleLanguageChange}
                className="bg-transparent border-none outline-none text-slate-200 font-medium cursor-pointer"
              >
                <option value="en" className="bg-slate-900">English</option>
                <option value="si" className="bg-slate-900">සිංහල</option>
                <option value="ta" className="bg-slate-900">தமிழ்</option>
                <option value="hi" className="bg-slate-900">हिंदी</option>
                <option value="bn" className="bg-slate-900">বাংলা</option>
              </select>
            </div>

            {user ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-900/60 border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-semibold text-slate-200 truncate">{user.full_name}</div>
                    <div className="text-[10px] text-amber-400 font-semibold flex items-center">
                      <Crown className="w-3 h-3 mr-1" /> Free Student Account
                    </div>
                  </div>
                </div>

                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-slate-900 text-xs font-medium text-slate-200 border border-white/10"
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                  <span>{t('nav.dashboard')}</span>
                </Link>

                <Link
                  to="/history"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-slate-900 text-xs font-medium text-slate-200 border border-white/10"
                >
                  <History className="w-4 h-4 text-emerald-400" />
                  <span>{t('nav.history')}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20"
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
                  className="flex items-center justify-center py-2.5 rounded-full text-xs font-semibold text-slate-200 bg-slate-900 border border-white/10"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center py-2.5 rounded-full text-xs font-bold text-slate-950 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400"
                >
                  {t('nav.signup')}
                </Link>
              </div>
            )}
          </div>
        )}

      </nav>
    </header>
  );
};

export default Navbar;
