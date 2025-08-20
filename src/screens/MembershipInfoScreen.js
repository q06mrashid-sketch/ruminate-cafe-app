
import React, { useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { palette } from '../design/theme';
import GlowingGlassButton from '../components/GlowingGlassButton';

export default function MembershipInfoScreen({ navigation }) {
  const scrollRef = useRef(null);
  const profitRef = useRef(null);

  const scrollToProfit = () => {
    if (!scrollRef.current || !profitRef.current) return;
    profitRef.current.measureLayout(
      scrollRef.current,
      (_x, y) => {
        scrollRef.current.scrollTo({ y, animated: true });
      },
      () => {}
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.cream }} edges={['top']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Membership & Loyalty</Text>

        <View style={styles.card}>
          <Text style={styles.tierTitle}>Loyalty card — Free</Text>
          <Text style={styles.desc}>• Collect 8 drinks, the 9th is free.</Text>
          <Text style={styles.desc}>• Works for takeaway or in-café.</Text>
          <Text style={styles.desc}>• Paid Members also earn stamps.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.tierTitle}>Member — £20/month</Text>
          <Text style={styles.desc}>• 3 free drinks every month.</Text>
          <Text style={styles.desc}>• 10% discount after free drinks are used.</Text>
          <Text style={styles.desc}>• Share of 5% “Member Pool” (periodic dividends*)</Text>
          <Text style={styles.asterisk} onPress={scrollToProfit}>*See “How profit sharing works” below.</Text>
          <Text style={styles.desc}>• Voting on select community issues.</Text>
          <Text style={styles.desc}>• Includes Loyalty card benefits (8 stamps → 9th free).</Text>
        </View>

        <View ref={profitRef} style={styles.card}>
          <Text style={styles.tierTitle}>*How profit sharing works</Text>
          <Text style={styles.desc}>
            Each month, 5% of qualifying revenue is placed into the Member Pool. At period end,
            the pool is distributed to active paid members as dividends. Payouts are pro-rata by
            active membership (subject to rounding and compliance). You’ll receive a notice
            in-app and by email when a dividend is issued.
          </Text>
        </View>

        <View style={{ height: 12 }} />
        <GlowingGlassButton text="Start paid membership" variant="dark" onPress={() => navigation.navigate('MembershipStart')} />
        <View style={{ height: 10 }} />
        <GlowingGlassButton text="Create loyalty card" variant="light" onPress={() => navigation.navigate('MembershipStart')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 22, color: palette.coffee, fontFamily: 'Fraunces_700Bold', marginBottom: 12 },
  card: {
    backgroundColor: palette.paper,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14
  },
  tierTitle: { fontSize: 18, color: palette.coffee, fontFamily: 'Fraunces_700Bold', marginBottom: 6 },
  desc: { color: palette.coffee, marginTop: 6, lineHeight: 20, fontFamily: 'Fraunces_600SemiBold' },
  asterisk: { color: palette.clay, marginTop: 4, fontFamily: 'Fraunces_600SemiBold' },
});
