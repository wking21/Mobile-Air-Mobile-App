import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TabIcon, TabIconKind } from '../components/TabIcon';
import { AssetsScreen } from '../screens/AssetsScreen';
import { DeliveriesScreen } from '../screens/DeliveriesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ItemsScreen } from '../screens/ItemsScreen';
import { PickupsScreen } from '../screens/PickupsScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, TabIconKind> = {
  Home: 'circle',
  Deliver: 'triangleDown',
  Pickup: 'triangleUp',
  Items: 'square',
  Assets: 'ring',
  Review: 'diamond',
};

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.sub,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ color }) => (
            <View style={styles.iconWrap}>
              <TabIcon kind={ICONS[route.name]} color={color} />
            </View>
          ),
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Deliver" component={DeliveriesScreen} />
        <Tab.Screen name="Pickup" component={PickupsScreen} />
        <Tab.Screen name="Items" component={ItemsScreen} />
        <Tab.Screen name="Assets" component={AssetsScreen} />
        <Tab.Screen name="Review" component={ReviewScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  iconWrap: { alignItems: 'center', justifyContent: 'center', height: 9 },
});
