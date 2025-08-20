
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
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

const Tab = createMaterialTopTabNavigator();

function GlassTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.tabWrap, { paddingBottom: (insets.bottom || 8) + 4 }]}>
      <BlurView intensity={80} tint="light" style={styles.glass}>
        <LinearGradient
          colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.15)']}
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
              {Icon ? Icon({ focused: isFocused, color: isFocused ? '#B45C3D' : '#6A4B3A' }) : null}
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
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={(p) => <GlassTabBar {...p} />}
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
      {signedIn && (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{ title: 'Admin', tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={22} color={color} /> }}
        />
      )}
    </Tab.Navigator>
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
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.45)',
    width: '92%',
  },
  tabBtn: { flex: 1, borderRadius: 16, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.35)' },
  tabLabel: { fontSize: 11, color: '#6A4B3A', fontWeight: '600' },
  tabLabelActive: { color: '#B45C3D' },
});
