import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { palette } from '../design/theme';
import { supabase } from '../lib/supabase';
import { getMembershipSummary, signOut as signOutSvc } from '../services/membership';
import { getMyStats } from '../services/stats';
import GlowingGlassButton from '../components/GlowingGlassButton';
import { getPIFByEmail } from '../services/pif';

function Stat({ label, value, prefix = '', suffix = '' }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{prefix}{value}{suffix}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function MembershipScreen({ navigation }) {
  const [summary, setSummary] = useState({ signedIn:false, tier:'free', status:'none', next_billing_at:null });
  const [pifSelfCents,setPifSelfCents]=useState(0);
const [stats, setStats] = useState({ freebiesLeft:3, dividendsPending:0, loyaltyStamps:0, payItForwardContrib:0, communityContrib:0 });
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    try { const m = await getMembershipSummary(); if (m) setSummary(m); } catch {}
    try { const s = await getMyStats(); setStats(s); } catch {}
    if (supabase) {
      try { const u = await supabase.auth.getUser(); setUser(u?.data?.user || null); } catch {}
    } else {
      try { setUser(null); } catch {}
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useFocusEffect(useCallback(() => { let on = true; (async()=>{ if(on) await refresh(); })(); return () => { on = false; }; }, [refresh]));

  const payload = user ? JSON.stringify({ v:1, type:'member', uid:user.id, email:user.email, tier:summary.tier, ts:Date.now() }) : 'ruminate:member';

  useEffect(()=>{ let m=true; const email=(typeof user!=='undefined'&&user&&user.email)?user.email:(summary&&summary.user&&summary.user.email)?summary.user.email:(globalThis&&globalThis.auth&&globalThis.auth.user&&globalThis.auth.user.email)?globalThis.auth.user.email:null; if(!email){ setPifSelfCents(0); return; } getPIFByEmail(email).then(r=>{ if(m) setPifSelfCents(Number(r.total_cents)||0); }).catch(()=>{ if(m) setPifSelfCents(0); }); return ()=>{ m=false }; },[user,summary]);

  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (stats.loyaltyStamps >= 8) {
      setStats(s => ({ ...s, loyaltyStamps: s.loyaltyStamps - 8, freebiesLeft: s.freebiesLeft + 1 }));
      setNotice("You've earned a free drink!");
      const t = setTimeout(() => setNotice(''), 4000);
      return () => clearTimeout(t);
    }
  }, [stats.loyaltyStamps]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Membership</Text>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        {summary.signedIn ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your QR</Text>
              <View style={styles.qrWrap}>
                <QRCode value={payload} size={180} />
              </View>
              <Text style={styles.mutedSmall}>Show at the counter to redeem perks and stamps.</Text>
            </View>

            {summary.tier === 'paid' && (
              <View style={styles.gridRow}>
                <Stat label="Free drinks left" value={stats.freebiesLeft} />
                <Stat label="Dividends pending" value={Number(stats.dividendsPending).toFixed(2)} prefix="£" />
              </View>
            )}
            <View style={styles.gridRow}>
              <Stat label="Loyalty stamps" value={`${stats.loyaltyStamps}/8`} />
              <Stat label="Pay-it-forward" value={(pifSelfCents/100).toFixed(2)} prefix="£" />
            </View>

            <View style={{ marginTop: 16 }}>
              <GlowingGlassButton
                text="Sign out"
                variant="light"
                onPress={async () => {
                  try { await signOutSvc(); } catch {}
                  try { setSummary({ signedIn:false, tier:'free', status:'none', next_billing_at:null }); } catch {}
                  try { navigation.reset({ index: 0, routes: [{ name: 'Home' }] }); } catch {}
                }}
              />
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
  container:{ flex:1, backgroundColor:palette.cream },
  content:{ padding:16, paddingBottom:28 },
  title:{ fontSize:24, color:palette.coffee, fontFamily:'Fraunces_700Bold' },
  mutedSmall:{ fontSize:13, color:palette.coffee, opacity:0.8 },

  card:{ backgroundColor:palette.paper, borderColor:palette.border, borderWidth:1, borderRadius:14, padding:16, marginTop:14 },
  cardTitle:{ fontSize:18, color:palette.coffee, fontFamily:'Fraunces_700Bold', marginBottom:10 },
  perk:{ color:palette.coffee, lineHeight:22, marginTop:6, fontFamily:'Fraunces_600SemiBold' },

  infoCard:{ backgroundColor:palette.paper, borderColor:palette.border, borderWidth:1, borderRadius:14, padding:16, marginTop:14 },

  gridRow:{ flexDirection:'row', marginTop:14 },
  statBox:{ flex:1, backgroundColor:palette.paper, borderColor:palette.border, borderWidth:1, borderRadius:14, paddingVertical:16, paddingHorizontal:12, marginRight:12 },
  statValue:{ fontSize:28, color:palette.clay, fontFamily:'Fraunces_700Bold' },
  statLabel:{ marginTop:6, color:palette.coffee, fontFamily:'Fraunces_600SemiBold' },

  notice:{ backgroundColor:palette.paper, borderColor:palette.border, borderWidth:1, borderRadius:10, padding:10, marginTop:12, textAlign:'center', color:palette.clay, fontFamily:'Fraunces_700Bold' },

  qrWrap:{ alignItems:'center', justifyContent:'center', paddingVertical:12 },

  cta:{ borderRadius:14, paddingVertical:14, alignItems:'center', justifyContent:'center' },
  ctaPrimary:{ backgroundColor: palette.clay, borderColor: palette.border, borderWidth: 1 },
  ctaPrimaryText:{ color:'#fff', fontFamily:'Fraunces_700Bold', fontSize:16 },
  ctaSecondary:{ backgroundColor: palette.paper, borderColor: palette.border, borderWidth: 1 },
  ctaSecondaryText:{ color: palette.coffee, fontFamily:'Fraunces_700Bold', fontSize:16 },
});