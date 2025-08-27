
import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { palette } from '../design/theme';
import { getMenuData } from '../services/menuData.js';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import MenuItemDetail from '../components/MenuItemDetail';

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { addItem } = useCart();

  const [menu, setMenu] = useState(null);
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshMenu = useCallback(async () => {
    const data = await getMenuData();
    setMenu(data);
  }, []);

  useEffect(() => {
    if (!menu) refreshMenu();
  }, [menu, refreshMenu]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMenu();
    setRefreshing(false);
  }, [refreshMenu]);

  const onAddItem = async (lineItem) => {
    try {
      const { data } = await supabase?.auth?.getSession();
      if (!data?.session) {
        setSelected(null);
        Alert.alert(
          'Sign in required',
          'Please sign in or create an account to add items to your cart.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign in', onPress: () => navigation.navigate('MembershipStart') },
          ],
        );
        return;
      }
    } catch {
      setSelected(null);
      Alert.alert(
        'Sign in required',
        'Please sign in or create an account to add items to your cart.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign in', onPress: () => navigation.navigate('MembershipStart') },
        ],
      );
      return;
    }
    addItem(lineItem);
    setSelected(null);
  };

  const renderItem = ({ item }) => (
    <Pressable style={styles.itemCard} onPress={() => setSelected(item)}>
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemPrice}>£{item.price?.toFixed(2)}</Text>
    </Pressable>
  );

  const coffeeItems = menu?.itemsByCategory.coffee || [];
  const pifItems = menu?.itemsByCategory.pif || [];
  const specialsItems = menu?.itemsByCategory.specials || [];
  const otherItems = menu?.itemsByCategory['not-coffee'] || [];

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
        {pifItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pay It Forward</Text>
            <FlatList
              data={pifItems}
              horizontal
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={styles.carousel}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}
        {specialsItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specials</Text>
            <FlatList
              data={specialsItems}
              horizontal
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={styles.carousel}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}
      </ScrollView>
      <MenuItemDetail
        item={selected}
        options={menu?.options || { altMilks: [], syrups: [], coffeeBlends: [] }}
        visible={!!selected}
        onClose={() => setSelected(null)}
        onAdd={onAddItem}
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
  scroll: { paddingVertical: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { marginLeft: 16, marginBottom: 8, color: palette.coffee, fontFamily: 'Fraunces_700Bold', fontSize: 18 },
  carousel: { paddingHorizontal: 16 },
  itemCard: {
    width: 120,
    height: 120,
    backgroundColor: palette.paper,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 14,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  itemName: {
    color: palette.coffee,
    fontFamily: 'Fraunces_700Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  itemPrice: {
    color: palette.coffee,
    fontFamily: 'Fraunces_600SemiBold',
    textAlign: 'center',
  },
});

