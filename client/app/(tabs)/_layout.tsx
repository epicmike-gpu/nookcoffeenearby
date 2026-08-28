import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function TabLayout() {
  // 紧凑型 Tab 栏：默认高度为 49 + 底部安全区(约34) ≈ 83，
  // 通过显式 height + 覆盖 paddingBottom 压缩到 54（接近减半）。
  // paddingBottom 保留 14 以避开 iPhone Home 指示条区域，防止文字被遮挡。
  const tabBarStyle = {
    backgroundColor: '#FAFAFA',
    borderTopWidth: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 } as { width: number; height: number },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    height: 54,
    paddingTop: 2,
    paddingBottom: 14,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: '#111111',
        tabBarInactiveTintColor: '#D1D5DB',
        // 收紧每个 Tab 项的内边距（默认 padding: 5），适配压缩后的高度
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <Feather name="compass" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => (
            <Feather name="globe" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color }) => (
            <Feather name="heart" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Check-ins',
          tabBarIcon: ({ color }) => (
            <Feather name="map-pin" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
