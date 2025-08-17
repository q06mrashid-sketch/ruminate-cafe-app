
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { palette } from '../../design/theme';

export default function MembershipSignedOutPanel({ navigation }) {
  return (
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
  );
}

const styles = StyleSheet.create({
  card:{ backgroundColor:palette.paper, borderColor:palette.border, borderWidth:1, borderRadius:14, padding:16, marginTop:14 },
  cardTitle:{ fontSize:18, color:palette.coffee, fontFamily:'Fraunces_700Bold', marginBottom:10 },
  perk:{ color:palette.coffee, lineHeight:22, marginTop:6, fontFamily:'Fraunces_600SemiBold' },
  mutedSmall:{ fontSize:13, color:palette.coffee, opacity:0.8 },

  infoCard:{ backgroundColor:palette.paper, borderColor:palette.border, borderWidth:1, borderRadius:14, padding:16, marginTop:14 },

  cta:{ borderRadius:14, paddingVertical:14, alignItems:'center', justifyContent:'center' },
  ctaPrimary:{ backgroundColor: palette.clay, borderColor: palette.border, borderWidth: 1 },
  ctaPrimaryText:{ color:'#fff', fontFamily:'Fraunces_700Bold', fontSize:16 },
  ctaSecondary:{ backgroundColor: palette.paper, borderColor: palette.border, borderWidth: 1 },
  ctaSecondaryText:{ color: palette.coffee, fontFamily:'Fraunces_700Bold', fontSize:16 },
});
