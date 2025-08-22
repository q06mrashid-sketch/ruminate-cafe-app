import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, View, Text, StyleSheet, Share, Pressable, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import membershipPassBase64 from '../../assets/membershipPassBase64';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { palette } from '../design/theme';
import { supabase } from '../lib/supabase';
import { getMembershipSummary } from '../services/membership';
import { getMyStats } from '../services/stats';
import GlowingGlassButton from '../components/GlowingGlassButton';
import { getPIFByEmail } from '../services/pif';
import { createReferral } from '../services/referral';
import { syncVouchers } from '../services/vouchers';
import 'react-native-get-random-values';
import FreeDrinksCounter from '../components/FreeDrinksCounter';
import LoyaltyStampTile from '../components/LoyaltyStampTile';
import { getMemberQRCodes } from '../services/qr';
import { redeemLoyaltyReward } from '../services/loyalty';

function Stat({ label, value, prefix = '', suffix = '', style }) {
  return (
    <View style={[styles.statBox, style]}>
      <Text style={styles.statValue}>{prefix}{value}{suffix}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function MembershipScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState({ signedIn: false, tier: 'free', status: 'none', next_billing_at: null });
  const [pifSelfCents, setPifSelfCents] = useState(0);
  const [stats, setStats] = useState({ freebiesLeft: 0, dividendsPending: 0, loyaltyStamps: 0, payItForwardContrib: 0, communityContrib: 0 });
  const [vouchers, setVouchers] = useState([]);
  const [page, setPage] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0); // track width of carousel for QR/voucher cards
  const [user, setUser] = useState(null);
  const [payload, setPayload] = useState('ruminate:member');

  const refresh = useCallback(async () => {
    try { const m = await getMembershipSummary(); if (m) setSummary(m); } catch {}
    try {
      const s = await getMyStats();
      setStats(s);
      globalThis.freebiesLeft = s.freebiesLeft;
      globalThis.loyaltyStamps = s.loyaltyStamps;
      await syncVouchers(s.freebiesLeft);
    } catch {}
    if (supabase) {
      try {
        const u = await supabase.auth.getUser();
        const usr = u?.data?.user || null;
        setUser(usr);
        if (usr) {
          try {
            const qrs = await getMemberQRCodes(usr.id);
            setPayload(qrs.payload);
            setVouchers(qrs.vouchers || []);
            setStats((st) => {
              const voucherCount = qrs.vouchers ? qrs.vouchers.length : 0;
              const updated = { ...st, freebiesLeft: Math.max(st.freebiesLeft, voucherCount) };
              globalThis.freebiesLeft = updated.freebiesLeft;
              return updated;
            });
          } catch {}
        } else {
          setPayload('ruminate:member');
          setVouchers([]);
        }
      } catch {}
    } else {
      try { setUser(null); setPayload('ruminate:member'); setVouchers([]); } catch {}
    }
  }, []);


  useEffect(() => {
    setStats(prev => ({
      ...prev,
      freebiesLeft: globalThis.freebiesLeft ?? prev.freebiesLeft,
      loyaltyStamps: globalThis.loyaltyStamps ?? prev.loyaltyStamps,
    }));
    refresh();
  }, [refresh]);
  useFocusEffect(useCallback(() => { let on = true; (async()=>{ if(on) await refresh(); })(); return () => { on = false; }; }, [refresh]));


  useEffect(() => {
    setVouchers(v => {
      if (v.length < stats.freebiesLeft) {
        const needed = stats.freebiesLeft - v.length;
        return [
          ...v,
          ...Array.from({ length: needed }, () =>
            crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10)
          ),
        ];
      }
      if (v.length > stats.freebiesLeft) {
        return v.slice(0, stats.freebiesLeft);
      }
      return v;
    });
  }, [stats.freebiesLeft]);


  useEffect(()=>{ 
    let m=true; 
    const email=(typeof user!=='undefined'&&user&&user.email)
      ? user.email
      : (summary && summary.user && summary.user.email)
      ? summary.user.email
      : (globalThis && globalThis.auth && globalThis.auth.user && globalThis.auth.user.email)
      ? globalThis.auth.user.email
      : null; 
    if (!email) { setPifSelfCents(0); return; } 
    getPIFByEmail(email).then(r => { if (m) setPifSelfCents(Number(r.total_cents) || 0); }).catch(() => { if (m) setPifSelfCents(0); }); 
    return () => { m = false }; 
  }, [user, summary]);

  const [notice, setNotice] = useState('');
  const [redeemedAlertShown, setRedeemedAlertShown] = useState(false);
  useEffect(() => {
    if (stats.loyaltyStamps >= 8 && !redeemedAlertShown) {
      setRedeemedAlertShown(true);
      Alert.alert('Free drink earned', 'A free drink voucher has been added to your account.');
      setStats(st => {
        const updated = { ...st, freebiesLeft: st.freebiesLeft + 1 };
        globalThis.freebiesLeft = updated.freebiesLeft;
        return updated;
      });
      setNotice("You've earned a free drink!");
      const t = setTimeout(() => setNotice(''), 4000);
      (async () => {
        try { await redeemLoyaltyReward(); } catch {}
        try { await refresh(); } catch {}
      })();
      return () => clearTimeout(t);
    } else if (stats.loyaltyStamps < 8 && redeemedAlertShown) {
      setRedeemedAlertShown(false);
    }
  }, [stats.loyaltyStamps, redeemedAlertShown, refresh]);

  const handleAddToWallet = useCallback(async () => {
    try {
      const fileUri = FileSystem.cacheDirectory + 'membership.pkpass';
      await FileSystem.writeAsStringAsync(fileUri, membershipPassBase64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(fileUri, { mimeType: 'application/vnd.apple.pkpass' });
    } catch (e) {
      console.error('Failed to add to wallet', e);
    }
  }, []);

  const totalPages = 1 + vouchers.length;

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <View style={[styles.header, { paddingTop: insets.top }]}><Text style={styles.headerTitle}>Membership</Text></View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Membership</Text>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        {summary.signedIn ? (
          <>

            <View style={{ marginTop: 14 }} onLayout={(e) => setCarouselWidth(e.nativeEvent.layout.width)}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.carousel}
                onMomentumScrollEnd={(e) => {
                  const { contentOffset, layoutMeasurement } = e.nativeEvent;
                  const index = Math.round(contentOffset.x / layoutMeasurement.width);
                  setPage(index);
                }}
              >
                <View style={[styles.card, styles.qrCard, { width: carouselWidth }]}> 
                  <Text style={styles.cardTitle}>Your QR</Text>
                  <View style={styles.qrWrap}>
                    <QRCode value={payload} size={180} />
                  </View>
                  <Text style={styles.mutedSmall}>Show at the counter to redeem perks and stamps.</Text>
                  <View style={{ marginTop: 12 }}>
                    <GlowingGlassButton text="Add to Wallet" variant="dark" onPress={handleAddToWallet} />
                  </View>
                </View>

                {vouchers.map((code) => (
                  <View key={code} style={[styles.card, styles.qrCard, styles.voucherCard, { width: carouselWidth }]}> 
                    <Text style={[styles.cardTitle, styles.voucherTitle]}>Drink voucher</Text>
                    <View style={styles.qrWrap}>
                      <QRCode value={code} size={180} />
                    </View>
                    <Text style={[styles.mutedSmall, styles.voucherText]}>Show at the counter to redeem.</Text>
                  </View>
                ))}
              </ScrollView>
              {totalPages > 1 && (
                <>
                  <Text style={styles.swipePrompt}>Swipe to see your drink vouchers</Text>
                  <View style={styles.dots}>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <View
                        key={i}
                        style={[styles.dot, i === page && styles.dotActive]}
                      />
                    ))}
                  </View>
                </>
              )}
            </View>

            {(summary.tier === 'paid' || stats.freebiesLeft > 0) && (
              <View style={{ marginTop: 14 }}>
                <FreeDrinksCounter count={stats.freebiesLeft} />
              </View>
            )}

            <View style={{ marginTop: 14 }}>
              <LoyaltyStampTile count={stats.loyaltyStamps} />
            </View>

            {summary.tier === 'paid' ? (
              <View style={styles.gridRow}>
                <Stat label="Dividends pending" value={Number(stats.dividendsPending).toFixed(2)} prefix="£" />
                <Stat label="Pay-it-forward" value={(pifSelfCents / 100).toFixed(2)} prefix="£" />
              </View>
            ) : (
              <View style={{ marginTop: 14 }}>
                <Stat label="Pay-it-forward" value={(pifSelfCents / 100).toFixed(2)} prefix="£" style={{ marginRight: 0 }} />
              </View>
            )}

            <View style={{ marginTop: 16 }}>
              <Text style={styles.referralText}>
                Refer a friend: they get 10% off their first drink and you get a free drink.
              </Text>
              <View style={{ marginTop: 8 }}>
                <GlowingGlassButton
                  text="Refer a friend"
                  variant="light"
                  onPress={async () => {
                    try {
                      const code = crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10);
                      if (user) await createReferral(user.id, code);
                      const link = `https://ruminate.cafe/signup?ref=${code}`;
                      await Share.share({ message: link });
                    } catch {}
                  }}
                />
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Paid Membership — £20/month</Text>
              <Text style={styles.perk}>• Monthly free drinks allowance for members</Text>
              <Text style={styles.perk}>• Member dividends shared periodically</Text>
              <Text style={styles.perk}>• Continued loyalty stamps (9th drink free)</Text>
              <Text style={styles.perk}>• Community fund participation & perks</Text>
            </View>

            <View style={{ height: 12 }} />
            <Pressable style={[styles.cta, styles.ctaPrimary]} onPress={() => navigation.navigate('MembershipStart', { mode: 'paid' })}>
              <Text style={styles.ctaPrimaryText}>Join with Apple Pay</Text>
            </Pressable>

            <View style={{ height: 12 }} />
            <Pressable style={[styles.cta, styles.ctaSecondary]} onPress={() => navigation.navigate('MembershipStart', { mode: 'free' })}>
              <Text style={styles.ctaSecondaryText}>Create loyalty card</Text>
            </Pressable>

            <View style={{ height: 18 }} />
            <View style={styles.card}>
              <Text style={styles.cardTitle}>How our collective works</Text>
              <Text style={styles.perk}>
                We’re a small Muslim-led collective. Anyone can participate. We don’t pursue profit for the sake of profit—we intend to always strengthen our community and our Ummah. We don’t follow the typical profit-sharing structure, where only the people at the top benefit. Net profits are instead shared fairly amongst staff, contributors, community projects, and even public members.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Values that guide us</Text>
              <Text style={styles.perk}>• Reflection & Stillness — a gentle space in a rushed world.</Text>
              <Text style={styles.perk}>• Shared Contribution — everyone can bring something that counts.</Text>
              <Text style={styles.perk}>• Community & Ethics — fair, transparent, and oriented to benefit.</Text>
              <Text style={styles.perk}>• Openness — honest communication and clear processes.</Text>
              <Text style={styles.perk}>• Change-Driven — belief that giving back makes us stronger.</Text>
              <Text style={styles.mutedSmall}>
                We try to keep our suppliers and products ethical and non-exploitative and review choices for Islamic alignment and community good.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Profit sharing & dividends</Text>
              <Text style={styles.perk}>
                Members share in net profits through periodic dividends. This aligns our incentives with community benefit and long-term stewardship.
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
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
  headerTitle: { fontSize: 20, color: '#3E2723', fontFamily: 'Fraunces_700Bold' },
  content: { padding: 16, paddingBottom: 120 },
  title: { fontSize: 24, color: palette.coffee, fontFamily: 'Fraunces_700Bold' },
  mutedSmall: { fontSize: 13, color: palette.coffee, opacity: 0.8 },
  referralText: { fontSize: 20, color: palette.clay, fontFamily: 'Fraunces_700Bold', textAlign: 'center', marginVertical: 4 },
  card: { backgroundColor: palette.paper, borderColor: palette.border, borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 14 },
  cardTitle: { fontSize: 18, color: palette.coffee, fontFamily: 'Fraunces_700Bold', marginBottom: 10 },
  perk: { color: palette.coffee, lineHeight: 22, marginTop: 6, fontFamily: 'Fraunces_600SemiBold' },
  infoCard: { backgroundColor: palette.paper, borderColor: palette.border, borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 14 },
  gridRow: { flexDirection: 'row', marginTop: 14 },
  statBox: { flex: 1, backgroundColor: palette.paper, borderColor: palette.border, borderWidth: 1, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 12, marginRight: 12 },
  statValue: { fontSize: 28, color: palette.clay, fontFamily: 'Fraunces_700Bold' },
  statLabel: { marginTop: 6, color: palette.coffee, fontFamily: 'Fraunces_600SemiBold' },
  notice: { backgroundColor: palette.paper, borderColor: palette.border, borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 12, textAlign: 'center', color: palette.clay, fontFamily: 'Fraunces_700Bold' },

  qrWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, height: 260 },
  carousel: { height: 420, width: '100%' },
  qrCard: { marginTop: 0, flex: 1 },
  voucherCard: { backgroundColor: palette.coffee, borderColor: palette.coffee },
  voucherTitle: { color: palette.cream },
  voucherText: { color: palette.cream, textAlign: 'center' },
  swipePrompt: { textAlign: 'center', color: palette.coffee, marginTop: 8, fontFamily: 'Fraunces_600SemiBold' },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.border, marginHorizontal: 3 },
  dotActive: { backgroundColor: palette.coffee },

  cta: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  ctaPrimary: { backgroundColor: palette.clay, borderColor: palette.border, borderWidth: 1 },
  ctaPrimaryText: { color: '#fff', fontFamily: 'Fraunces_700Bold', fontSize: 16 },
  ctaSecondary: { backgroundColor: palette.paper, borderColor: palette.border, borderWidth: 1 },
  ctaSecondaryText: { color: palette.coffee, fontFamily: 'Fraunces_700Bold', fontSize: 16 },
});
