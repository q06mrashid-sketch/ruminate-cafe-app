import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { palette } from '../design/theme';

export default function OrderDetailScreen({ route }) {
  const { order } = route.params;
  const r = order?.receipt || {};
  return (
    <ScrollView contentContainerStyle={{ padding:16 }}>
      <Text style={{ fontSize:18, fontWeight:'700' }}>{r?.items?.[0]?.name || 'Order'} — £{(order.totals_cents/100).toFixed(2)}</Text>
      <Text style={{ marginTop:4 }}>Code: {order.pickup_code}</Text>
      <Text style={{ marginTop:4 }}>{new Date(order.created_at).toLocaleString()}</Text>
      <View style={{ height:12 }} />
      {r?.items?.map((it, idx) => (
        <View key={idx} style={{ borderWidth:1, borderColor: palette.border, borderRadius:12, padding:12, marginBottom:10 }}>
          <Text style={{ fontWeight:'700' }}>{it.quantity} × {it.name} — £{it.unitFinalPrice.toFixed(2)}</Text>
          {it?.modifiers?.length ? it.modifiers.map((m, i) => (
            <Text key={i} style={{ color: palette.coffee }}>
              • {m.type === 'extraShot' ? `+${m.count} shot${m.count>1?'s':''}` : m.label}
              {m.priceDelta ? ` (+£${m.priceDelta.toFixed(2)})` : ''}
            </Text>
          )) : null}
        </View>
      ))}
      <View style={{ height:8 }} />
      <Text>Subtotal: £{r?.totals?.subtotal?.toFixed(2) ?? (order.totals_cents/100).toFixed(2)}</Text>
      { (order?.free_drinks_redeemed || r?.freeDrinksUsed) ? (
        <Text>Free drinks redeemed: {order?.free_drinks_redeemed || r?.freeDrinksUsed}</Text>
      ) : null }
      <Text>Tax: £{r?.totals?.tax?.toFixed(2) ?? '0.00'}</Text>
      <Text style={{ fontWeight:'700' }}>TOTAL: £{(order.totals_cents/100).toFixed(2)}</Text>
    </ScrollView>
  );
}
