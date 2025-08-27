import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, ImageBackground } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CartProvider } from './src/context/CartContext';
import Router from './src/navigation/Router';
import { useFonts, Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import appBgBase64 from './assets/appBgBase64';
import SplashGate from './src/components/SplashGate';
import './src/boot/preload';

export default function App() {
  const [loaded] = useFonts({ Fraunces_600SemiBold, Fraunces_700Bold });
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
            <Router />
          </CartProvider>
          <SplashGate />
        </SafeAreaProvider>
      </ImageBackground>
    </GestureHandlerRootView>
  );
}
