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

export default function App() {
  const [loaded] = useFonts({ Fraunces_600SemiBold, Fraunces_700Bold });
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data?.session?.user?.id;
      if (uid) {
        try {
          const { data: row } = await supabase
            .from('profiles')
            .select('loyalty_stamps, free_drinks')
            .eq('id', uid)
            .single();
          console.log(
            `[LOYALTY] on boot → stamps: ${row?.loyalty_stamps ?? 0}, free drinks: ${row?.free_drinks ?? 0}`
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
