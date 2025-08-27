import React, { useContext } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { palette } from '../design/theme';
import { CartContext } from '../context/CartContext';

const MENU_ITEMS = [
  { id: 'latte', name: 'Latte', price: 4.5 },
  { id: 'espresso', name: 'Espresso', price: 3 },
  { id: 'tea', name: 'Tea', price: 3.25 },
];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { addItem } = useContext(CartContext);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
      </View>
      <Pressable style={styles.addBtn} onPress={() => addItem(item)}>
        <Text style={styles.addBtnText}>Add to cart</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <View style={[styles.header, { paddingTop: insets.top }] }><Text style={styles.headerTitle}>Menu</Text></View>
      <FlatList
        contentContainerStyle={styles.content}
        data={MENU_ITEMS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    backgroundColor: palette.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  headerTitle: { fontSize: 20, color: '#3E2723', fontFamily: 'Fraunces_700Bold' },
  content: { padding: 16, paddingBottom: 120, gap: 16 },
  title: { fontSize: 24, color: palette.coffee, fontFamily: 'Fraunces_700Bold' },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.paper,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  itemName: { fontSize: 18, color: palette.coffee, fontFamily: 'Fraunces_700Bold' },
  itemPrice: { color: palette.coffee, fontFamily: 'Fraunces_600SemiBold' },
  addBtn: {
    backgroundColor: palette.clay,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addBtnText: { color: '#fff', fontFamily: 'Fraunces_700Bold', fontSize: 14 },
});
