import React, { useContext, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { CartContext } from '../context/CartContext';
import { palette } from '../design/theme';

export default function CartScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // Be defensive about what's available in CartContext
  const cart = useContext(CartContext) || {};
  const {
    items = [],
    subtotal = 0,
    // optional methods (use whichever exist)
    incrementItem,
    decrementItem,
    removeItem,
    updateQuantity,
    clearItem, // some apps name it like this
  } = cart;

  const [timeSlot, setTimeSlot] = useState(null);

  const contentBottomPad = useMemo(
    () => insets.bottom + tabBarHeight + 140,
    [insets.bottom, tabBarHeight]
  );

  const onInc = (id) => {
    if (incrementItem) return incrementItem(id);
    if (updateQuantity) return updateQuantity(id, +1);
  };
  const onDec = (id) => {
    if (decrementItem) return decrementItem(id);
    if (updateQuantity) return updateQuantity(id, -1);
  };
  const onRemove = (id) => {
    if (removeItem) return removeItem(id);
    if (clearItem) return clearItem(id);
    if (updateQuantity) return updateQuantity(id, 'remove'); // if your impl supports a special op
  };

  const onPickTimeSlot = () => {
    // If you already have a screen/modal, navigate there:
    // navigation?.navigate?.('PickTimeSlot', { onSelect: (slot) => setTimeSlot(slot) });
    // Minimal inline fallback for now:
    const now = new Date();
    const mm = String(now.getMinutes()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    setTimeSlot(`Today ${hh}:${mm}`);
  };

  const renderItem = ({ item }) => (
    <Swipeable
      renderRightActions={() => (
        <View style={styles.swipeRemove}>
          <Text style={styles.swipeRemoveText}>Remove</Text>
        </View>
      )}
      onSwipeableRightOpen={() => onRemove?.(item.id)}
    >
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>£{(item.price * item.quantity).toFixed(2)}</Text>
        </View>

        <View style={[styles.rowBetween, { marginTop: 10 }]}>
          <View style={styles.qtyControls}>
            <TouchableOpacity
              style={[styles.qtyBtn, styles.qtyBtnLeft]}
              onPress={() => onDec?.(item.id)}
              disabled={item.quantity <= 1}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.qtyBadge}>
              <Text style={styles.qtyBadgeText}>{item.quantity}</Text>
            </View>
            <TouchableOpacity
              style={[styles.qtyBtn, styles.qtyBtnRight]}
              onPress={() => onInc?.(item.id)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => onRemove?.(item.id)} style={styles.removeBtn}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Swipeable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top','left','right']}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: contentBottomPad }]}
        renderItem={renderItem}
        ListHeaderComponent={
          <Text style={styles.screenTitle}>Your order</Text>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Your cart is empty.</Text>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Sticky footer */}
      <View
        style={[
          styles.footerWrap,
          { bottom: tabBarHeight, paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <View style={styles.footerTopRow}>
          <Text style={styles.subtotalLabel}>Subtotal</Text>
          <Text style={styles.subtotalValue}>£{subtotal.toFixed(2)}</Text>
        </View>

        <View style={styles.footerButtonsRow}>
          <TouchableOpacity style={styles.slotBtn} onPress={onPickTimeSlot}>
            <Text style={styles.slotBtnText}>{timeSlot ? timeSlot : 'Pick time slot'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.applePayBtn, !timeSlot && styles.applePayBtnDisabled]}
            disabled={!timeSlot}
            onPress={() => {
              if (!timeSlot) return;
              // hook up your Apple Pay flow here
            }}
          >
            <Text style={styles.applePayText}> Pay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  screenTitle: {
    fontSize: 18,
    color: palette.coffee,
    fontFamily: 'Fraunces_700Bold',
    marginBottom: 12,
    textAlign: 'center',
  },

  card: {
    backgroundColor: palette.paper,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    // light shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  itemName: {
    fontSize: 16,
    color: palette.coffee,
    fontFamily: 'Fraunces_700Bold',
    flexShrink: 1,
    paddingRight: 10,
  },

  itemPrice: {
    fontSize: 16,
    color: palette.clay,
    fontFamily: 'Fraunces_700Bold',
  },

  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  qtyBtn: {
    backgroundColor: palette.paper,
    borderColor: palette.border,
    borderWidth: 1,
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnLeft: { borderTopRightRadius: 8, borderBottomRightRadius: 8, marginRight: 8 },
  qtyBtnRight: { borderTopLeftRadius: 8, borderBottomLeftRadius: 8, marginLeft: 8 },

  qtyBtnText: {
    fontSize: 18,
    color: palette.coffee,
    fontFamily: 'Fraunces_700Bold',
  },

  qtyBadge: {
    minWidth: 44,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F1E3D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadgeText: {
    fontSize: 16,
    color: palette.coffee,
    fontFamily: 'Fraunces_700Bold',
  },

  swipeRemove: {
    backgroundColor: '#8E4032',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 14,
    marginBottom: 14,
  },
  swipeRemoveText: {
    color: '#fff',
    fontFamily: 'Fraunces_600SemiBold',
  },

  removeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  removeText: {
    color: '#8E4032',
    fontFamily: 'Fraunces_600SemiBold',
  },

  empty: {
    textAlign: 'center',
    marginTop: 24,
    color: palette.coffee,
    fontFamily: 'Fraunces_600SemiBold',
  },

  footerWrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: palette.paper,
    borderTopWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    // shadow like header
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },

  footerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  subtotalLabel: {
    fontWeight: '600',
    color: palette.coffee,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 16,
  },
  subtotalValue: {
    fontWeight: '700',
    color: palette.coffee,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 18,
  },

  footerButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  slotBtn: {
    flex: 1,
    backgroundColor: palette.cream,
    borderColor: palette.border,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBtnText: {
    color: palette.coffee,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 14,
  },

  applePayBtn: {
    flex: 1,
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applePayBtnDisabled: {
    opacity: 0.45,
  },
  applePayText: {
    color: '#fff',
    fontFamily: 'Fraunces_700Bold',
    fontSize: 16,
  },
});
