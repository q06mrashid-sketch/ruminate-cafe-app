import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../design/theme';

export default function OrderDetailScreen({ route }) {
  const { order } = route.params;
  const r = order?.receipt || {};
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{r?.items?.[0]?.name || 'Order'} — £{(order.totals_cents/100).toFixed(2)}</Text>
        <Text style={styles.meta}>Code: {order.pickup_code}</Text>
        <Text style={styles.meta}>{new Date(order.created_at).toLocaleString()}</Text>
        <View style={{ height:12 }} />
        {r?.items?.map((it, idx) => (
          <View key={idx} style={styles.itemCard}>
            <Text style={styles.itemTitle}>{it.quantity} × {it.name} — £{it.unitFinalPrice.toFixed(2)}</Text>
            {it?.modifiers?.length ? it.modifiers.map((m, i) => (
              <Text key={i} style={styles.modifier}>
                • {m.type === 'extraShot' ? `+${m.count} shot${m.count>1?'s':''}` : m.label}
                {m.priceDelta ? ` (+£${m.priceDelta.toFixed(2)})` : ''}
              </Text>
            )) : null}
          </View>
        ))}
        <View style={{ height:8 }} />
        <Text style={styles.meta}>Subtotal: £{r?.totals?.subtotal?.toFixed(2) ?? (order.totals_cents/100).toFixed(2)}</Text>
        {(order?.free_drinks_redeemed || r?.freeDrinksUsed) ? (
          <Text style={styles.meta}>Free drinks redeemed: {order?.free_drinks_redeemed || r?.freeDrinksUsed}</Text>
        ) : null}
        <Text style={styles.meta}>Tax: £{r?.totals?.tax?.toFixed(2) ?? '0.00'}</Text>
        <Text style={styles.total}>TOTAL: £{(order.totals_cents/100).toFixed(2)}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 18, fontFamily: 'Fraunces_700Bold', color: palette.coffee },
  meta: { marginTop: 4, color: palette.coffee, fontFamily: 'Fraunces_600SemiBold' },
  itemCard: { borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: palette.paper },
  itemTitle: { fontFamily: 'Fraunces_600SemiBold', color: palette.coffee },
  modifier: { color: palette.coffee, fontFamily: 'Fraunces_600SemiBold' },
  total: { fontFamily: 'Fraunces_700Bold', color: palette.clay, marginTop: 8 },
});
