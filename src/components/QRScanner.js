import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import theme from '../../config/theme';

/**
 * QRScanner wraps expo-barcode-scanner to request camera permissions
 * and call `onScan` when a QR code is detected.
 *
 * @param {Object} props
 * @param {(data: string) => void} props.onScan - callback invoked with scanned data
 */
export default function QRScanner({ onScan }) {
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  if (hasPermission === null) return <Text>Requesting camera permission...</Text>;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={({ data }) => onScan(data)}
        style={StyleSheet.absoluteFillObject}
      />
      <Text style={styles.instruction}>Align QR code inside the frame</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
  instruction: {
    position: 'absolute',
    bottom: 40,
    fontSize: 18,
    color: theme.colors.primary,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 8,
    borderRadius: 6
  }
});