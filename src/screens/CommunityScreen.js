import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '../design/theme';
import { getFundProgress, getFundHistory } from '../services/community';

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState({ total_cents: 0, goal_cents: 0, progress: 0 });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getFundProgress().then(setProgress).catch(() => setProgress({ total_cents: 0, goal_cents: 0, progress: 0 }));
    getFundHistory(4).then(setHistory).catch(() => setHistory([]));
  }, []);

  const pct = Math.round((progress.progress || 0) * 100);

  return (
    <SafeAreaView style={styles.safe} edges={['left','right']}>
      <View style={[styles.header, { paddingTop: insets.top }]}><Text style={styles.headerTitle}>Community</Text></View>
      <ScrollView style={{ flex:1, backgroundColor:'transparent' }} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>What is the Community Fund?</Text>
        <Text style={styles.body}>
          A dedicated funding pool that allows Ruminate to engage in local or international causes, projects, and collaborations. It is funded from our operations and memberships, and spending is transparent. We never use Community Fund allocations for ourselves.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>How it’s funded</Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>• 15% of the total net profit of Ruminate is allocated to the Community Pool.</Text>
          <Text style={styles.bullet}>• 60% of Public Membership fees (your monthly subscription) feed directly into the Community Pool.</Text>
          <Text style={styles.bullet}>• Pay-it-Forward purchases increase community impact (free drinks for others). Any surplus can be decided by governance.</Text>
          <Text style={styles.note}>Note: Community/Member pools are funded only from net profit, after operational costs.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>This month</Text>
        <View style={styles.progressWrap}>
          <View style={styles.progressBarOuter}>
            <View style={[styles.progressBarInner, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            £{(progress.total_cents/100).toFixed(2)} raised of £{(progress.goal_cents/100).toFixed(2)} ({pct}%)
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Recent months</Text>
        <View style={styles.tableHead}>
          <Text style={[styles.cell, styles.cellMonth]}>Month</Text>
          <Text style={[styles.cell, styles.cellAmt]}>Raised</Text>
          <Text style={[styles.cell, styles.cellAmt]}>Goal</Text>
          <Text style={[styles.cell, styles.cellBar]}>Progress</Text>
        </View>
        {history.map((row, idx) => {
          const g = row.goal_cents > 0 ? row.goal_cents : 1;
          const p = Math.min(1, row.total_cents / g);
          return (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.cell, styles.cellMonth]}>{row.month}</Text>
              <Text style={[styles.cell, styles.cellAmt]}>£{(row.total_cents/100).toFixed(2)}</Text>
              <Text style={[styles.cell, styles.cellAmt]}>£{(row.goal_cents/100).toFixed(2)}</Text>
              <View style={[styles.cell, styles.cellBar]}>
                <View style={styles.miniBarOuter}>
                  <View style={[styles.miniBarInner, { width: `${Math.round(p*100)}%` }]} />
                </View>
              </View>
            </View>
          );
        })}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor: 'transparent' },
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
  container: { padding: 16, paddingBottom: 120 },
  card: { backgroundColor: palette.paper, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: palette.border, marginBottom: 12 },
  title: { fontSize: 18, marginBottom: 6, color: '#3e2f2b', fontFamily: 'Fraunces_700Bold' },
  body: { fontSize: 15, lineHeight: 22, color: '#6b5a54', fontFamily: 'Fraunces_600SemiBold' },
  bullets: { marginTop: 4 },
  bullet: { fontSize: 15, lineHeight: 22, color: '#6b5a54', marginBottom: 2, fontFamily: 'Fraunces_600SemiBold' },
  note: { marginTop: 6, fontSize: 13, color: '#7c6c66', fontStyle: 'italic', fontFamily: 'Fraunces_600SemiBold' },
  progressWrap: { marginTop: 4 },
  progressBarOuter: { height: 12, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f1e7de', borderWidth: 1, borderColor: palette.border },
  progressBarInner: { height: 12, borderRadius: 10, backgroundColor: '#b96f48' },
  progressLabel: { marginTop: 6, fontSize: 14, color: '#6b5a54', fontFamily: 'Fraunces_600SemiBold' },
  tableHead: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e5d9cf' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3ebe4' },
  cell: { fontSize: 14, color: '#6b5a54', fontFamily: 'Fraunces_600SemiBold' },
  cellMonth: { flex: 1.4 },
  cellAmt: { flex: 1 },
  cellBar: { flex: 1.6, justifyContent: 'center' },
  miniBarOuter: { height: 10, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f1e7de', borderWidth: 1, borderColor: palette.border },
  miniBarInner: { height: 10, borderRadius: 10, backgroundColor: '#b96f48' }
});
