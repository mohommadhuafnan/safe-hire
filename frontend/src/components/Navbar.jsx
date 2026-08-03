import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useAIModal } from '../context/AIModalContext';
import { ShieldCheck, LogOut, User, Globe, History, LayoutDashboard, Menu, X, Crown, Sparkles, ArrowRight, BrainCircuit } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { openAIModal } = useAIModal();
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
    <>
      <header className="sticky top-3 sm:top-4 z-40 px-3 sm:px-6">
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
              
              {/* Universal Gemini AI Analyzer Button */}
              <button
                onClick={() => openAIModal({ title: 'Gemini 3.6 Flash Universal AI Analyzer' })}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-sky-300 hover:text-white bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 transition-all duration-300 shadow-md glow-btn"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>AI Analyzer</span>
              </button>

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
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-full bg-slate-900 border border-white/15 text-slate-200 hover:text-white focus:outline-none shadow-md"
                aria-label="Open mobile menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

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

              {/* Pricing Callout Banner */}
              <button
                onClick={scrollToPricing}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-between shadow-md"
              >
                <div className="flex items-center space-x-2">
                  <Crown className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Pricing Plans (LKR)</span>
                </div>
                <span className="text-[10px] text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full font-mono uppercase">LKR 999+</span>
              </button>

              {/* Language Selector */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-white/10 text-xs">
                <span className="flex items-center text-slate-400 font-medium">
                  <Globe className="w-4 h-4 mr-2 text-sky-400" />
                  Language:
                </span>
                <select
                  value={i18n.language}
                  onChange={handleLanguageChange}
                  className="bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1 text-slate-200 font-semibold cursor-pointer outline-none"
                >
                  <option value="en">English (EN)</option>
                  <option value="si">සිංහල (SI)</option>
                  <option value="ta">தமிழ் (TA)</option>
                  <option value="hi">हिंदी (HI)</option>
                  <option value="bn">বাংলা (BN)</option>
                </select>
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
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center py-3.5 rounded-2xl text-xs font-bold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-white/10 transition"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center py-3.5 rounded-2xl text-xs font-bold text-slate-950 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 shadow-lg glow-btn transition"
                  >
                    {t('nav.signup')}
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
