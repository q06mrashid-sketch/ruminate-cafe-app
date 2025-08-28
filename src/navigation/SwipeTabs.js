
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import HomeScreen from '../screens/HomeScreen';
import MenuScreen from '../screens/MenuScreen';
import MembershipScreen from '../screens/MembershipScreen';
import CommunityScreen from '../screens/CommunityScreen';
import AdminScreen from '../screens/AdminScreen';
import { supabase } from '../lib/supabase';
import CartScreen from '../screens/CartScreen';
import { CartContext } from '../context/CartContext';
import { TabBarHeightContext } from './TabBarHeightContext';
import OrdersScreen from '../screens/OrdersScreen';
import { useOrdersPresence } from '../context/OrdersContext';


const Tab = createMaterialTopTabNavigator();

function GlassTabBar({ state, descriptors, navigation, setHeight }) {
  const insets = useSafeAreaInsets();
  const { itemCount } = useContext(CartContext);
  return (
    <View
      pointerEvents="box-none"
      style={[styles.tabWrap, { paddingBottom: (insets.bottom || 8) + 4 }]}
      onLayout={(e) => setHeight?.(e.nativeEvent.layout.height)}
    >
      <BlurView intensity={90} tint="dark" style={styles.glass}>
        <LinearGradient
          colors={['rgba(58,41,32,0.9)', 'rgba(58,41,32,0.7)']}
          start={{x:0,y:0}}
          end={{x:1,y:1}}
          style={StyleSheet.absoluteFill}
        />
        {state.routes.map((route, i) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const isFocused = state.index === i;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const Icon = options.tabBarIcon;
          return (
            <Pressable key={route.key} onPress={onPress} style={[styles.tabBtn, isFocused && styles.tabBtnActive]}>
              <View style={{ position: 'relative' }}>
                {Icon ? Icon({ focused: isFocused, color: isFocused ? '#FFF7E6' : 'rgba(255,247,230,0.7)' }) : null}
                {route.name === 'Cart' && itemCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{itemCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

export default function SwipeTabs() {
  const [signedIn, setSignedIn] = useState(false);
  const { items } = useContext(CartContext);
  const [tabBarHeight, setTabBarHeight] = useState(0);

  const { hasOrders } = useOrdersPresence();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (active) setSignedIn(!!data?.session?.user);
      } catch {}
    })();
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
    });
    return () => {
      try { sub?.data?.subscription?.unsubscribe?.(); } catch {}
      active = false;
    };
  }, []);

  return (
    <TabBarHeightContext.Provider value={tabBarHeight}>
      <Tab.Navigator
        tabBarPosition="bottom"
        tabBar={(p) => <GlassTabBar {...p} setHeight={setTabBarHeight} />}
        screenOptions={{
          swipeEnabled: true,
          lazy: true,
          tabBarShowIcon: true,
          tabBarIndicatorStyle: { height: 0 },
          animationEnabled: true,
        }}
      >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Ionicons name="home" size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{ title: 'Menu', tabBarIcon: ({ color }) => <Ionicons name="restaurant-outline" size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Membership"
        component={MembershipScreen}
        options={{ title: 'You', tabBarIcon: ({ color }) => <Ionicons name="qr-code-outline" size={22} color={color} /> }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{ title: 'Community', tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={22} color={color} /> }}
      />

      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" size={22} color={color} />,
          tabBarButton: hasOrders ? undefined : () => null,
        }}
      />

      {items.length > 0 && (
        <Tab.Screen
          name="Cart"
          component={CartScreen}
          options={{ title: 'Cart', tabBarIcon: ({ color }) => <Ionicons name="cart-outline" size={22} color={color} /> }}
        />
      )}
      {signedIn && (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{ title: 'Admin', tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={22} color={color} /> }}
        />
      )}
    </Tab.Navigator>
    </TabBarHeightContext.Provider>
  );
}

const styles = StyleSheet.create({
  tabWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  glass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    backgroundColor: 'rgba(58,41,32,0.8)',
    width: '92%',
  },
  tabBtn: { flex: 1, borderRadius: 16, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabBtnActive: { backgroundColor: 'rgba(255,247,230,0.2)' },
  tabLabel: { fontSize: 11, color: 'rgba(255,247,230,0.7)', fontWeight: '600' },
  tabLabelActive: { color: '#FFF7E6' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#FF6B00',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
});
