import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { notificationQueue } from '../../src/services/notifications/notification-queue';
import { TabBar } from '../../src/components/layout/TabBar';

export default function TabsLayout() {
  const router = useRouter();

  // The tabs shell only mounts for a signed-in user once navigation is ready: this is where notification taps are delivered.
  useEffect(
    () =>
      notificationQueue.attachConsumer((path) => {
        try {
          router.push(path as any);
        } catch {
          router.push('/notifications' as any);
        }
      }),
    [router]
  );

  return (
    <Tabs
      tabBar={(props) => <TabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
