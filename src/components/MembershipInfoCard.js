import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MEMBERSHIP } from '../constants/membership';
import { palette } from '../design/theme';

export default function MembershipInfoCard({ showHeader = true }) {
  return (
    <View style={styles.card}>
      {showHeader ? <Text style={styles.title}>Ruminate Membership</Text> : null}
      <Text style={styles.price}>{MEMBERSHIP.price}</Text>
      <Text style={styles.blurb}>{MEMBERSHIP.summary}</Text>

      <Text style={styles.section}>Perks</Text>
      <View style={{ marginTop: 6 }}>
        {MEMBERSHIP.perks.map((p, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.item}>{p}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.section, { marginTop: 14 }]}>Where your fee goes</Text>
      <View style={{ marginTop: 6 }}>
        {MEMBERSHIP.transparency.map((p, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.item}>{p}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF5EA',
    borderColor: '#E7D6C3',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16
  },
  title: { fontFamily: 'Fraunces_700Bold', fontSize: 20, color: palette.coffee },
  price: { marginTop: 4, fontFamily: 'Fraunces_700Bold', fontSize: 18, color: palette.clay },
  blurb: { marginTop: 8, color: palette.coffee, fontSize: 15, lineHeight: 20 },
  section: { marginTop: 10, fontFamily: 'Fraunces_600SemiBold', fontSize: 16, color: palette.coffee },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  dot: { color: palette.clay, fontSize: 18, marginRight: 6, lineHeight: 18 },
  item: { color: palette.coffee, fontSize: 15, flex: 1 }
});
