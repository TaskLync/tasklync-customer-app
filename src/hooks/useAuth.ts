import { useState } from 'react';
import { useRouter } from 'expo-router';
import { authApi } from '../services/api/auth.api';
import { userApi } from '../services/api/user.api';
import { phoneSchema, nameSchema } from '../utils/validation';
import { useAuthStore, useUIStore } from '../store';
import { useQuery } from '@tanstack/react-query';
import { mapOtpVerificationError, mapOtpResendError } from '../utils/authError';

export const useSendOtp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);

  const sendOtp = async (phone: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = phoneSchema.safeParse(phone);
      if (!parsed.success) {
        setError((parsed.error as any).errors[0].message);
        setIsLoading(false);
        return;
      }

      const formattedPhone = `+92${parsed.data.substring(parsed.data.length - 10)}`;
      
      await authApi.sendOtp(formattedPhone);
      
      router.push({ pathname: '/(auth)/otp', params: { phone: formattedPhone } });
    } catch (err: any) {
      const mapped = mapOtpResendError(err);
      setError(mapped.message);
      showToast({ type: 'error', title: mapped.message });
    } finally {
      setIsLoading(false);
    }
  };

  return { sendOtp, isLoading, error };
};

export const useResendOtp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resendOtp = async (
    phone: string
  ): Promise<{ success: boolean; expiresIn?: number; error?: string }> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.sendOtp(phone);
      return { success: true, expiresIn: response.expiresIn };
    } catch (err: any) {
      const mapped = mapOtpResendError(err);
      setError(mapped.message);
      return { success: false, error: mapped.message };
    } finally {
      setIsLoading(false);
    }
  };

  return { resendOtp, isLoading, error };
};

export const useVerifyOtp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState(false);
  const router = useRouter();
  
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);
  const setIsNewUser = useAuthStore((state) => state.setIsNewUser);

  const verifyOtp = async (
    phone: string,
    otp: string
  ): Promise<{ success: boolean; error?: string; isOtpError?: boolean; user?: any }> => {
    setIsLoading(true);
    setError(null);
    setOtpError(false);

    try {
      const response = await authApi.verifyOtp(phone, otp, 'user');
      
      setTokens(response.accessToken, response.refreshToken);
      setUser(response.user);
      setIsNewUser(response.isNewUser);
      
      // Delay to let the confirmed success cascade animation play
      setTimeout(() => {
        console.log("OTP Response Payload:", JSON.stringify(response));
        const hasValidName = response.user?.name && response.user.name !== 'null' && response.user.name !== '' && response.user.name !== 'New User';
        const needsProfileSetup = response.isNewUser || !hasValidName;
        
        if (needsProfileSetup) {
          router.replace('/(auth)/name');
        } else {
          router.replace('/(tabs)' as any);
        }
      }, 800);

      return { success: true, user: response.user };
    } catch (err: any) {
      const mapped = mapOtpVerificationError(err);
      setError(mapped.message);
      setOtpError(mapped.isOtpError);
      return { success: false, error: mapped.message, isOtpError: mapped.isOtpError };
    } finally {
      setIsLoading(false);
    }
  };

  return { verifyOtp, isLoading, error, otpError };
};


export const useUpdateName = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const showToast = useUIStore((state) => state.showToast);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setIsNewUser = useAuthStore((state) => state.setIsNewUser);

  const updateName = async (name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = nameSchema.safeParse(name);
      if (!parsed.success) {
        setError((parsed.error as any).errors[0].message);
        setIsLoading(false);
        return;
      }

      await userApi.updateProfile({ name: parsed.data });
      
      if (user) {
        setUser({ ...user, name: parsed.data });
      }
      
      // Crucial fix: Clear isNewUser flag so AuthProvider doesn't force a redirect back to name screen
      setIsNewUser(false);
      
      router.replace('/(auth)/location-permission');
    } catch (err) {
      showToast({ type: 'error', title: "Something went wrong. Your name wasn't saved." });
      // Error isn't blocking, but we might let the user decide to try again or we can force them to try.
      // The spec says: Name save failure is NOT blocking — user can still proceed
      router.replace('/(auth)/location-permission');
    } finally {
      setIsLoading(false);
    }
  };

  return { updateName, isLoading, error };
};

export const useLogout = () => {
  const logoutStore = useAuthStore((state) => state.logout);
  const showToast = useUIStore((state) => state.showToast);

  const logout = async () => {
    // The request interceptor is async: clearing the store first sent the logout call with NO
    // token (401, server session left alive). Revoke first, bounded so offline never blocks.
    await Promise.race([
      authApi.logout().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
    logoutStore();
    showToast({ type: 'info', title: 'Logged out' });
  };

  return { logout };
};

export const useCurrentUser = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: userApi.getMe,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
