import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  Building, 
  Globe, 
  ArrowRight, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2,
  LockKeyhole
} from 'lucide-react';

import { signInWithGoogle } from '../firebase';

const AnimatedAuth = ({ initialMode = 'login' }) => {
  const { t, i18n } = useTranslation();
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [institution, setInstitution] = useState('University Student');
  const [language, setLanguage] = useState(i18n.language || 'en');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, firebaseLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setIsSignUp(initialMode === 'signup');
    setError('');
  }, [initialMode]);

  useEffect(() => {
    if (i18n.language) {
      setLanguage(i18n.language);
    }
  }, [i18n.language]);

  // Track cursor for dynamic light effect
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(t('auth.invalid_email'));
      return;
    }
    if (!password || password.length < 6) {
      setError(t('auth.password_too_short'));
      return;
    }
    setLoading(true);
    try {
      await login(cleanEmail, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error("Login failed:", err);
      const msg = (err.response && err.response.data && err.response.data.detail) || err.message || t('auth.login_failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(t('auth.invalid_email'));
      return;
    }
    if (!password || password.length < 6) {
      setError(t('auth.password_too_short'));
      return;
    }
    if (!fullName || fullName.trim().length < 2) {
      setError(t('auth.name_required'));
      return;
    }
    setLoading(true);
    try {
      await register(cleanEmail, password, fullName.trim(), institution, language);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error("Register failed:", err);
      const msg = (err.response && err.response.data && err.response.data.detail) || err.message || t('auth.registration_failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const googleRes = await signInWithGoogle();
      if (!googleRes || !googleRes.email) {
        throw new Error(t('auth.google_cancelled'));
      }
      await firebaseLogin(googleRes.idToken, googleRes.email, googleRes.fullName);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error("Google sign in notice:", err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setError(t('auth.google_cancelled'));
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains.');
      } else if (err.code === 'auth/invalid-credential' || (err.message && err.message.includes('auth/invalid-credential'))) {
        setError('Google sign-in was interrupted or failed. Please check that Google Auth is enabled and configured in your Firebase and Google Cloud Console, or try again.');
      } else {
        const msg = (err.response && err.response.data && err.response.data.detail) || err.message || t('auth.google_cancelled');
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Stagger Motion Variants
  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { type: "spring", stiffness: 300, damping: 24 } 
    }
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="relative min-h-screen pt-28 sm:pt-36 pb-12 px-3 sm:px-6 flex items-center justify-center overflow-hidden"
    >

      {/* AMBIENT BACKGROUND PARTICLES & GLOW ORBS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-transparent blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -40, 0],
            y: [0, 40, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-tr from-sky-500/25 via-emerald-500/15 to-transparent blur-3xl"
        />
      </div>

      {/* MAIN RESPONSIVE CONTAINER */}
      <div className="relative w-full max-w-4xl rounded-3xl glass-panel border border-white/15 shadow-2xl shadow-slate-950 overflow-hidden flex flex-col md:grid md:grid-cols-2">

        {/* CURSOR-BASED LIGHT EFFECT OVERLAY */}
        <div 
          className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-10"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.12), transparent 40%)`
          }}
        />

        {/* MOBILE SEGMENT TAB SWITCHER (VISIBLE ON MOBILE ONLY) */}
        <div className="md:hidden flex p-1.5 bg-slate-900/90 rounded-2xl border border-white/10 m-4 mb-2">
          <button
            type="button"
            onClick={() => { setError(''); setIsSignUp(false); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition duration-200 ${
              !isSignUp 
                ? 'bg-gradient-to-r from-indigo-600 to-sky-500 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('auth.sign_in')}
          </button>
          <button
            type="button"
            onClick={() => { setError(''); setIsSignUp(true); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition duration-200 ${
              isSignUp 
                ? 'bg-gradient-to-r from-indigo-600 to-sky-500 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('auth.create_account')}
          </button>
        </div>

        {/* ========================================================= */}
        {/* LEFT PANEL: SIGN IN FORM */}
        {/* ========================================================= */}
        <div className={`p-6 sm:p-10 flex flex-col justify-between transition-all duration-300 ${isSignUp ? 'hidden md:flex opacity-30 md:opacity-100' : 'flex opacity-100'}`}>
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate={!isSignUp ? "visible" : "hidden"}
            className="space-y-5"
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="space-y-1.5">
              <div className="inline-flex p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">{t('auth.welcome_back')}</h2>
              <p className="text-xs text-slate-400">{t('auth.sign_in_subtitle')}</p>
            </motion.div>

            {/* Alert Error */}
            {error && !isSignUp && (
              <motion.div variants={itemVariants} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <motion.div variants={itemVariants}>
                <label className="block text-xs font-medium text-slate-300 mb-1">{t('auth.email_address')}</label>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full bg-slate-900/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition duration-200"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="block text-xs font-medium text-slate-300 mb-1">{t('auth.password')}</label>
                <div className="relative group">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition duration-200"
                  />
                </div>
              </motion.div>

              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 glow-btn transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <Sparkles className="w-4 h-4 animate-spin text-sky-200" />
                ) : (
                  <>
                    <span>{t('auth.sign_in_btn')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            <motion.div variants={itemVariants} className="pt-2">
              <div className="relative mb-3 flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-[rgb(15,23,42)] px-2.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider absolute">{t('auth.or')}</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-2.5 transition duration-200 shadow-md hover:border-slate-500 disabled:opacity-50"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{t('auth.google_signin')}</span>
              </button>
            </motion.div>
          </motion.div>

          {/* Mobile Switch Link */}
          <div className="md:hidden mt-6 text-center text-xs text-slate-400 pb-2">
            {t('auth.no_account')}{' '}
            <button onClick={() => { setError(''); setIsSignUp(true); }} className="text-indigo-400 font-bold underline">
              {t('auth.create_account')}
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANEL: SIGN UP FORM */}
        {/* ========================================================= */}
        <div className={`p-6 sm:p-10 flex flex-col justify-between transition-all duration-300 ${!isSignUp ? 'hidden md:flex opacity-30 md:opacity-100' : 'flex opacity-100'}`}>
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate={isSignUp ? "visible" : "hidden"}
            className="space-y-4"
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="space-y-1">
              <div className="inline-flex p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mb-1">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">{t('auth.create_account')}</h2>
              <p className="text-xs text-slate-400">{t('auth.join_subtitle')}</p>
            </motion.div>

            {/* Alert Error */}
            {error && isSignUp && (
              <motion.div variants={itemVariants} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Signup Form */}
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <motion.div variants={itemVariants}>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">{t('auth.full_name')}</label>
                <div className="relative group">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 group-focus-within:text-sky-400 transition-colors" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Kasun Perera / Ananya Sharma"
                    className="w-full bg-slate-900/80 border border-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition duration-200"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">{t('auth.email_address')}</label>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 group-focus-within:text-sky-400 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full bg-slate-900/80 border border-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition duration-200"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">{t('auth.password')}</label>
                <div className="relative group">
                  <LockKeyhole className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 group-focus-within:text-sky-400 transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-slate-900/80 border border-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition duration-200"
                  />
                </div>
              </motion.div>

              <div className="grid grid-cols-2 gap-2">
                <motion.div variants={itemVariants}>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">{t('auth.status')}</label>
                  <select
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-800 focus:border-sky-500 rounded-xl px-2.5 py-2.5 text-xs text-slate-100 outline-none transition cursor-pointer"
                  >
                    <option value="University Student">{t('auth.student')}</option>
                    <option value="Recent Graduate">{t('auth.graduate')}</option>
                    <option value="Job Seeker">{t('auth.job_seeker')}</option>
                  </select>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">{t('auth.language')}</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-800 focus:border-sky-500 rounded-xl px-2.5 py-2.5 text-xs text-slate-100 outline-none transition cursor-pointer"
                  >
                    <option value="en">English</option>
                    <option value="si">සිංහල</option>
                    <option value="ta">தமிழ்</option>
                    <option value="hi">हिंदी</option>
                    <option value="bn">বাংলা</option>
                  </select>
                </motion.div>
              </div>

              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 glow-btn transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <Sparkles className="w-4 h-4 animate-spin text-sky-200" />
                ) : (
                  <>
                    <span>{t('auth.create_account_btn')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            <motion.div variants={itemVariants} className="pt-2">
              <div className="relative mb-3 flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-[rgb(15,23,42)] px-2.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider absolute">{t('auth.or')}</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-2.5 transition duration-200 shadow-md hover:border-slate-500 disabled:opacity-50"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{t('auth.google_signup')}</span>
              </button>
            </motion.div>
          </motion.div>

          {/* Mobile Switch Link */}
          <div className="md:hidden mt-4 text-center text-xs text-slate-400 pb-2">
            {t('auth.already_account')}{' '}
            <button onClick={() => { setError(''); setIsSignUp(false); }} className="text-sky-400 font-bold underline">
              {t('auth.sign_in')}
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DESKTOP SLIDING GLASSMORPHISM OVERLAY PANEL */}
        {/* ========================================================= */}
        <motion.div
          animate={{
            x: isSignUp ? '0%' : '100%'
          }}
          transition={{
            type: 'spring',
            stiffness: 220,
            damping: 26
          }}
          className="hidden md:flex absolute top-0 left-0 w-1/2 h-full z-20 p-8 flex-col justify-between rounded-3xl bg-gradient-to-br from-indigo-900/90 via-slate-900/95 to-slate-950 border border-white/15 backdrop-blur-2xl shadow-2xl overflow-hidden"
        >
          {/* BACKGROUND ANIMATED GLOW ORB */}
          <div className="absolute inset-0 pointer-events-none opacity-30">
            <motion.div 
              animate={{
                scale: [1, 1.4, 1],
                rotate: [0, 180, 360]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.5)_0,transparent_70%)]"
            />
          </div>

          {/* TOP LOGO */}
          <div className="relative z-10 flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 shadow-md">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-sm tracking-wider gradient-text">SAFE-HIRE AI</span>
          </div>

          {/* DYNAMIC CONTENT SWITCHER */}
          <AnimatePresence mode="wait">
            {!isSignUp ? (
              <motion.div
                key="signin-callout"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 space-y-4"
              >
                <h3 className="text-2xl font-extrabold text-slate-100 leading-snug">
                  {t('auth.new_to_safehire')}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('auth.new_desc')}
                </p>

                <ul className="space-y-2 text-xs text-slate-300 pt-2">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{t('auth.benefit_1')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{t('auth.benefit_2')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{t('auth.benefit_3')}</span>
                  </li>
                </ul>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setError('');
                    setIsSignUp(true);
                  }}
                  className="mt-4 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs shadow-lg backdrop-blur-md transition flex items-center space-x-2"
                >
                  <span>{t('auth.create_account_btn')}</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="signup-callout"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 space-y-4"
              >
                <h3 className="text-2xl font-extrabold text-slate-100 leading-snug">
                  {t('auth.already_registered')}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('auth.already_desc')}
                </p>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs text-slate-300">
                  <span className="font-semibold text-indigo-300 block">Verify Before You Apply</span>
                  <p className="text-[11px] text-slate-400">
                    Protect your personal data, bank details, and identity from fake recruiters and fraudulent registration fees.
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setError('');
                    setIsSignUp(false);
                  }}
                  className="mt-4 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs shadow-lg backdrop-blur-md transition flex items-center space-x-2"
                >
                  <span>{t('auth.sign_in_btn')}</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FOOTER BADGE */}
          <div className="relative z-10 text-[10px] text-slate-400 font-mono tracking-wider">
            SAFE-HIRE AI • 60FPS Fluid Transition
          </div>

        </motion.div>

      </div>
    </div>
  );
};

export default AnimatedAuth;
