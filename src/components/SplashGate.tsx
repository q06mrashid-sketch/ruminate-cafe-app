import React, { useEffect, useState, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
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
const ROTATE_MS = 3000;
const FADE_MS = 300;
export default function SplashGate() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(true);
  const [idx, setIdx] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;


  useEffect(() => {
    patchConsoleForLoadingSignals();

    const unsub = subscribe((st) => {
      if (st.auth && st.stamps && st.cms) setVisible(false);
    });

    const tmr = setTimeout(() => setVisible(false), HARD_TIMEOUT_MS);

    const rot = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => {
        setIdx(i => (i + 1) % LINES.length);
        Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
      });
    }, ROTATE_MS);


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
      <Animated.Text style={[styles.line, { opacity }]}>{LINES[idx]}</Animated.Text>

    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 9999,
    left: 0, right: 0, top: 0, bottom: 0,

    backgroundColor: palette.cream,

    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: { width: 156, height: 156, resizeMode: 'contain', marginBottom: 16 },
  line: {
    color: palette.coffee,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Fraunces_700Bold',
    marginTop: 12,
    paddingTop: 8,
  },
});
