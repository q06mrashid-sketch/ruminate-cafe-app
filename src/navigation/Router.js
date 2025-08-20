
import React from 'react';
import CommunityScreen from '../screens/CommunityScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SwipeTabs from './SwipeTabs';
import MembershipInfoScreen from '../screens/MembershipInfoScreen';
import MembershipStartScreen from '../screens/MembershipStartScreen';
import LoyaltyCardCreateScreen from '../screens/LoyaltyCardCreateScreen';
import ManageSubscriptionScreen from '../screens/ManageSubscriptionScreen';

const Stack = createNativeStackNavigator();

export default function Router() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="MainTabs" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Community" component={CommunityScreen} options={{ headerShown:false }} />

        <Stack.Screen name="MainTabs" component={SwipeTabs} />
        <Stack.Screen name="MembershipInfo" component={MembershipInfoScreen} />
        <Stack.Screen name="MembershipStart" component={MembershipStartScreen} />
        <Stack.Screen name="ManageSubscription" component={ManageSubscriptionScreen} />
        <Stack.Screen name="LoyaltyCardCreate" component={LoyaltyCardCreateScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
