import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { palette } from '../design/theme';

/**
 * Displays remaining free drinks as a coffee cup that empties by thirds.
 * @param {Object} props
 * @param {number} props.count - Number of free drinks remaining (0-3)
 */
export default function FreeDrinksCounter({ count = 0 }) {
  const ratio = Math.max(0, Math.min(1, count / 3));
  const size = 64;
  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Ionicons name="cafe-outline" size={size} color={palette.clay} style={styles.cup} />
        <View style={[styles.fillWrap, { height: size * ratio }]}>
          <Ionicons name="cafe" size={size} color={palette.clay} />
        </View>
      </View>
      <Text style={styles.label}>{count} / 3 free drinks</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  cup: { position: 'absolute', top: 0, left: 0 },
  fillWrap: { position: 'absolute', bottom: 0, overflow: 'hidden', width: '100%' },
  label: { marginTop: 6, color: palette.clay, fontFamily: 'Fraunces_600SemiBold' },
});
