import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function TabLayout() {
  const tabBarStyle = {
    backgroundColor: '#FAFAFA',
    borderTopWidth: 0,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: -2 } as { width: number; height: number },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: '#111111',
        tabBarInactiveTintColor: '#D1D5DB',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <Feather name="compass" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => (
            <Feather name="globe" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color }) => (
            <Feather name="heart" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Check-ins',
          tabBarIcon: ({ color }) => (
            <Feather name="map-pin" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
