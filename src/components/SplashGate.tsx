import React, { useEffect, useState, useRef } from 'react';

import { Image, StyleSheet, Animated, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '../design/theme';
import logo from '../../assets/logo.png';
import { subscribe, getLoadingState, markLoaded } from '../boot/loadingSignals';
import { fetchCMSMap } from '../cms/cmsClient';


const LINES = [
  'collecting beans…',
  'fresh roasting…',
  'grinding coffee…',
  'brewing espresso…',
  'steaming milk…',
  'tamping the puck…',
  'dialling in…',
];

const HARD_TIMEOUT_MS = 12000; // 12s
const ROTATE_MS = 3000;
const FADE_MS = 300;

export default function SplashGate() {

  const [visible, setVisible] = useState(true);
  const [idx, setIdx] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current; // rotating status line
  const gateOpacity = useRef(new Animated.Value(1)).current; // whole splash fade-out


  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const map = await fetchCMSMap();
        console.log('[CMS] received', Object.keys(map).length, 'keys');
        // TODO: pass `map` into whatever state or parser the app uses for menu rendering
      } catch (e) {
        console.warn('[CMS] failed', e);
      } finally {
        markLoaded('cms');
      }
    })();

    const hideGate = () => {
      Animated.timing(gateOpacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => {
        if (mounted) setVisible(false);
      });
    };

    const unsub = subscribe((st) => {
      if (st.auth && st.stamps && st.cms) {
        InteractionManager.runAfterInteractions(hideGate);
      }
    });

    const tmr = setTimeout(hideGate, HARD_TIMEOUT_MS);

    const rot = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => {
        if (mounted) setIdx((i) => (i + 1) % LINES.length);
        Animated.timing(opacity, {
          toValue: 1,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start();
      });
    }, ROTATE_MS);

    // If all are already ready (e.g. dev reload), hide immediately
    const s = getLoadingState();
    if (s.auth && s.stamps && s.cms) {
      InteractionManager.runAfterInteractions(hideGate);
    }

    return () => {
      mounted = false;
      unsub?.();
      clearTimeout(tmr);
      clearInterval(rot);
      gateOpacity.stopAnimation();
      opacity.stopAnimation();
    };
  }, []);

  if (!visible) return null;

  return (

    <Animated.View style={[styles.wrap, { opacity: gateOpacity }]}>
      <SafeAreaView style={styles.sa} edges={["top", "bottom"]}>
        <Image source={logo} style={styles.logo} />
        <Animated.Text style={[styles.line, { opacity }]}>{LINES[idx]}</Animated.Text>
      </SafeAreaView>
    </Animated.View>

  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 9999,
    left: 0, right: 0, top: 0, bottom: 0,

    backgroundColor: palette.cream,
  },
  sa: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
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
