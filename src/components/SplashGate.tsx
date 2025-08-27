import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '../design/theme';
import logo from '../../assets/logo.png';
import {
  patchConsoleForLoadingSignals,
  subscribe,
  getLoadingState,
} from '../boot/loadingSignals';

const LINES = [
  'collecting beans…',
  'fresh roasting…',
  'grinding coffee…',
  'brewing espresso…',
  'steaming milk…',
  'tamping the puck…',
  'dialling in…',
];

const HARD_TIMEOUT_MS = 30000; // 30s
const ROTATE_MS = 1500;

export default function SplashGate() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(true);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    patchConsoleForLoadingSignals();

    const unsub = subscribe((st) => {
      if (st.auth && st.stamps && st.cms) setVisible(false);
    });

    const tmr = setTimeout(() => setVisible(false), HARD_TIMEOUT_MS);
    const rot = setInterval(() => setIdx(i => (i + 1) % LINES.length), ROTATE_MS);

    // If all are already ready (e.g. dev reload), hide immediately
    const s = getLoadingState();
    if (s.auth && s.stamps && s.cms) setVisible(false);

    return () => {
      unsub?.();
      clearTimeout(tmr);
      clearInterval(rot);
    };
  }, []);

  if (!visible) return null;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> 
      <Image source={logo} style={styles.logo} />
      <Text style={styles.line}>{LINES[idx]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 9999,
    left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: palette.coffee,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: { width: 120, height: 120, resizeMode: 'contain', marginBottom: 16 },
  line: {
    color: '#F8EBDD',
    fontSize: 16,
    textAlign: 'center',
  },
});
