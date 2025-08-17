
import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import useLoyalty from '../hooks/useLoyalty';
import theme from '../../config/theme';

export default function LoyaltyScreen() {
  const { members } = useLoyalty(true);

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text>{item.membership ? 'Member' : 'Guest'}</Text>
            <Text>Free Drinks Left: {item.freeDrinksRemaining}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
  card: { backgroundColor: '#fff', padding: 12, marginBottom: 10, borderRadius: 8 },
  name: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary }
});