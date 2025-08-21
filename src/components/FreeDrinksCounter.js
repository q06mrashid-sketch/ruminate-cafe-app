import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Svg, { Circle } from 'react-native-svg';
import { palette } from '../design/theme';

export default function FreeDrinksCounter({ count = 0 }) {
  const limit = 3;
  const remaining = Math.max(0, Math.min(limit, count));
  const ratio = remaining / limit;
  const size = 64;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  return (
    <View style={styles.tile}>
      <Text style={styles.title}>Free Drinks</Text>
      <View style={styles.row}>
        <MaterialCommunityIcons name="coffee" size={size} color={palette.coffee} />
        <Svg width={size} height={size} style={{ marginLeft: 12 }}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={palette.border} strokeWidth={4} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={palette.coffee}
            strokeWidth={4}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ratio)}
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <Text style={styles.label}>{`${remaining} / ${limit} remaining this month`}</Text>
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
    alignSelf: 'stretch',
    width: '100%',
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    color: palette.coffee,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  label: { marginTop: 6, color: palette.coffee, fontFamily: 'Fraunces_600SemiBold' },
});