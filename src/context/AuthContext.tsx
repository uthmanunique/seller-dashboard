"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';

interface UserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePicture?: string;
  walletCreated?: boolean;
  id?: string;
  role?: string;
  // Additional fields as necessary
}

interface User {
  token: string;
  refreshToken: string;
  role: string;
  data: UserData | null;
}

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  login: (params: { token: string; refreshToken: string; role: string; userData: UserData }) => void;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load user data from cookies on mount
  const loadUserFromCookies = () => {
    const token = Cookies.get('accessToken');
    const refreshToken = Cookies.get('refreshToken');
    const role = Cookies.get('role');

    let userData: UserData | null = null;
    if (role === 'SELLER') {
      const sellerData = Cookies.get('sellerData');
      if (sellerData) {
        try {
          userData = JSON.parse(sellerData) as UserData;
        } catch (err) {
          console.error('Error parsing sellerData', err);
        }
      }
    } else if (role === 'BUYER') {
      const buyerData = Cookies.get('buyerData');
      if (buyerData) {
        try {
          userData = JSON.parse(buyerData) as UserData;
        } catch (err) {
          console.error('Error parsing buyerData', err);
        }
      }
    }

    if (token && refreshToken && role) {
      setUser({ token, refreshToken, role, data: userData });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUserFromCookies();
  }, []);

  // Login: set cookies and update context state
  const login = ({ token, refreshToken, role, userData }: { token: string; refreshToken: string; role: string; userData: UserData }) => {
    Cookies.set('accessToken', token, { expires: 1 / 24, secure: true, sameSite: 'lax' });
    Cookies.set('refreshToken', refreshToken, { expires: 1, secure: true, sameSite: 'lax' });
    Cookies.set('role', role, { expires: 1, secure: true, sameSite: 'lax' });
    if (role.toUpperCase() === 'SELLER') {
      Cookies.set('sellerData', JSON.stringify(userData), { expires: 1, secure: true, sameSite: 'lax' });
    } else if (role.toUpperCase() === 'BUYER') {
      Cookies.set('buyerData', JSON.stringify(userData), { expires: 1, secure: true, sameSite: 'lax' });
    }
    setUser({ token, refreshToken, role, data: userData });
  };

  // Logout: clear cookies and reset user state
  const logout = () => {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    Cookies.remove('role');
    Cookies.remove('sellerData');
    Cookies.remove('buyerData');
    setUser(null);
  };

  // NEW: Check if URL hash contains token data and process it
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      try {
        const hash = window.location.hash.substring(1); // Remove the '#' symbol
        const tokenDataJson = atob(hash);
        const tokenData = JSON.parse(tokenDataJson);
        if (tokenData.token && tokenData.refreshToken && tokenData.userData) {
          login({
            token: tokenData.token,
            refreshToken: tokenData.refreshToken,
            role: tokenData.userData.role || 'SELLER',
            userData: tokenData.userData,
          });
          // Remove the hash from the URL
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (error) {
        console.error("Failed to parse authentication data from URL hash", error);
      }
    }
  }, [login]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
