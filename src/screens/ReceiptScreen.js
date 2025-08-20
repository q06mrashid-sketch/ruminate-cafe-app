
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../design/theme';

export default function ReceiptScreen({ route }) {
  const { name = 'Guest', perk = 'Coffee', remainingDrinks = 0 } = (route?.params || {});
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Receipts</Text>
        <View style={styles.card}>
          <Text style={styles.row}>Name: {name}</Text>
          <Text style={styles.row}>Perk: {perk}</Text>
          <Text style={styles.row}>Free drinks left: {remainingDrinks}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 20 },
  title: { color: palette.coffee, fontSize: 22, marginBottom: 12, fontFamily: 'Fraunces_700Bold' },
  card: { backgroundColor: '#FFF5EA', borderColor: '#E7D6C3', borderWidth: 1, borderRadius: 14, padding: 14 },
  row: { color: palette.coffee, fontSize: 16, marginBottom: 6 }
});
