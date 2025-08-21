import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import MembershipInfoCard from './src/components/MembershipInfoCard';

export default function MembershipInfoScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <MembershipInfoCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 28 }
});
