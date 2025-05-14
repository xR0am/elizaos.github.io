"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

interface AuthContextType {
  user: GitHubUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  handleAuthCallback: (code: string, state: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user data from localStorage on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem("github_token");
    const storedUser = localStorage.getItem("github_user");

    if (storedToken) {
      setToken(storedToken);

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Failed to parse stored user data:", e);
          // If parsing fails, fetch the user data again
          fetchUserData(storedToken).catch((e) => {
            console.error("Failed to fetch user data on init:", e);
          });
        }
      } else {
        // If we have a token but no user data, fetch the user data
        fetchUserData(storedToken).catch((e) => {
          console.error("Failed to fetch user data on init:", e);
        });
      }
    }
  }, []);

  // Fetch user data from GitHub API
  const fetchUserData = async (accessToken: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid or expired
          logout();
          throw new Error("Authentication token is invalid or expired");
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const userData = await response.json();
      setUser(userData);
      localStorage.setItem("github_user", JSON.stringify(userData));
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch user data",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Start the GitHub OAuth flow
  const login = () => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate a random state for CSRF protection
      const state = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("oauth_state", state);

      // Construct the GitHub authorization URL
      const authUrl = new URL("https://github.com/login/oauth/authorize");
      authUrl.searchParams.append(
        "client_id",
        process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "",
      );
      authUrl.searchParams.append(
        "redirect_uri",
        process.env.NEXT_PUBLIC_REDIRECT_URI || "",
      );
      authUrl.searchParams.append("scope", "user repo");
      authUrl.searchParams.append("state", state);

      // Redirect the user to the GitHub authorization page
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error("Error starting login flow:", error);
      setError(
        error instanceof Error ? error.message : "Failed to start login flow",
      );
      setIsLoading(false);
    }
  };

  // Handle the OAuth callback
  const handleAuthCallback = async (code: string, receivedState: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Verify the state parameter to prevent CSRF attacks
      const savedState = localStorage.getItem("oauth_state");

      if (!savedState || savedState !== receivedState) {
        throw new Error(
          "Invalid state parameter. Please try logging in again.",
        );
      }

      // Clear the state now that we've verified it
      localStorage.removeItem("oauth_state");

      // Exchange the code for an access token via our Cloudflare Worker
      const tokenUrl = `${process.env.NEXT_PUBLIC_AUTH_WORKER_URL}/api/auth/callback?code=${code}`;
      const response = await fetch(tokenUrl);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to exchange code for token: ${response.status}`,
        );
      }

      const data = await response.json();

      // Check if the token has the required scope
      if (!data.scope || !data.scope.includes("repo")) {
        throw new Error(
          "Insufficient permissions. Please authorize the application with the 'repo' scope.",
        );
      }

      // Save the token and fetch user data
      const accessToken = data.access_token;
      setToken(accessToken);
      localStorage.setItem("github_token", accessToken);

      await fetchUserData(accessToken);

      // Redirect to the home page or another appropriate page
      window.location.href = process.env.NEXT_PUBLIC_APP_URL || "/";
    } catch (error) {
      console.error("Error in auth callback:", error);
      setError(
        error instanceof Error ? error.message : "Authentication failed",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Log the user out
  const logout = () => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem("github_token");
    localStorage.removeItem("github_user");
    localStorage.removeItem("oauth_state");
  };

  const value = {
    user,
    token,
    isLoading,
    error,
    login,
    logout,
    handleAuthCallback,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
