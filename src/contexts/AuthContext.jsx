import { createContext, useContext, useState, useEffect } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

const AuthContext = createContext(null);

// Scopes required for the Google Sheets storage backend. Shared by both the
// web (@react-oauth/google) and native (@capgo/capacitor-social-login) flows.
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const isNative = Capacitor.isNativePlatform();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const AuthProviderContent = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate token by making a test API call
  const validateToken = async (token) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  };

  // Given a fresh Google access token, fetch the user's profile and persist
  // both. Shared by the web and native sign-in flows so the resulting
  // { user, accessToken } state is identical regardless of platform.
  const applyAccessToken = async (token) => {
    setAccessToken(token);
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userInfo = await userInfoResponse.json();

      setUser(userInfo);
      localStorage.setItem('user', JSON.stringify(userInfo));
      localStorage.setItem('accessToken', token);
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  useEffect(() => {
    // On native, the social-login plugin must be initialized once with the web
    // client ID before any login/logout call. On web this is a no-op.
    const initNative = async () => {
      if (!isNative) return;
      try {
        await SocialLogin.initialize({
          google: { webClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID },
        });
      } catch (error) {
        console.error('SocialLogin.initialize failed:', error);
      }
    };

    // Check if user is already logged in (stored in localStorage)
    const checkAuth = async () => {
      await initNative();

      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('accessToken');

      if (storedUser && storedToken) {
        // Validate the stored token
        const isValid = await validateToken(storedToken);

        if (isValid) {
          setUser(JSON.parse(storedUser));
          setAccessToken(storedToken);
        } else {
          // Token expired or invalid, clear storage
          console.log('Stored token is invalid or expired. Please login again.');
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Web sign-in: Google Identity Services popup/implicit flow. Only usable in a
  // browser context (needs a web origin), so it is not called on native.
  const webLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      await applyAccessToken(tokenResponse.access_token);
    },
    onError: (error) => {
      console.error('Login failed:', error);
    },
    scope: GOOGLE_SCOPES.join(' '),
  });

  // Native sign-in: Credential Manager via @capgo/capacitor-social-login. Returns
  // an access token directly on-device (no backend), with the same Sheets scopes.
  const nativeLogin = async () => {
    try {
      const { result } = await SocialLogin.login({
        provider: 'google',
        options: { scopes: GOOGLE_SCOPES, forceRefreshToken: true },
      });
      const token = result?.accessToken?.token;
      if (!token) {
        console.error('Native login returned no access token:', result);
        return;
      }
      await applyAccessToken(token);
    } catch (error) {
      console.error('Native login failed:', error);
    }
  };

  const login = isNative ? nativeLogin : webLogin;

  const logout = async () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');

    if (isNative) {
      try {
        await SocialLogin.logout({ provider: 'google' });
      } catch (error) {
        // Non-fatal: local state is already cleared.
        console.error('Native logout failed:', error);
      }
    }
  };

  // Handle token expiration - called when API returns 401
  const handleTokenExpired = () => {
    console.log('Access token has expired. Please login again.');
    logout();
  };

  const value = {
    user,
    accessToken,
    login,
    logout,
    handleTokenExpired,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const AuthProvider = ({ children }) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h2>
          <p className="text-gray-700">
            Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Get your Client ID from{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Google Cloud Console
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProviderContent>{children}</AuthProviderContent>
    </GoogleOAuthProvider>
  );
};
