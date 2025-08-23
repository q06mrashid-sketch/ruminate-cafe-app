import React, { useEffect, useState, useRef } from 'react';
import { getPIFStats } from '../services/pif';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Animated, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { palette } from '../design/theme';
import GlowingGlassButton from '../components/GlowingGlassButton';
import LoyaltyStampTile from '../components/LoyaltyStampTile';
import FreeDrinksCounter from '../components/FreeDrinksCounter';
import { supabase } from '../lib/supabase';
import { getMembershipSummary } from '../services/membership';
import { getFundCurrent, getFundProgress } from '../services/community';
import { getToday, getPayItForward, openInstagramProfile, getWeeklyHours, getLatestInstagramPost } from '../services/homeData';
import { getMyStats } from '../services/stats';
import { getCMS } from '../services/cms';
import logo from '../../assets/logo.png';

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
  const insets = useSafeAreaInsets();
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [weekHours, setWeekHours] = useState([]);
  const isFocused = useIsFocused();
  const [member, setMember] = useState({ status: 'none', next_billing_at: null, signedIn: false });
  const [fund, setFund] = useState({ total_cents: 0, goal_cents: 0 });
  const [today, setToday] = useState({ openNow: false, until: '--:--', specials: [] });
  const [pif, setPif] = useState({ available: 0, contributed: 0 });
  const [loyalty, setLoyalty] = useState({ current: 0, target: 8 });
  const [freebiesLeft, setFreebiesLeft] = useState(0);
  const [rumiQuote, setRumiQuote] = useState(null);
  const [igPost, setIgPost] = useState({ image: null, caption: '', url: null });

  useEffect(() => {
    getFundProgress().then(setFund).catch(() => setFund({ progress: 0, total_cents: 0, goal_cents: 0 }));
    getWeeklyHours().then(setWeekHours).catch(() => setWeekHours([]));
    if (globalThis.freebiesLeft !== undefined) setFreebiesLeft(globalThis.freebiesLeft);
    if (globalThis.loyaltyStamps !== undefined) setLoyalty({ current: globalThis.loyaltyStamps, target: 8 });
    let mounted = true;
    (async () => {
      try { const m = await getMembershipSummary(); if (mounted && m) setMember(prev => ({ ...prev, ...m })); } catch {}
      try { const f = await getFundCurrent(); if (mounted && f) setFund(f); } catch {}
      try { const t = await getToday(); if (mounted) setToday(t); } catch {}
      try { const s = await getPIFStats(); if (mounted) setPif(s); } catch {}
      let token = '';
      if (supabase) {
        try { const { data: { session } } = await supabase.auth.getSession(); token = session?.access_token || ''; } catch {}
      }
      try {
        const stats = await getMyStats(token);
        if (mounted) {
          const freebies = stats.freebiesLeft || 0;
          const stamps = stats.loyaltyStamps || 0;
          setFreebiesLeft(freebies);
          setLoyalty({ current: stamps, target: 8 });
          globalThis.freebiesLeft = freebies;
          globalThis.loyaltyStamps = stamps;
        }
      } catch {}
      try { const ig = await getLatestInstagramPost(); if (mounted) setIgPost(ig); } catch {}
      try {
        const cms = await getCMS();
        if (cms) {
          const s1 = cms['special 1'] || null;
          const s2 = cms['special 2'] || null;
          if (s1 || s2) setToday(prev => ({ ...prev, specials: [s1, s2].filter(Boolean) }));
          if (cms['rumi quote']) setRumiQuote(cms['rumi quote']);
        }
      } catch {}
    })();

    return () => { mounted = false; };
  }, [isFocused, member.signedIn]);

  useEffect(() => {
    if (!supabase?.auth) {
      setMember(prev => ({ ...prev, signedIn: false }));
      return;
    }
    let active = true;
    (async () => {
      try { const { data } = await supabase.auth.getSession(); if (active) setMember(prev => ({ ...prev, signedIn: !!data?.session?.user })); } catch {}
    })();
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      setMember(prev => ({ ...prev, signedIn: !!session?.user }));
    });
    return () => {
      try { sub?.data?.subscription?.unsubscribe?.(); } catch {}
      active = false;
    };
  }, []);

  const nextBill = member?.next_billing_at ? new Date(member.next_billing_at).toLocaleDateString() : null;
  const signedIn = !!member?.signedIn;
  const membershipLabel = !signedIn ? 'Not signed in' : (member?.tier === 'paid' ? 'Member' : 'Free');
  const membershipColor = (signedIn && member?.tier === 'paid') ? '#8E4032' : '#3E2723';

  const quoteOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (signedIn) {
      try { quoteOpacity.setValue(0); } catch {}
      Animated.timing(quoteOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
    }
  }, [signedIn]);

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <View style={[styles.header, { paddingTop: insets.top }] }>
        <Image source={logo} style={styles.logo} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.subcopy}>Track perks, collect stamps, and support the community fund.</Text>
          <View style={{ height: 18 }} />
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>Membership</Text>
            <Text style={[styles.sectionValue, { color: membershipColor }]}>
              {membershipLabel}{nextBill ? ` · renews ${nextBill}` : ''}
            </Text>
          </View>

          {signedIn ? (
            <View>
              {rumiQuote ? (
                <Animated.View style={[{ marginTop: 16, alignItems: 'center', paddingHorizontal: 12 }, { opacity: quoteOpacity }]}>
                  <Text style={styles.rumiQuoteStandalone}>“{rumiQuote}”</Text>
                  <Text style={styles.rumiAttributionStandalone}>— Rumi</Text>
                </Animated.View>
              ) : null}

              <View style={{ marginTop: 16 }}>
                <LoyaltyStampTile count={loyalty.current} />
              </View>

              {(member?.tier === 'paid' || freebiesLeft > 0) && (
                <View style={{ marginTop: 16 }}>
                  <FreeDrinksCounter count={freebiesLeft} />
                </View>
              )}
            </View>
          ) : (
            <View>
              <View style={{ height: 18 }} />
              <GlowingGlassButton text="Join today" variant="dark" ring onPress={() => navigation.navigate('MembershipStart')} />
              <View style={{ height: 10 }} />
              <GlowingGlassButton text="Learn about Membership & Profit Sharing" variant="light" onPress={() => navigation.navigate('MembershipInfo')} />
            </View>
          )}
        </View>

        <View style={styles.gridRow}>
          <View style={[styles.card, (hoursExpanded ? styles.gridItemAuto : styles.gridItem)]}>
            <Text style={styles.cardTitle}>Today</Text>
            <Text style={styles.muted}>🕑 {today.openNow ? 'Open now' : 'Closed'} until {today.until}</Text>
            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Specials</Text>
            <View style={styles.chipsRow}>
              {today.specials.map((s) => <Chip key={s}>{s}</Chip>)}
            </View>

            <View style={styles.hoursToggleWrap}>
              <TouchableOpacity onPress={() => setHoursExpanded(!hoursExpanded)}>
                <Text style={styles.hoursToggle}>{hoursExpanded ? 'Hide opening times' : 'Show all opening times'}</Text>
              </TouchableOpacity>
            </View>
            {hoursExpanded ? (
              <View style={styles.hoursTable}>
                {weekHours.map(row => (
                  <View key={row.key} style={styles.hoursRow}>
                    <Text style={styles.hoursDay}>{row.label}</Text>
                    <Text style={styles.hoursTime}>{row.text}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={[styles.card, styles.gridItem, styles.gridItemRight]}>
            <Text style={styles.cardTitle}>Pay-it-Forward</Text>
            <View style={styles.pifTile}>
              <View style={styles.pifNumberWrap}><Text style={styles.pifBig}>{pif.available}</Text></View>
              <View style={styles.pifMeta}>
                <Text style={styles.muted}>drinks available</Text>
                <Text style={styles.muted}>Total contributed: {pif.contributed}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Latest on Instagram</Text>
          {igPost?.image ? (
            <Pressable onPress={() => openInstagramUrl(igPost.url)}>
              <View style={styles.igPolaroid}>
                <Image
                  source={{ uri: igPost.image }}
                  style={styles.igImage}
                  resizeMode="cover"
                  onError={async () => {
                    try {
                      const cached = await AsyncStorage.getItem('latestIgPost');
                      if (cached) {
                        const parsed = JSON.parse(cached);
                        if (parsed?.image && parsed.image !== igPost.image) {
                          setIgPost(parsed);
                          return;
                        }
                      }
                    } catch {}
                    setIgPost({ image: null, caption: '', url: null });
                  }}
                />
                {igPost?.caption ? <Text style={styles.igCaption}>{igPost.caption}</Text> : null}
              </View>
            </Pressable>
          ) : (
            <View style={styles.igPolaroid}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.igImage}
                resizeMode="cover"
              />
              <Text style={styles.muted}>Unable to load latest post.</Text>
            </View>
          )}
          <Pressable onPress={() => openInstagramUrl(igPost?.url)} style={styles.igButton}>
            <Text style={styles.igButtonText}>View on Instagram</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Pressable onPress={() => navigation.navigate('Community')}>
            <Text style={styles.cardTitle}>Community fund (this month)</Text>
            <ProgressBar value={fund?.total_cents || 0} max={(fund?.goal_cents || 0) || 1} />
            <Text style={styles.muted}>
              £{((fund?.total_cents || 0) / 100).toFixed(2)}
              {(fund?.goal_cents || 0) ? ` / £${((fund?.goal_cents || 0) / 100).toFixed(2)}` : ''}
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gridItemAuto: { flex: 1, justifyContent: 'space-between', position: 'relative' },
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, paddingBottom: 100 },
  hero: { marginBottom: 18 },
  subcopy: { marginTop: 10, color: palette.coffee, lineHeight: 22, fontFamily: 'Fraunces_600SemiBold', textAlign: 'center' },
  card: { backgroundColor: palette.paper, borderColor: palette.border, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 14 },
  gridRow: { flexDirection: 'row', marginBottom: 14 },
  gridItem: { position: 'relative', flex: 1, aspectRatio: 1.1, justifyContent: 'space-between' },
  gridItemRight: { marginLeft: 12 },
  sectionLabel: { fontSize: 15, color: palette.coffee, fontFamily: 'Fraunces_600SemiBold' },
  sectionValue: { fontSize: 16, fontFamily: 'Fraunces_700Bold' },
  cardTitle: { fontSize: 18, color: palette.coffee, fontFamily: 'Fraunces_700Bold', marginBottom: 8 },
  muted: { marginTop: 6, color: palette.coffee },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pifTile: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },
  pifNumberWrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  pifMeta: { alignItems: 'center', paddingBottom: 14 },
  barOuter: { height: 10, borderRadius: 10, overflow: 'hidden' },
  barInner: { height: 10, borderRadius: 10 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  chip: { backgroundColor: '#F1E3D3', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginRight: 6, marginBottom: 6 },
  chipText: { color: palette.coffee, fontFamily: 'Fraunces_600SemiBold', fontSize: 12 },
  pifBig: { textAlign: 'center', fontSize: 40, lineHeight: 40, color: palette.clay, fontFamily: 'Fraunces_700Bold' },
  igPolaroid: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderColor: palette.border, borderWidth: 1, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, transform: [{ rotate: '-2deg' }], marginBottom: 12 },
  igImage: { width: '100%', height: 180, borderRadius: 4 },
  igCaption: { marginTop: 8, color: palette.coffee, fontFamily: 'Fraunces_600SemiBold', textAlign: 'center' },
  igButton: { alignSelf: 'center', backgroundColor: palette.coffee, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  igButtonText: { color: palette.cream, fontFamily: 'Fraunces_600SemiBold', fontSize: 14 },
  rumiQuoteStandalone: { fontSize: 22, lineHeight: 30, textAlign: 'center', fontStyle: 'italic', color: '#8E4032', fontFamily: 'Fraunces_600SemiBold' },
  rumiAttributionStandalone: { marginTop: 4, fontSize: 16, textAlign: 'center', color: '#5A3D2E', fontFamily: 'Fraunces_600SemiBold' },
  hoursToggleWrap: { position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center' },
  hoursToggle: { fontFamily: 'Fraunces_700Bold', color: palette.coffee, fontSize: 14 },
  hoursTable: { marginTop: 8, paddingBottom: 28 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  hoursDay: { fontFamily: 'Fraunces_700Bold', color: palette.coffee, fontSize: 14 },
  hoursTime: { fontFamily: 'Fraunces_600SemiBold', color: '#6b5a54', fontSize: 14 },
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
    zIndex: 10,
  },
  logo: { width: 80, height: 80, resizeMode: 'contain' },
});