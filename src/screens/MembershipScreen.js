import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { palette } from '../design/theme';

export default function MembershipScreen({ navigation }) {
  const [tier, setTier] = useState('paid'); // 'paid' | 'free'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Membership</Text>

        <View style={styles.segWrap}>
          <Pressable style={[styles.segBtn, tier === 'paid' && styles.segBtnActive]} onPress={() => setTier('paid')}>
            <Text style={[styles.segText, tier === 'paid' && styles.segTextActive]}>Paid (£20/mo)</Text>
          </Pressable>
          <Pressable style={[styles.segBtn, tier === 'free' && styles.segBtnActive]} onPress={() => setTier('free')}>
            <Text style={[styles.segText, tier === 'free' && styles.segTextActive]}>Loyalty Card (Free)</Text>
          </Pressable>
        </View>

        {tier === 'paid' ? (
          <View style={styles.infoCard}>
            <Text style={styles.tierTitle}>Paid Membership — £20/month</Text>
            <Text style={styles.copy}>
              Real value, gentle pace, transparent impact. Membership helps us fund community impact whilst giving you monthly freebies, ongoing discounts, a real stake via dividends, and a voice in how we grow.
            </Text>

            <Text style={styles.perkTitle}>Perks you get</Text>
            <Text style={styles.perk}>• 3 free drinks every month</Text>
            <Text style={styles.perk}>• 10% off after that</Text>
            <Text style={styles.perk}>• Share of the Member Pool (5% dividends)</Text>
            <Text style={styles.perk}>• Voting on select collective issues</Text>
            <Text style={styles.perk}>• Loyalty card included (8 stamps → 9th free)</Text>

            <View style={{ height: 16 }} />
            <Pressable style={[styles.cta, styles.ctaPrimary]} onPress={() => navigation.navigate('MembershipStart')}>
              <Text style={styles.ctaPrimaryText}>Join with Apple Pay</Text>
            </Pressable>
            <View style={{ height: 10 }} />
            <Pressable style={[styles.cta, styles.ctaSecondary]} onPress={() => navigation.navigate('MembershipInfo')}>
              <Text style={styles.ctaSecondaryText}>Learn about membership…</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.tierTitle}>Loyalty Card — Free</Text>
            <Text style={styles.copy}>
              Simple and generous: collect 8 stamps, your 9th drink is on us. Everyone can join.
            </Text>

            <Text style={styles.perkTitle}>How it works</Text>
            <Text style={styles.perk}>• Sign up with your name and email</Text>
            <Text style={styles.perk}>• Earn 1 stamp per drink</Text>
            <Text style={styles.perk}>• 9th drink free</Text>
            <Text style={styles.mutedSmall}>Paid members also keep a loyalty card — perks stack.</Text>

            <View style={{ height: 16 }} />
            <Pressable
              style={[styles.cta, styles.ctaSecondary]}
              onPress={() => navigation.navigate('MembershipStart', { mode: 'free' })}
            >
              <Text style={styles.ctaSecondaryText}>Create loyalty card</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How our collective works</Text>
          <Text style={styles.perk}>
            We’re a small Muslim-led collective. Anyone can participate. We don’t pursue profit for the sake of profit- we intend to always strengthen our community and our Ummah. We don’t follow the typical profit-sharing structure, where only the people at the top benefit. Net profits are instead shared fairly amongst staff, contributors, community projects, and even public members.
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
          <Text style={styles.cardTitle}>Profit sharing (high-level)</Text>
          <Text style={styles.perk}>• Founding Member Pool — 42%</Text>
          <Text style={styles.perk}>• Labour Pool — 20%</Text>
          <Text style={styles.perk}>• Capital Pool — 18%</Text>
          <Text style={styles.perk}>• Community Pool — 15%</Text>
          <Text style={styles.perk}>• Member Pool — 5% (shared equally among paid members)</Text>
          <Text style={styles.mutedSmall}>
            We only share from true profit after costs and reinvestment.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.cream },
  content: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 24, color: palette.coffee, fontFamily: 'Fraunces_700Bold', marginBottom: 12 },

  segWrap: { flexDirection: 'row', backgroundColor: '#F4E8DA', borderRadius: 12, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: palette.border },
  segBtn: { flex: 1, borderRadius: 8, alignItems: 'center', paddingVertical: 10 },
  segBtnActive: { backgroundColor: '#FFF5EA' },
  segText: { color: palette.coffee, fontFamily: 'Fraunces_600SemiBold' },
  segTextActive: { color: palette.clay },

  infoCard: { backgroundColor: palette.paper, borderColor: palette.border, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16 },
  card: { backgroundColor: palette.paper, borderColor: palette.border, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 14 },

  tierTitle: { fontSize: 18, color: palette.coffee, fontFamily: 'Fraunces_700Bold' },
  copy: { marginTop: 6, color: palette.coffee, lineHeight: 22, fontFamily: 'Fraunces_600SemiBold' },
  perkTitle: { marginTop: 10, fontFamily: 'Fraunces_700Bold', color: palette.coffee, fontSize: 16 },
  perk: { marginTop: 6, color: palette.coffee, lineHeight: 22 },
  mutedSmall: { marginTop: 8, color: palette.coffee, opacity: 0.8, fontSize: 13, lineHeight: 20 },

  cta: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  ctaPrimary: { backgroundColor: '#000', borderColor: '#000' },
  ctaPrimaryText: { color: '#fff', fontSize: 16, fontFamily: 'Fraunces_700Bold' },
  ctaSecondary: { backgroundColor: '#FFF5EA', borderColor: palette.border },
  ctaSecondaryText: { color: palette.coffee, fontSize: 15, fontFamily: 'Fraunces_700Bold' },

  cardTitle: { fontSize: 18, color: palette.coffee, fontFamily: 'Fraunces_700Bold', marginBottom: 6 },
});
