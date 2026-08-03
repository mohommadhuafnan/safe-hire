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
      if (token.startsWith('demo_local_token_')) {
        setUser(prev => prev || {
          id: "demo_student_user",
          email: "student@university.edu",
          full_name: "Student User",
          institution: "University Student",
          preferred_language: "en"
        });
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/api/user/profile');
        setUser(response.data);
      } catch (err) {
        if (!err.response) {
          // Network issue or offline mode: retain local session
          setUser({
            id: "demo_student_user",
            email: "student@university.edu",
            full_name: "Student User",
            institution: "University Student",
            preferred_language: "en"
          });
        } else {
          console.error('Failed to fetch user profile:', err);
          localStorage.removeItem('safe_hire_token');
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { access_token, user: userData } = response.data;
      localStorage.setItem('safe_hire_token', access_token);
      setToken(access_token);
      setUser(userData);
      return userData;
    } catch (err) {
      if (!err.response) {
        const demoUser = {
          id: "demo_student_user",
          email: email || "student@university.edu",
          full_name: email ? email.split('@')[0].toUpperCase() : "Student User",
          institution: "University Student",
          preferred_language: "en"
        };
        const demoToken = "demo_local_token_" + Date.now();
        localStorage.setItem('safe_hire_token', demoToken);
        setToken(demoToken);
        setUser(demoUser);
        return demoUser;
      }
      throw err;
    }
  };

  const register = async (email, password, full_name, institution, preferred_language) => {
    try {
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
    } catch (err) {
      if (!err.response) {
        const demoUser = {
          id: "demo_student_user",
          email: email || "student@university.edu",
          full_name: full_name || "New Student User",
          institution: institution || "University Student",
          preferred_language: preferred_language || "en"
        };
        const demoToken = "demo_local_token_" + Date.now();
        localStorage.setItem('safe_hire_token', demoToken);
        setToken(demoToken);
        setUser(demoUser);
        return demoUser;
      }
      throw err;
    }
  };

  const firebaseLogin = async (idToken, email, fullName) => {
    try {
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
    } catch (err) {
      if (!err.response) {
        const demoUser = {
          id: "demo_google_student",
          email: email || "student_google@university.edu",
          full_name: fullName || "Google Student User",
          institution: "University Student",
          preferred_language: "en"
        };
        const demoToken = "demo_local_token_" + Date.now();
        localStorage.setItem('safe_hire_token', demoToken);
        setToken(demoToken);
        setUser(demoUser);
        return demoUser;
      }
      throw err;
    }
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
