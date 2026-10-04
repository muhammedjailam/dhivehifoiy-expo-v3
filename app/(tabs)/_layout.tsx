import React from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '@/src/components/TabBar';
import { useTheme } from '@/src/theme';

export default function TabLayout() {
  const t = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        sceneStyle: { backgroundColor: t.bg },
        freezeOnBlur: true,
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="my-books" />
      <Tabs.Screen name="menu" />
    </Tabs>
  );
}
