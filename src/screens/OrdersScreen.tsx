import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchUserOrders, subscribeUserOrders } from '../services/orders';
import { palette } from '../design/theme';

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState<any[]>([]);

  const load = useCallback(async () => {
    try { setOrders(await fetchUserOrders()); } catch {}
  }, []);

  useFocusEffect(useCallback(() => {
    const unsubscribe = subscribeUserOrders(load);
    load();
    return () => { unsubscribe?.(); };
  }, [load]));

  const renderItem = ({ item }) => {
    const r = item.receipt || {};
    const total = (item.totals_cents ?? Math.round((r?.totals?.grandTotal || 0) * 100)) / 100;
    const when = new Date(item.created_at || r?.createdAt || Date.now());
    const lineItems = r?.items ?? item.items ?? [];
    const subtitle = (lineItems?.[0]?.name || 'Order') +
      (lineItems?.length > 1 ? ` + ${lineItems.length - 1} more` : '');
    return (
      <Pressable style={styles.card} onPress={() => navigation.navigate('OrderDetail', { order: item })}>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{subtitle}</Text>
          <Text style={styles.total}>{`£${total.toFixed(2)}`}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.muted}>{when.toLocaleString()}</Text>
          <View style={[styles.badge, badgeStyle(item.status)]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.code}>Code: {item.pickup_code}</Text>
      </Pressable>
    );
  };

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={orders}
      keyExtractor={(o) => o.id}
      renderItem={renderItem}
      ListEmptyComponent={<Text style={styles.empty}>No orders yet.</Text>}
    />
  );
}

const badgeStyle = (status: string) => ({
  backgroundColor:
    status === 'ready' ? '#C8E6C9' :
    status === 'in_progress' ? '#FFE0B2' :
    status === 'picked_up' ? '#CFD8DC' : '#F5F5F5'
});

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24 },
  card: { backgroundColor: palette.paper, borderColor: palette.border, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, color: palette.coffee, fontFamily: 'Fraunces_700Bold' },
  total: { fontSize: 16, fontFamily: 'Fraunces_700Bold', color: palette.clay },
  muted: { color: palette.coffee },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontWeight: '600', color: '#333' },
  code: { marginTop: 8, fontWeight: '700', color: palette.coffee },
  empty: { textAlign: 'center', marginTop: 40, color: palette.coffee }
});
