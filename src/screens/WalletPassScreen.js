
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../../config/theme';

export default function WalletPassScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Add your pass to Apple Wallet</Text>
      <Text>Download from your membership email or QR code</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 20, fontWeight: 'bold', color: theme.colors.primary, marginBottom: 10 }
});