import React, { useContext } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartContext } from '../context/CartContext';

export default function CartScreen() {
  const { items, subtotal } = useContext(CartContext);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.qty}>x{item.quantity}</Text>
            <Text style={styles.price}>${(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Your cart is empty.</Text>}
      />
      <View style={styles.footer}>
        <Text style={styles.subtotalLabel}>Subtotal</Text>
        <Text style={styles.subtotalValue}>${subtotal.toFixed(2)}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: { fontSize: 16 },
  qty: { fontSize: 16 },
  price: { fontSize: 16 },
  empty: { textAlign: 'center', marginTop: 20 },
  footer: {
    borderTopWidth: 1,
    borderColor: '#ccc',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subtotalLabel: { fontWeight: 'bold' },
  subtotalValue: { fontWeight: 'bold' },
});
