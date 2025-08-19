import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Animated } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { palette } from '../design/theme';
import GlowingGlassButton from '../components/GlowingGlassButton';
import { supabase } from '../lib/supabase';
import { getMembershipSummary } from '../services/membership';
import { getFundCurrent } from '../services/community';
import { getToday, getPayItForward, getFreeDrinkProgress, openInstagramProfile } from '../services/homeData';
import { getCMS } from '../services/cms';

function ProgressBar({ value, max, tint = palette.clay, track = '#EED8C4' }) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <View style={[styles.barOuter, { backgroundColor: track }]}>
      <View style={[styles.barInner, { width: `${pct * 100}%`, backgroundColor: tint }]} />
    </View>
  );
}

function Chip({ children }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{children}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const isFocused = useIsFocused();

  const [member, setMember] = useState({ status: 'none', next_billing_at: null, signedIn: false });
  const [fund, setFund] = useState({ total_cents: 0, goal_cents: 0 });
  const [today, setToday] = useState({ openNow: false, until: '--:--', specials: [] });
  const [pif, setPif] = useState({ available: 0, contributed: 0 });
  const [loyalty, setLoyalty] = useState({ current: 0, target: 10 });
  const [rumiQuote, setRumiQuote] = useState(null);

  // Load data whenever screen focuses
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const m = await getMembershipSummary();
        if (mounted && m) {
          // Preserve your original “Active/Not a member” logic; signedIn derives from summary or session (see auth effect below)
          setMember(prev => ({ ...prev, ...m }));
        }
      } catch {}
      try { const f = await getFundCurrent(); if (mounted && f) setFund(f); } catch {}
      try { const t = await getToday(); if (mounted) setToday(t); } catch {}
      try { const s = await getPayItForward(); if (mounted) setPif(s); } catch {}
      try { const d = await getFreeDrinkProgress(); if (mounted) setLoyalty(d); } catch {}

      try {
        const cms = await getCMS();
        if (!mounted || !cms) return;
        const s1 = cms['special 1'] || null;
        const s2 = cms['special 2'] || null;
        if (s1 || s2) {
          setToday(prev => ({ ...prev, specials: [s1, s2].filter(Boolean) }));
        }
        if (cms['rumi quote']) setRumiQuote(cms['rumi quote']);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [isFocused]);

  // Keep signed-in flag in sync with Supabase auth
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (active) setMember(prev => ({ ...prev, signedIn: !!data?.session?.user }));
      } catch {}
    })();
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      setMember(prev => ({ ...prev, signedIn: !!session?.user }));
    });
    return () => { try { sub.data.subscription.unsubscribe(); } catch {} active = false; };
  }, []);

  const nextBill = member?.next_billing_at ? new Date(member.next_billing_at).toLocaleDateString() : null;
  const signedIn = !!member?.signedIn;
  const membershipLabel = !signedIn ? 'Not signed in' : (member?.tier === 'paid' ? 'Member' : 'Free');
  const membershipColor = (signedIn && member?.tier === 'paid') ? palette.clay : palette.coffee;

  const quoteOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (signedIn) {
      try { quoteOpacity.setValue(0); } catch {}
      Animated.timing(quoteOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
    }
  }, [signedIn]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>Welcome to Ruminate Café</Text>
          <Text style={styles.subcopy}>
            Track perks, collect stamps, view receipts, and support the community fund.
          </Text>

          <View style={{ height: 18 }} />

          <View style={styles.rowBetween}>
  <Text style={styles.sectionLabel}>Membership</Text>
  <Text style={[styles.sectionValue, { color: membershipColor }]}>
    {membershipLabel}{nextBill ? ` · renews ${nextBill}` : ''}
  </Text>
