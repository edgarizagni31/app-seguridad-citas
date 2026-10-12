import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { SyncStatusBanner } from '@/core/composition';
import { useAppSections, type AppSection } from '@/modules/auth';
import { STRINGS } from '@/shared/lib';
import { Icon, Screen, tabBarTheme, type IconName } from '@/shared/ui';

type TabIconProps = { color: ColorValue; size: number };

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color, size }: TabIconProps) => <Icon name={icon} color={color} size={size} />,
});

export default function TabsLayout() {
  const sections = useAppSections();
  const allowed = (section: AppSection) => sections.includes(section);

  return (
    <Screen edges={['top']}>
      <SyncStatusBanner />
      <Tabs screenOptions={tabBarTheme}>
        <Tabs.Protected guard={allowed('gate')}>
          <Tabs.Screen name="index" options={tab(STRINGS.tabs.gate, 'boom-gate')} />
        </Tabs.Protected>
        <Tabs.Protected guard={allowed('inspections')}>
          <Tabs.Screen
            name="inspections"
            options={tab(STRINGS.tabs.inspections, 'clipboard-check-outline')}
          />
        </Tabs.Protected>
        <Tabs.Screen name="history" options={tab(STRINGS.tabs.history, 'history')} />
        <Tabs.Screen name="profile" options={tab(STRINGS.tabs.profile, 'account-circle-outline')} />
      </Tabs>
    </Screen>
  );
}
