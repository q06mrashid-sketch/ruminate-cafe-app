import React from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { palette } from '../design/theme';

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <View style={[styles.header, { paddingTop: insets.top }] }><Text style={styles.headerTitle}>Menu</Text></View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.body}>Menu coming soon.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.cream },
  header: {
    backgroundColor: palette.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: { fontSize: 20, color: '#3E2723', fontFamily: 'Fraunces_700Bold' },
  content: { padding: 16, paddingBottom: 120 },
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
