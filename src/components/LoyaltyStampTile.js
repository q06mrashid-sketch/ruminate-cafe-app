import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { palette } from '../design/theme';

export default function LoyaltyStampTile({ count = 0 }) {
  const filled = Math.max(0, Math.floor(count % 8));
  const beans = Array.from({ length: 8 }, (_, i) => i < filled);
  const canRedeem = count >= 8;
  const Bean = ({ filled }) => (
    <Svg width={24} height={24} viewBox="0 0 24 24" style={styles.bean}>
      <Path
        d="M12 2C7 2 4 6 4 12s3 10 8 10 8-4 8-10S17 2 12 2z"
        fill={filled ? palette.coffee : 'none'}
        stroke={palette.coffee}
        strokeWidth={2}
      />
      <Path
        d="M12 4c-2 2-3 5-3 8s1 6 3 8"
        stroke={palette.coffee}
        strokeWidth={2}
      />
    </Svg>
  );
  const bigFilled = canRedeem;
  return (
    <View style={styles.tile}>
      <Text style={styles.title}>Loyalty</Text>
      <Text style={styles.desc}>Purchase 8 hot drinks and receive a free drink voucher!</Text>
      <View style={styles.beansSection}>
        <View style={styles.beansGrid}>
          <View style={styles.beansRow}>
            {beans.slice(0, 4).map((f, i) => (
              <Bean key={i} filled={f} />
            ))}
          </View>
          <View style={styles.beansRow}>
            {beans.slice(4, 8).map((f, i) => (
              <Bean key={i + 4} filled={f} />
            ))}
          </View>
        </View>
        <Svg width={32} height={32} viewBox="0 0 24 24" style={styles.bigBean}>
          <Path
            d="M12 2C7 2 4 6 4 12s3 10 8 10 8-4 8-10S17 2 12 2z"
            fill={bigFilled ? palette.coffee : 'none'}
            stroke={palette.coffee}
            strokeWidth={2}
          />
          <Path
            d="M12 4c-2 2-3 5-3 8s1 6 3 8"
            stroke={palette.coffee}
            strokeWidth={2}
          />
        </Svg>
      </View>
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
  desc: {
    fontFamily: 'Fraunces_600SemiBold',
    color: palette.coffee,
    textAlign: 'center',
    marginBottom: 8,
  },
  beansSection: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  beansGrid: { },
  beansRow: { flexDirection: 'row' },
  bean: { width: 24, height: 24, margin: 4 },
  bigBean: { marginLeft: 12 },
});