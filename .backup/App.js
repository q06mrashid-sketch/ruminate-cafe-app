import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './src/screens/HomeScreen';
import LoyaltyScreen from './src/screens/LoyaltyScreen';
import MembershipScreen from './src/screens/MembershipScreen';
import WalletPassScreen from './src/screens/WalletPassScreen';
import AdminScreen from './src/screens/AdminScreen';
import theme from './config/theme';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.text,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.primary }
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Loyalty" component={LoyaltyScreen} />
        <Tab.Screen name="Membership" component={MembershipScreen} />
        <Tab.Screen name="Wallet" component={WalletPassScreen} />
        <Tab.Screen name="Admin" component={AdminScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
