import React from 'react';
import CommunityScreen from '../screens/CommunityScreen';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SwipeTabs from './SwipeTabs';
import MembershipInfoScreen from '../screens/MembershipInfoScreen';
import MembershipStartScreen from '../screens/MembershipStartScreen';
import LoyaltyCardCreateScreen from '../screens/LoyaltyCardCreateScreen';
import ManageSubscriptionScreen from '../screens/ManageSubscriptionScreen';
import AccountDetailsScreen from '../screens/AccountDetailsScreen';

const Stack = createNativeStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
  },
};

export default function Router() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator initialRouteName="MainTabs" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={SwipeTabs} />
        <Stack.Screen name="MembershipInfo" component={MembershipInfoScreen} />
        <Stack.Screen name="MembershipStart" component={MembershipStartScreen} />
        <Stack.Screen name="ManageSubscription" component={ManageSubscriptionScreen} />
        <Stack.Screen name="AccountDetails" component={AccountDetailsScreen} />
        <Stack.Screen name="LoyaltyCardCreate" component={LoyaltyCardCreateScreen} />
        <Stack.Screen name="Community" component={CommunityScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}