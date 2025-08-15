import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Router from './src/navigation/Router';
import { useFonts, Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';

export default function App() {
  const [loaded] = useFonts({ Fraunces_600SemiBold, Fraunces_700Bold });
  if (!loaded) return <View />;
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <Router />
    </SafeAreaProvider>
  );
}
