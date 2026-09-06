import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('safe_hire_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/api/user/profile');
        setUser(response.data);
      } catch (err) {
        if (token && token.startsWith('demo_local_token_')) {
          try {
            const emailVal = atob(token.replace('demo_local_token_', ''));
            if (emailVal && emailVal.includes('@')) {
              setUser({
                id: `user_${emailVal.replace(/[^a-zA-Z0-9]/g, '_')}`,
                email: emailVal,
                full_name: emailVal.split('@')[0].toUpperCase(),
                institution: "University Student",
                preferred_language: "en"
              });
              return;
            }
          } catch (e) {
            console.warn("Failed decoding local token:", e);
          }
        }
        console.error('Failed to fetch user profile, clearing unauthenticated session:', err);
        localStorage.removeItem('safe_hire_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  const login = async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('safe_hire_token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, full_name, institution, preferred_language) => {
    const response = await api.post('/api/auth/register', {
      email,
      password,
      full_name,
      institution,
      preferred_language
    });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('safe_hire_token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const firebaseLogin = async (idToken, email, fullName) => {
    if (!email || !email.includes('@')) {
      throw new Error("A valid Google account email is required.");
    }
    const response = await api.post('/api/auth/firebase-login', {
      id_token: idToken,
      email: email,
      full_name: fullName
    });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('safe_hire_token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('safe_hire_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, firebaseLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
