import React, { useEffect, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
} from 'react-native';
import { palette } from '../design/theme';
import { getMenuItems } from '../services/menu';
import { useCart } from '../contexts/CartContext';

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [shots, setShots] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await getMenuItems();
      if (active) setItems(data);
    })();
    return () => { active = false; };
  }, []);

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
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemPrice}>${item.base_price?.toFixed(2)}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <View style={[styles.header, { paddingTop: insets.top }]}><Text style={styles.headerTitle}>Menu</Text></View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={styles.list}
      />
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selected?.name}</Text>
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
            <Text style={styles.modalPrice}>${priceWithShots().toFixed(2)}</Text>
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
  list: { padding: 16, paddingBottom: 120 },
  itemCard: {
    flex: 1,
    backgroundColor: palette.paper,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    margin: 8,
  },
  itemName: { color: palette.coffee, fontFamily: 'Fraunces_700Bold', marginBottom: 4 },
  itemPrice: { color: palette.coffee, fontFamily: 'Fraunces_600SemiBold' },
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  modalContent: { backgroundColor: palette.paper, borderRadius: 14, padding:20, width:'80%' },
  modalTitle: { fontSize:20, color: palette.coffee, fontFamily:'Fraunces_700Bold', marginBottom:12 },
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

