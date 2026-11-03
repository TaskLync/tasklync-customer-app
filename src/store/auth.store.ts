import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';
import { AuthUser } from '../types/auth.types';

const storage = createMMKV();

export type AuthState =
  | 'INITIALIZING'
  | 'AUTHENTICATED'
  | 'UNAUTHENTICATED'
  | 'REFRESHING_TOKEN'
  | 'TEMPORARILY_UNAVAILABLE'
  // Backward compatibility aliases
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated';

interface AuthStoreState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  authState: AuthState;
  isNewUser: boolean;
  
  isAuthenticated: boolean;
  isLoading: boolean;
  
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  setIsNewUser: (isNewUser: boolean) => void;
  hydrate: () => void;
  logout: () => void;
  setAuthState: (state: AuthState) => void;
  setRefreshingToken: () => void;
  setTemporarilyUnavailable: () => void;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  authState: 'INITIALIZING',
  isNewUser: false,
  
  get isAuthenticated() {
    const s = get().authState;
    return (
      s === 'AUTHENTICATED' ||
      s === 'authenticated' ||
      s === 'REFRESHING_TOKEN' ||
      s === 'TEMPORARILY_UNAVAILABLE'
    );
  },
  
  get isLoading() {
    const s = get().authState;
    return s === 'INITIALIZING' || s === 'loading' || s === 'idle';
  },
  
  setTokens: (accessToken, refreshToken) => {
    storage.set('accessToken', accessToken);
    storage.set('refreshToken', refreshToken);
    set({ accessToken, refreshToken, authState: 'AUTHENTICATED' });
  },
  
  setUser: (user) => {
    storage.set('user', JSON.stringify(user));
    set({ user });
  },
  
  setIsNewUser: (isNewUser) => {
    set({ isNewUser });
  },
  
  setAuthState: (state) => {
    set({ authState: state });
  },

  setRefreshingToken: () => {
    const current = get().authState;
    if (
      current === 'AUTHENTICATED' ||
      current === 'authenticated' ||
      current === 'TEMPORARILY_UNAVAILABLE'
    ) {
      set({ authState: 'REFRESHING_TOKEN' });
    }
  },

  setTemporarilyUnavailable: () => {
    const current = get().authState;
    if (
      current === 'AUTHENTICATED' ||
      current === 'authenticated' ||
      current === 'REFRESHING_TOKEN'
    ) {
      set({ authState: 'TEMPORARILY_UNAVAILABLE' });
    }
  },

  hydrate: () => {
    set({ authState: 'INITIALIZING' });
    const accessToken = storage.getString('accessToken');
    const refreshToken = storage.getString('refreshToken');
    const userStr = storage.getString('user');
    
    if (accessToken && refreshToken) {
      let user = null;
      try {
        if (userStr) user = JSON.parse(userStr);
      } catch (e) {}
      
      set({ 
        accessToken, 
        refreshToken, 
        user,
        authState: 'AUTHENTICATED' 
      });
    } else {
      set({ authState: 'UNAUTHENTICATED' });
    }
  },
  
  logout: () => {
    storage.remove('accessToken');
    storage.remove('refreshToken');
    storage.remove('user');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isNewUser: false,
      authState: 'UNAUTHENTICATED',
    });
  },
}));
