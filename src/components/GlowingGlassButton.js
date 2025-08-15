import React, { useEffect, useRef } from 'react';
import { Pressable, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function GlowingGlassButton({
  text,
  onPress,
  variant = 'dark', // 'dark' | 'light'
  ring = false,
}) {
  const breathe = useRef(new Animated.Value(0)).current;
  const sweepX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [breathe]);

  useEffect(() => {
    const loop = () => {
      sweepX.setValue(-1);
      Animated.sequence([
        Animated.delay(2000),
        Animated.timing(sweepX, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]).start(loop);
    };
    loop();
  }, [sweepX]);

  const bgGradient = variant === 'dark'
    ? ['#e86aa0', '#f497b1']
    : ['#fff6ef', '#ffe9dd'];

  const textColor = variant === 'dark' ? '#FFFFFF' : '#5a3f33';

  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      {ring && (
        <Animated.View style={[styles.ringWrap, { opacity: breathe.interpolate({ inputRange:[0,1], outputRange:[0.25,0.5] }) }]}>
          <LinearGradient
            colors={['#ff7ab3','#ffd36e','#7ef7d9','#82a0ff','#ff7ab3']}
            start={{x:0,y:0}} end={{x:1,y:1}}
            style={styles.ring}
          />
        </Animated.View>
      )}
      <LinearGradient colors={bgGradient} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.button}>
        <Text style={[styles.label, { color: textColor }]}>{text}</Text>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.sheen,
            {
              transform: [{
                translateX: sweepX.interpolate({ inputRange: [-1,1], outputRange: [-240, 240] })
              }]
            }
          ]}
        >
          <LinearGradient
            colors={['transparent','rgba(255,255,255,0.12)','transparent']}
            start={{x:0,y:0.5}} end={{x:1,y:0.5}}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  ringWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, padding: 2, borderRadius: 16 },
  ring: { flex: 1, borderRadius: 16, opacity: 0.45 },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  label: { fontFamily: 'Fraunces_700Bold', fontSize: 16 },
  sheen: { position: 'absolute', top: 0, bottom: 0, width: 100 },
});
