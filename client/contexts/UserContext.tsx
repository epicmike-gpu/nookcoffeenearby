import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { API_BASE_URL } from '@/utils/api';

interface User {
  id: string;
  device_id: string;
  nickname: string;
  avatar_url: string | null;
  created_at: string;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  updateUser: (data: { nickname?: string }) => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  refreshUser: () => Promise.resolve(),
  updateUser: () => Promise.resolve(),
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getOrCreateDeviceId = async (): Promise<string> => {
    const STORAGE_KEY = '@coffee_device_id';
    let deviceId = await AsyncStorage.getItem(STORAGE_KEY);
    if (!deviceId) {
      deviceId = Crypto.randomUUID();
      await AsyncStorage.setItem(STORAGE_KEY, deviceId);
    }
    return deviceId;
  };

  const refreshUser = useCallback(async () => {
    try {
      const deviceId = await getOrCreateDeviceId();
      /**
       * 服务端文件：server/src/index.ts
       * 接口：POST /api/v1/users
       * Body 参数：device_id: string, nickname?: string
       */
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      });
      if (!response.ok) throw new Error('Failed to register user');
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Failed to init user:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (data: { nickname?: string }) => {
    if (!user) return;
    try {
      /**
       * 服务端文件：server/src/index.ts
       * 接口：PUT /api/v1/users/:id
       * Path 参数：id: string
       * Body 参数：nickname?: string, avatar_url?: string
       */
      const response = await fetch(`${API_BASE_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update user');
      const updated = await response.json();
      setUser(updated);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  }, [user]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ user, isLoading, refreshUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
