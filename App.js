import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar, ImageBackground } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CartProvider } from './src/context/CartContext';
import { OrdersProvider } from './src/context/OrdersContext';
import Router from './src/navigation/Router';
import { useFonts, Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import appBgBase64 from './assets/appBgBase64';
import SplashGate from './src/components/SplashGate';
import { supabase } from './src/lib/supabase';
import { getMyStats } from './src/services/stats';

export default function App() {
  const [loaded] = useFonts({ Fraunces_600SemiBold, Fraunces_700Bold });
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data?.session?.user?.id;
      if (uid) {
        try {
          const { loyaltyStamps, freebiesLeft } = await getMyStats();
          console.log(
            `[LOYALTY] on boot → stamps: ${loyaltyStamps}, free drinks: ${freebiesLeft}`
          );
        } catch {}
      }
    });
  }, []);
  if (!loaded)
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ImageBackground
          source={{ uri: `data:image/png;base64,${appBgBase64}` }}
          style={{ flex: 1 }}
        />
      </GestureHandlerRootView>
    );
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ImageBackground
        source={{ uri: `data:image/png;base64,${appBgBase64}` }}
        style={{ flex: 1 }}
      >
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" />
          <CartProvider>
            <OrdersProvider>
              <Router />
            </OrdersProvider>
          </CartProvider>
          <SplashGate />
        </SafeAreaProvider>
      </ImageBackground>
    </GestureHandlerRootView>
  );
}
