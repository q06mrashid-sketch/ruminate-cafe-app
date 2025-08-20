import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { palette } from '../design/theme';

export default function MenuScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Menu</Text>
        <View style={styles.card}>
          <Text style={styles.body}>Menu coming soon.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 24, color: palette.coffee, fontFamily: 'Fraunces_700Bold' },
  card: {
    marginTop: 16,
    backgroundColor: palette.paper,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  body: { color: palette.coffee, fontFamily: 'Fraunces_600SemiBold' },
});
