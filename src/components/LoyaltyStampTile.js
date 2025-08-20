import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { palette } from '../design/theme';

/**
 * Displays loyalty stamp progress as 8 coffee beans (two rows of four).
 * @param {Object} props
 * @param {number} props.count - Number of stamps collected.
 * @param {function} [props.onRedeem] - Called when user taps the redeem button.
 */
export default function LoyaltyStampTile({ count = 0, onRedeem }) {
  const beans = Array.from({ length: 8 }, (_, i) => i < count);
  const canRedeem = count >= 8;
  return (
    <View style={styles.tile}>
      <Text style={styles.title}>Loyalty</Text>
      <View style={styles.beansWrap}>
        {beans.map((filled, i) => (
          <MaterialCommunityIcons
            key={i}
            name={filled ? 'coffee-bean' : 'coffee-bean-outline'}
            size={24}
            color={palette.coffee}
            style={styles.bean}
          />
        ))}
      </View>
      {canRedeem && (
        <Pressable style={styles.redeemBtn} onPress={onRedeem}>
          <Text style={styles.redeemText}>Use free drink!</Text>
        </Pressable>
      )}
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
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    color: palette.coffee,
    marginBottom: 8,
  },
  beansWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 120,
    justifyContent: 'space-between',
  },
  bean: {
    width: 24,
    height: 24,
    margin: 4,
  },
  redeemBtn: {
    marginTop: 12,
    backgroundColor: palette.clay,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  redeemText: {
    color: '#fff',
    fontFamily: 'Fraunces_700Bold',
  },
});
