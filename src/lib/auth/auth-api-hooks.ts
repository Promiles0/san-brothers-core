import { supabase } from "@/lib/supabase";

/**
 * Authentication API hooks for integration with enhanced auth components
 * These hooks provide clean interfaces for authentication operations
 */

/**
 * Hook for handling 2FA setup and verification
 */
export const use2FAFlow = () => {
  const setupTwoFA = async (userId: string) => {
    try {
      // This would typically call a backend endpoint to generate TOTP secret
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to setup 2FA");
      }

      const data = await response.json();
      return { success: true, secret: data.secret, qrCode: data.qrCode };
    } catch (error) {
      console.error("[2FA Setup] Error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const verifyTwoFA = async (userId: string, code: string) => {
    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });

      if (!response.ok) {
        throw new Error("Invalid 2FA code");
      }

      return { success: true };
    } catch (error) {
      console.error("[2FA Verify] Error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const disableTwoFA = async (userId: string) => {
    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to disable 2FA");
      }

      return { success: true };
    } catch (error) {
      console.error("[2FA Disable] Error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  return { setupTwoFA, verifyTwoFA, disableTwoFA };
};

/**
 * Hook for password management operations
 */
export const usePasswordManagement = () => {
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("[Password Reset] Error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("[Password Update] Error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const validatePasswordStrength = (password: string): {
    score: number;
    feedback: string[];
  } => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score++;
    } else {
      feedback.push("Use at least 8 characters");
    }

    if (password.length >= 12) {
      score++;
    }

    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
      score++;
    } else {
      feedback.push("Mix uppercase and lowercase letters");
    }

    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) {
      score++;
    } else {
      feedback.push("Include numbers and special characters");
    }

    return { score: Math.min(score, 4), feedback };
  };

  return { resetPassword, updatePassword, validatePasswordStrength };
};

/**
 * Hook for session management
 */
export const useSessionManagement = () => {
  const rememberDevice = async (userId: string, deviceId: string) => {
    try {
      const response = await fetch("/api/auth/devices/remember", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, deviceId }),
      });

      if (!response.ok) {
        throw new Error("Failed to remember device");
      }

      return { success: true };
    } catch (error) {
      console.error("[Remember Device] Error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const forgetDevice = async (userId: string, deviceId: string) => {
    try {
      const response = await fetch("/api/auth/devices/forget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, deviceId }),
      });

      if (!response.ok) {
        throw new Error("Failed to forget device");
      }

      return { success: true };
    } catch (error) {
      console.error("[Forget Device] Error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const getActiveSessions = async (userId: string) => {
    try {
      const response = await fetch(`/api/auth/sessions?userId=${userId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }

      const data = await response.json();
      return { success: true, sessions: data.sessions };
    } catch (error) {
      console.error("[Get Sessions] Error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const response = await fetch("/api/auth/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to revoke session");
      }

      return { success: true };
    } catch (error) {
      console.error("[Revoke Session] Error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  return { rememberDevice, forgetDevice, getActiveSessions, revokeSession };
};

/**
 * Hook for social authentication
 */
export const useSocialAuth = () => {
  const signInWithProvider = async (provider: "google" | "microsoft" | "wechat") => {
    try {
      if (provider === "wechat") {
        // WeChat OAuth flow (custom implementation)
        const response = await fetch("/api/auth/wechat/authorize");
        const data = await response.json();
        window.location.href = data.authUrl;
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as "google" | "azure",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error(`[${provider} Auth] Error:`, error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const linkSocialAccount = async (userId: string, provider: string) => {
    try {
      const response = await fetch("/api/auth/link-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, provider }),
      });

      if (!response.ok) {
        throw new Error("Failed to link account");
      }

      return { success: true };
    } catch (error) {
      console.error("[Link Provider] Error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const unlinkSocialAccount = async (userId: string, provider: string) => {
    try {
      const response = await fetch("/api/auth/unlink-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, provider }),
      });

      if (!response.ok) {
        throw new Error("Failed to unlink account");
      }

      return { success: true };
    } catch (error) {
      console.error("[Unlink Provider] Error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  return { signInWithProvider, linkSocialAccount, unlinkSocialAccount };
};

/**
 * Hook for email verification
 */
export const useEmailVerification = () => {
  const sendVerificationEmail = async (email: string) => {
    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Failed to send verification email");
      }

      return { success: true };
    } catch (error) {
      console.error("[Send Verification] Error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error("Failed to verify email");
      }

      return { success: true };
    } catch (error) {
      console.error("[Verify Email] Error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  };

  return { sendVerificationEmail, verifyEmail };
};
