import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { ShieldCheck, LogOut, User, Globe, History, LayoutDashboard, Menu, X, Crown, ArrowRight, ChevronDown, Check, Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSystemDefault, setIsSystemDefault] = useState(
    !localStorage.getItem('i18nextLng') || localStorage.getItem('i18nextLng') === 'system'
  );

  const selectLanguage = (val) => {
    if (val === 'system') {
      localStorage.removeItem('i18nextLng');
      setIsSystemDefault(true);
      const detected = i18n.services?.languageDetector?.detect() || navigator.language || 'en';
      const primary = (Array.isArray(detected) ? detected[0] : detected).split('-')[0].toLowerCase();
      const supported = ['en', 'si', 'ta', 'hi', 'bn'].includes(primary) ? primary : 'en';
      i18n.changeLanguage(supported);
    } else {
      localStorage.setItem('i18nextLng', val);
      setIsSystemDefault(false);
      i18n.changeLanguage(val);
    }
  };

  const handleLanguageChange = (e) => {
    selectLanguage(e.target.value);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-2xl shadow-xl shadow-black/40">
        {/* Subtle Cyber Neon Ambient Bottom Accent Line */}
        <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

        <nav className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[68px] flex items-center justify-between">
          
          {/* Brand Logo & macOS Controls */}
          <div className="flex items-center space-x-3">
            {/* macOS Window Controls Dots */}
            <div className="hidden sm:flex items-center space-x-1.5 pr-3 border-r border-slate-800/90">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block shadow-sm shadow-rose-500/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block shadow-sm shadow-amber-500/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block shadow-sm shadow-emerald-500/50" />
            </div>

            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border border-indigo-500/30 p-1 shadow-md shadow-indigo-500/20 group-hover:border-indigo-400/60 group-hover:scale-105 transition-all duration-300 flex items-center justify-center overflow-hidden">
                <img src="/images/logo.png" alt="SAFE-HIRE AI Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="text-base sm:text-lg font-black tracking-tight text-slate-100 group-hover:text-sky-300 transition-colors leading-none">SAFE-HIRE</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-[9px] font-mono font-bold text-indigo-300 uppercase tracking-wider hidden sm:inline-block">AI</span>
                </div>
                <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">AI SCAM DETECTOR</span>
              </div>
            </Link>
          </div>

          {/* Desktop Right Controls & User Session */}
          <div className="hidden md:flex items-center space-x-3">
            
            {/* Language Selector Dropdown */}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center space-x-1.5 bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 rounded-xl px-3 py-1.5 text-xs text-slate-200 transition duration-200 shadow-sm"
              >
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-semibold text-xs uppercase">
                  {isSystemDefault
                    ? 'Auto'
                    : (i18n.resolvedLanguage || i18n.language || 'en').substring(0, 2)}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:rotate-180 transition-transform duration-300" />
              </button>

              {/* Smooth Animated Hover Menu */}
              <div className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-slate-900/95 border border-indigo-500/30 shadow-2xl p-1.5 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-1 group-hover:translate-y-0 transition-all duration-200 ease-out backdrop-blur-xl">
                <div className="text-[10px] font-bold text-slate-400 px-2.5 py-1 tracking-wider uppercase border-b border-slate-800 mb-1">
                  Select Language
                </div>

                {[
                  { code: 'system', name: 'Auto (System)', flag: '🌐' },
                  { code: 'en', name: 'English', flag: '🇬🇧' },
                  { code: 'si', name: 'සිංහල (Sinhala)', flag: '🇱🇰' },
                  { code: 'ta', name: 'தமிழ் (Tamil)', flag: '🇱🇰' },
                  { code: 'hi', name: 'हिंदी (Hindi)', flag: '🇮🇳' },
                  { code: 'bn', name: 'বাংলা (Bengali)', flag: '🇧🇩' }
                ].map((lang) => {
                  const active = (isSystemDefault && lang.code === 'system') || (!isSystemDefault && (i18n.resolvedLanguage === lang.code || i18n.language === lang.code));
                  return (
                    <button
                      key={lang.code}
                      onClick={() => selectLanguage(lang.code)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                        active
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center space-x-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all duration-200 shadow-sm"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme Mode"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-300" />
              )}
            </button>

            {/* Pricing Navigation Link */}
            <Link
              to="/pricing"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 transition shadow-sm"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('nav.pricing', 'Pricing')}</span>
            </Link>

            {/* Authenticated State */}
            {user ? (
              <div className="flex items-center space-x-2.5 pl-3 border-l border-slate-800">
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition shadow-sm"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('nav.dashboard', 'Dashboard')}</span>
                </Link>
                
                <Link
                  to="/history"
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition shadow-sm"
                >
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('nav.history', 'History')}</span>
                </Link>

                {/* User Avatar Badge & Logout */}
                <div className="flex items-center space-x-2 pl-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-sky-400 to-emerald-400 p-0.5 shadow-md shadow-indigo-500/20">
                    <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-white font-bold text-xs">
                      {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-200 max-w-[130px] truncate hidden xl:inline-block">
                    {user.full_name}
                  </span>
                  
                  <button
                    onClick={handleLogout}
                    title={t('nav.logout', 'Logout')}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Unauthenticated Single-Color Auth Buttons */
              <div className="flex items-center space-x-2 pl-3 border-l border-slate-800">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900/90 transition-colors"
                >
                  {t('nav.login', 'Login')}
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-colors shadow-sm"
                >
                  {t('nav.signup', 'Sign Up')}
                </Link>
              </div>
            )}

          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white focus:outline-none shadow-md"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

        </nav>
      </header>

      {/* ========================================================================= */}
      {/* NATIVE RIGHT-TO-LEFT MOBILE SLIDE-OVER DRAWER */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          
          {/* Backdrop Overlay */}
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Right-to-Left Slide-over Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-slate-950/95 border-l border-white/15 backdrop-blur-2xl p-6 z-50 flex flex-col justify-between shadow-2xl shadow-slate-950 space-y-6 overflow-y-auto transform transition-transform duration-300 ease-out">
            
            {/* Top Drawer Header */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/20 p-0.5 shadow-md">
                    <img src="/images/logo.png" alt="SAFE-HIRE Logo" className="w-full h-full object-cover rounded-full" />
                  </div>
                  <div>
                    <span className="text-base font-extrabold gradient-text block leading-none">SAFE-HIRE</span>
                    <span className="text-[8px] text-slate-400 font-bold tracking-widest uppercase">AI SCAM DETECTOR</span>
                  </div>
                </div>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-full bg-slate-900 border border-white/15 text-slate-300 hover:text-white focus:outline-none"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Language Selector */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-white/10 text-xs">
                <span className="flex items-center text-slate-400 font-medium">
                  <Globe className="w-4 h-4 mr-2 text-sky-400" />
                  Language:
                </span>
                <select
                  value={isSystemDefault ? 'system' : (i18n.resolvedLanguage || i18n.language?.split('-')[0] || 'en')}
                  onChange={handleLanguageChange}
                  className="bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1 text-slate-200 font-semibold cursor-pointer outline-none"
                >
                  <option value="system">Auto (System)</option>
                  <option value="en">English (EN)</option>
                  <option value="si">සිංහල (SI)</option>
                  <option value="ta">தமிழ் (TA)</option>
                  <option value="hi">हिंदी (HI)</option>
                  <option value="bn">বাংলা (BN)</option>
                </select>
              </div>

              {/* Theme Mode Toggle (Mobile) */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-white/10 text-xs">
                <span className="flex items-center text-slate-300 font-medium">
                  {theme === 'dark' ? <Moon className="w-4 h-4 mr-2 text-indigo-400" /> : <Sun className="w-4 h-4 mr-2 text-amber-400" />}
                  Theme Mode:
                </span>
                <button
                  onClick={toggleTheme}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition"
                >
                  {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                </button>
              </div>

              {/* Main Nav Actions */}
              {user ? (
                <div className="space-y-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 via-sky-400 to-emerald-400 flex items-center justify-center text-white font-bold text-xs shadow-md">
                      {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-slate-200 truncate">{user.full_name}</div>
                      <div className="text-[10px] text-amber-400 font-semibold flex items-center">
                        <Crown className="w-3 h-3 mr-1" /> Free Tier Account
                      </div>
                    </div>
                  </div>

                  <Link
                    to="/pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-white/10 transition"
                  >
                    <span className="flex items-center space-x-2.5">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span>{t('nav.pricing', 'Pricing & Plans')}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </Link>

                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-white/10 transition"
                  >
                    <span className="flex items-center space-x-2.5">
                      <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                      <span>{t('nav.dashboard')}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </Link>

                  <Link
                    to="/history"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-white/10 transition"
                  >
                    <span className="flex items-center space-x-2.5">
                      <History className="w-4 h-4 text-emerald-400" />
                      <span>{t('nav.history')}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/20 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('nav.logout')}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <Link
                    to="/pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-white/10 transition"
                  >
                    <span className="flex items-center space-x-2.5">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span>{t('nav.pricing', 'Pricing & Plans')}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center py-3.5 rounded-2xl text-xs font-bold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-white/10 transition"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center py-3.5 rounded-2xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-sm transition"
                  >
                    {t('nav.signup', 'Sign Up')}
                  </Link>
                </div>
              )}
            </div>

            {/* Bottom Footer Accent */}
            <div className="pt-4 border-t border-white/10 text-center">
              <span className="text-[10px] text-slate-500 font-mono block">SAFE-HIRE AI v1.0 • 5-Agent Pipeline</span>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