</View>

          {signedIn ? (
            <View>
              <Pressable onPress={() => navigation.navigate('Community')} style={{ marginTop: 16 }}>
                <Text style={styles.sectionLabel}>Community fund (this month)</Text>
                <ProgressBar value={fund?.total_cents || 0} max={(fund?.goal_cents || 0) || 1} />
                <Text style={styles.muted}>
                  £{((fund?.total_cents || 0) / 100).toFixed(2)}
                  {(fund?.goal_cents || 0) ? ` / £${((fund?.goal_cents || 0) / 100).toFixed(2)}` : ''}
                </Text>
              </Pressable>

              <View style={{ marginTop: 20 }}>
                <Text style={styles.sectionLabel}>Free drinks progress</Text>
                <ProgressBar value={loyalty.current} max={loyalty.target} tint={palette.coffee} track="#F1E3D3" />
                <Text style={styles.muted}>{loyalty.current} / {loyalty.target} stamps</Text>
              </View>

              {rumiQuote ? (
                <Animated.View style={[{ marginTop: 16, alignItems: 'center', paddingHorizontal: 12 }, { opacity: quoteOpacity }]}>
                  <Text style={styles.rumiQuoteStandalone}>“{rumiQuote}”</Text>
                  <Text style={styles.rumiAttributionStandalone}>— Rumi</Text>
                </Animated.View>
              ) : null}
            </View>
          ) : (
            <View>
              <View style={{ height: 18 }} />
              <GlowingGlassButton text="Join today" variant="dark" ring onPress={() => navigation.navigate('MembershipStart')} />
              <View style={{ height: 10 }} />
              <GlowingGlassButton text="Learn about Membership & Profit Sharing" variant="light" onPress={() => navigation.navigate('Membership')} />

              <Pressable onPress={() => navigation.navigate('Community')} style={{ marginTop: 16 }}>
                <Text style={styles.sectionLabel}>Community fund (this month)</Text>
                <ProgressBar value={fund?.total_cents || 0} max={(fund?.goal_cents || 0) || 1} />
                <Text style={styles.muted}>
                  £{((fund?.total_cents || 0) / 100).toFixed(2)}
                  {(fund?.goal_cents || 0) ? ` / £${((fund?.goal_cents || 0) / 100).toFixed(2)}` : ''}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.gridRow}>
          <View style={[styles.card, styles.gridItem]}>
            <Text style={styles.cardTitle}>Today</Text>
            <Text style={styles.muted}>🕑 {today.openNow ? 'Open now' : 'Closed'} until {today.until}</Text>
            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Specials</Text>
            <View style={styles.chipsRow}>
              {today.specials.map((s) => <Chip key={s}>{s}</Chip>)}
            </View>
          </View>

          <View style={[styles.card, styles.gridItem, styles.gridItemRight]}>
  <Text style={styles.cardTitle}>Pay-it-Forward</Text>
  <View style={styles.pifTile}>
    <View style={styles.pifNumberWrap}>
      <Text style={styles.pifBig}>{pif.available}</Text>
    </View>
    <View style={styles.pifMeta}>
      <Text style={styles.muted}>drinks available</Text>
      <Text style={styles.muted}>Total contributed: {pif.contributed}</Text>
    </View>
  </View>
</View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Latest on Instagram</Text>
          <Pressable onPress={openInstagramProfile} style={styles.igCard}>
            <Image source={{ uri: 'https://picsum.photos/seed/ruminatecafe/1200/700' }} style={styles.igImage} resizeMode="cover" />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent receipts</Text>
          <Pressable onPress={() => navigation.navigate('Receipt')}>
            <Text style={styles.link}>View all receipts →</Text>
          </Pressable>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.cream },
  content: { padding: 16, paddingBottom: 28 },

  hero: { marginBottom: 18 },
  title: { fontSize: 28, color: palette.coffee, fontFamily: 'Fraunces_700Bold' },
  subcopy: { marginTop: 10, color: palette.coffee, lineHeight: 22, fontFamily: 'Fraunces_600SemiBold' },

  card: {
    backgroundColor: palette.paper,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },

  gridRow: { flexDirection: 'row', marginBottom: 14 },
  gridItem: { flex: 1, aspectRatio: 1, justifyContent: 'space-between' },
  gridItemRight: { marginLeft: 12 },

  sectionLabel: { fontSize: 15, color: palette.coffee, fontFamily: 'Fraunces_600SemiBold' },
  sectionValue: { fontSize: 16, fontFamily: 'Fraunces_700Bold' },
  cardTitle: { fontSize: 18, color: palette.coffee, fontFamily: 'Fraunces_700Bold', marginBottom: 8 },
  muted: { marginTop: 6, color: palette.coffee },
  link: { marginTop: 6, color: palette.clay, fontFamily: 'Fraunces_600SemiBold' },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },,
    pifTile: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },,
    pifNumberWrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },,
    pifMeta: { alignItems: 'center', paddingBottom: 6 },
    

  barOuter: { height: 10, borderRadius: 10, overflow: 'hidden' },
  barInner: { height: 10, borderRadius: 10 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  chip: { backgroundColor: '#F1E3D3', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginRight: 6, marginBottom: 6 },
  chipText: { color: palette.coffee, fontFamily: 'Fraunces_600SemiBold', fontSize: 12 },

  pifBig: { textAlign: 'center',  fontSize: 40, lineHeight: 40, color: palette.clay, fontFamily: 'Fraunces_700Bold' },

  igCard: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: palette.border },
  igImage: { width: '100%', height: 180 },

  rumiQuoteStandalone: {
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    fontStyle: 'italic',
    color: palette.clay,
    fontFamily: 'Fraunces_600SemiBold',
  },
  rumiAttributionStandalone: {
    marginTop: 4,
    fontSize: 14,
    textAlign: 'center',
    color: '#6b5a54',
    fontFamily: 'Fraunces_600SemiBold',
  },
});