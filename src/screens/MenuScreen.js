import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  Image,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { palette } from '../design/theme';
import { getMenuItems } from '../services/menu';
import { useCart } from '../context/CartContext';

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  const [items, setItems] = useState(globalThis.preloaded?.menuItems || []);
  const [selected, setSelected] = useState(null);
  const [shots, setShots] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const refreshMenu = useCallback(async () => {
    const data = await getMenuItems();
    setItems(data);
    globalThis.preloaded = globalThis.preloaded || {};
    globalThis.preloaded.menuItems = data;
  }, []);

  useEffect(() => {
    if (items.length === 0) refreshMenu();
  }, [items.length, refreshMenu]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMenu();
    setRefreshing(false);
  }, [refreshMenu]);

  const priceWithShots = () => {
    if (!selected) return 0;
    const shotPrice = selected?.options?.syrupShotPrice || selected?.options?.syrup_shot_price || 0;
    return selected.base_price + shots * shotPrice;
  };

  const addToCart = () => {
    addItem({ ...selected, shots, price: priceWithShots() });
    setSelected(null);
  };

  const renderItem = ({ item }) => (
    <Pressable style={styles.itemCard} onPress={() => { setSelected(item); setShots(0); }}>
      {item.image && <Image source={{ uri: item.image }} style={styles.itemImage} />}
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemPrice}>£{item.base_price?.toFixed(2)}</Text>
    </Pressable>
  );

  const coffeeItems = items.filter(i => i.category === 'coffee');
  const otherItems = items.filter(i => i.category !== 'coffee');

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <View style={[styles.header, { paddingTop: insets.top }]}><Text style={styles.headerTitle}>Menu</Text></View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.scroll}>
        {coffeeItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coffee</Text>
            <FlatList
              data={coffeeItems}
              horizontal
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={styles.carousel}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}
        {otherItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Not Coffee</Text>
            <FlatList
              data={otherItems}
              horizontal
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={styles.carousel}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}
      </ScrollView>
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selected?.image && <Image source={{ uri: selected.image }} style={styles.modalImage} />}
            <Text style={styles.modalTitle}>{selected?.name}</Text>
            {selected?.description && <Text style={styles.modalDesc}>{selected.description}</Text>}
            {['coffee', 'matcha'].includes(selected?.type) && (
              <View style={styles.shotRow}>
                <Text style={styles.shotLabel}>Syrup shots:</Text>
                <View style={styles.shotCtrls}>
                  <Pressable onPress={() => setShots(Math.max(0, shots - 1))} style={styles.ctrlBtn}><Text style={styles.ctrlTxt}>-</Text></Pressable>
                  <Text style={styles.shotCount}>{shots}</Text>
                  <Pressable onPress={() => setShots(shots + 1)} style={styles.ctrlBtn}><Text style={styles.ctrlTxt}>+</Text></Pressable>
                </View>
              </View>
            )}

            <Text style={styles.modalPrice}>£{priceWithShots().toFixed(2)}</Text>

            <Pressable style={styles.addBtn} onPress={addToCart}><Text style={styles.addTxt}>Add to cart</Text></Pressable>
            <Pressable style={styles.closeBtn} onPress={() => setSelected(null)}><Text style={styles.closeTxt}>Close</Text></Pressable>
          </View>
        </View>
      </Modal>
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
  scroll: { paddingVertical: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { marginLeft: 16, marginBottom: 8, color: palette.coffee, fontFamily: 'Fraunces_700Bold', fontSize: 18 },
  carousel: { paddingHorizontal: 16 },
  itemCard: {
    width: 140,
    backgroundColor: palette.paper,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginRight: 16,
    alignItems: 'center',
  },
  itemName: { color: palette.coffee, fontFamily: 'Fraunces_700Bold', marginBottom: 4 },
  itemPrice: { color: palette.coffee, fontFamily: 'Fraunces_600SemiBold' },
  itemImage: { width: 100, height: 100, marginBottom: 8, borderRadius: 8 },
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  modalContent: { backgroundColor: palette.paper, borderRadius: 14, padding:20, width:'80%' },
  modalImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 12 },
  modalTitle: { fontSize:20, color: palette.coffee, fontFamily:'Fraunces_700Bold', marginBottom:8 },
  modalDesc: { color: palette.coffee, fontFamily:'Fraunces_600SemiBold', marginBottom:12 },
  shotRow: { flexDirection:'row', alignItems:'center', marginBottom:12, justifyContent:'space-between' },
  shotLabel: { color: palette.coffee, fontFamily:'Fraunces_600SemiBold' },
  shotCtrls: { flexDirection:'row', alignItems:'center', gap:12 },
  ctrlBtn: { paddingHorizontal:12, paddingVertical:6, backgroundColor: palette.cream, borderRadius:8 },
  ctrlTxt: { fontSize:18, color: palette.coffee },
  shotCount: { fontSize:16, color: palette.coffee },
  modalPrice: { fontSize:18, color: palette.coffee, fontFamily:'Fraunces_700Bold', marginBottom:12 },
  addBtn: { backgroundColor: palette.coffee, padding:12, borderRadius:8, alignItems:'center', marginBottom:8 },
  addTxt: { color:'#fff', fontFamily:'Fraunces_700Bold' },
  closeBtn: { alignItems:'center', padding:8 },
  closeTxt: { color: palette.coffee, fontFamily:'Fraunces_600SemiBold' },
});

