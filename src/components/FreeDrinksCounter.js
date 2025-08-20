import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
    <View style={styles.tile}>
      <Text style={styles.title}>Free Drinks</Text>
      <View style={{ width: size, height: size }}>
        <MaterialCommunityIcons name="coffee-to-go-outline" size={size} color={palette.coffee} style={styles.cup} />
        <View style={[styles.fillWrap, { height: size * ratio }]}>
          <MaterialCommunityIcons name="coffee-to-go" size={size} color={palette.coffee} />
        </View>
      </View>
      <Text style={styles.label}>{count} / 3 remaining</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: palette.paper,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    alignSelf: 'center',
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    color: palette.coffee,
    marginBottom: 8,
  },
  cup: { position: 'absolute', top: 0, left: 0 },
  fillWrap: { position: 'absolute', bottom: 0, overflow: 'hidden', width: '100%' },
  label: { marginTop: 6, color: palette.coffee, fontFamily: 'Fraunces_600SemiBold' },
});
