
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { palette } from '../../design/theme';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';

function Stat({ label, value, prefix='', suffix='' }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{prefix}{value}{suffix}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function MembershipSignedInPanel({ summary, stats, user }) {
  const navigation = useNavigation();
  // Stable opaque member identifier for QR payload
  const payload = user ? `ruminate:${user.id}` : 'ruminate:member';
  const isPaid = summary.tier === 'paid';

  return (
    <>
      <View style={styles.rowTop}>
        <Text style={styles.sub}>
          Tier: <Text style={styles.bold}>{isPaid ? 'Paid' : 'Free'}</Text>
          {isPaid && summary.next_billing_at ? <Text style={styles.mutedSmall}> · renews {new Date(summary.next_billing_at).toLocaleDateString()}</Text> : null}
        </Text>
        <Pressable onPress={async()=>{ try{ await supabase?.auth.signOut(); }catch{}; navigation.navigate('Home'); }} hitSlop={10}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your QR</Text>
        <View style={styles.qrWrap}>
          <QRCode value={payload} size={180} />
        </View>
        <Text style={styles.mutedSmall}>Show at the counter to redeem perks and stamps.</Text>
      </View>

      {isPaid && (
        <View style={styles.gridRow}>
          <Stat label="Free drinks left" value={stats.freebiesLeft} />
          <Stat label="Dividends pending" value={Number(stats.dividendsPending).toFixed(2)} prefix="£" />
        </View>
      )}
      <View style={styles.gridRow}>
        <Stat label="Loyalty stamps" value={`${stats.loyaltyStamps}/8`} />
        <Stat label="Pay-it-forward" value={Number(stats.payItForwardContrib || 0).toFixed(2)} prefix="£" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  rowTop:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  sub:{ marginTop:6, color:palette.coffee, fontFamily:'Fraunces_600SemiBold' },
  bold:{ fontFamily:'Fraunces_700Bold', color:palette.coffee },
  mutedSmall:{ fontSize:13, color:palette.coffee, opacity:0.8 },
  signOut:{ color:palette.clay, fontFamily:'Fraunces_700Bold' },

  card:{ backgroundColor:palette.paper, borderColor:palette.border, borderWidth:1, borderRadius:14, padding:16, marginTop:14 },
  cardTitle:{ fontSize:18, color:palette.coffee, fontFamily:'Fraunces_700Bold', marginBottom:10 },
  qrWrap:{ alignItems:'center', justifyContent:'center', paddingVertical:12 },

  gridRow:{ flexDirection:'row', marginTop:14 },
  statBox:{ flex:1, backgroundColor:palette.paper, borderColor:palette.border, borderWidth:1, borderRadius:14, paddingVertical:16, paddingHorizontal:12, marginRight:12 },
  statValue:{ fontSize:28, color:palette.clay, fontFamily:'Fraunces_700Bold' },
  statLabel:{ marginTop:6, color:palette.coffee, fontFamily:'Fraunces_600SemiBold' },
});
