import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { palette } from '../design/theme';
import { getFundCurrent } from '../services/community';

function ProgressBar({ value, max, tint = palette.clay, track = '#EED8C4' }) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <View style={[styles.barOuter, { backgroundColor: track }]}>
      <View style={[styles.barInner, { width: `${pct * 100}%`, backgroundColor: tint }]} />
    </View>
  );
}

export default function CommunityScreen() {
  const [fund, setFund] = useState({ total_cents: 0, goal_cents: 0 });

  useEffect(() => {
    let m = true;
    (async () => {
      try {
        const f = await getFundCurrent();
        if (m && f) setFund(f);
      } catch {}
    })();
    return () => { m = false; };
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Community Fund</Text>
      <Text style={styles.subtitle}>This month</Text>
      <View style={{ marginTop: 12 }}>
        <ProgressBar value={fund.total_cents} max={fund.goal_cents} />
        <Text style={styles.muted}>
          £{(fund.total_cents / 100).toFixed(2)} / £{(fund.goal_cents / 100).toFixed(2)}
        </Text>
      </View>
      <View style={{ height: 24 }} />
      <Text style={styles.note}>Thank you for supporting the community.</Text>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.cream },
  content: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 24, color: palette.coffee, fontFamily: 'Fraunces_700Bold' },
  subtitle: { marginTop: 6, color: palette.coffee, fontFamily: 'Fraunces_600SemiBold' },
  muted: { marginTop: 6, color: palette.coffee },
  note: { color: palette.coffee, fontFamily: 'Fraunces_600SemiBold' },
  barOuter: { height: 10, borderRadius: 10, overflow: 'hidden' },
  barInner: { height: 10, borderRadius: 10 },
});
