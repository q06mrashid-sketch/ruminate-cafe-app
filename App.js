import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, ImageBackground } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Router from './src/navigation/Router';
import { useFonts, Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import appBgBase64 from './assets/appBgBase64';

export default function App() {
  const [loaded] = useFonts({ Fraunces_600SemiBold, Fraunces_700Bold });
  if (!loaded) return (
    <ImageBackground
      source={{ uri: `data:image/png;base64,${appBgBase64}` }}
      style={{ flex: 1 }}
    />
  );
  return (
    <ImageBackground
      source={{ uri: `data:image/png;base64,${appBgBase64}` }}
      style={{ flex: 1 }}
    >
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <Router />
      </SafeAreaProvider>
    </ImageBackground>
  );
}