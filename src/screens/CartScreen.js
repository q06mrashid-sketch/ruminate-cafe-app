import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, Pressable, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useTabBarHeight } from '../navigation/TabBarHeightContext';
import { CartContext } from '../context/CartContext';
import { palette } from '../design/theme';
import { buildReceipt, sendReceiptToPOS, printReceiptToConsole } from '../utils/receipt';
import { saveReceiptForUser } from '../services/orders';
import { useOrdersPresence } from '../context/OrdersContext';
import { supabase } from '../lib/supabase';
import { countStampsFromReceipt } from '../utils/loyalty';
import { useStats } from '../hooks/useStats';
import { getMembershipSummary } from '../services/membership';
import { getToday } from '../services/homeData';

export default function CartScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { refreshStats } = useStats?.() || { refreshStats: async () => {} };
  const { setHasOrders, refreshOrdersPresence } = useOrdersPresence();

  const tabBarHeight = useTabBarHeight();
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
    clear,
  } = cart;

  const [timeSlot, setTimeSlot] = useState(null);
  const [slotPickerVisible, setSlotPickerVisible] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [todayHours, setTodayHours] = useState(null);

  useEffect(() => {
    (async () => {
      try { const t = await getToday(); setTodayHours(t); } catch {}
    })();
  }, []);

  const contentBottomPad = useMemo(

    () => tabBarHeight + 140,
    [tabBarHeight]

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

  const buildSlots = () => {
    const intervals = todayHours?.intervals?.length
      ? todayHours.intervals
      : (todayHours?.open && todayHours?.close
        ? [{ open: todayHours.open, close: todayHours.close }]
        : []);
    if (!intervals.length) return [];
    const toMins = (s) => {
      const [h, m] = s.split(':').map(Number);
      return h * 60 + m;
    };
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const maxFuture = current + 30;
    const nextQuarter = Math.ceil(current / 15) * 15;
    const out = [];
    for (const iv of intervals) {
      const open = toMins(iv.open);
      const close = toMins(iv.close);
      const startMins = Math.max(open, nextQuarter);
      const lastStart = Math.min(close - 30, maxFuture);
      for (let m = startMins; m <= lastStart; m += 15) {
        const start = new Date();
        start.setHours(Math.floor(m / 60), m % 60, 0, 0);
        const end = new Date(start.getTime() + 15 * 60 * 1000);
        out.push({ start, end });
      }
    }
    return out;
  };

  const onPickTimeSlot = () => {
    const slots = buildSlots();
    setAvailableSlots(slots);
    setSlotPickerVisible(true);
  };

  const formatSlotLabel = (slot) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `Today ${pad(slot.start.getHours())}:${pad(slot.start.getMinutes())}`;
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
        {(() => {
          const parts = [];
          const mods = item.modifiers || {};
          if (mods.altMilk) parts.push(mods.altMilk);
          if (mods.syrups && mods.syrups.length) {
            const counts = {};
            mods.syrups.forEach((s) => { counts[s] = (counts[s] || 0) + 1; });
            for (const [label, count] of Object.entries(counts)) {
              parts.push(count > 1 ? `${count}× ${label}` : label);
            }
          }
          if (mods.coffeeBlend) parts.push(mods.coffeeBlend);
          if (typeof mods.extraShots === 'number' && mods.extraShots > 0) {
            parts.push(`+${mods.extraShots} shot${mods.extraShots > 1 ? 's' : ''}`);
          }
          return parts.length ? (
            <Text style={styles.itemSubtitle}>{parts.join(' · ')}</Text>
          ) : null;
        })()}

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
    <>
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
            <Text style={styles.slotBtnText}>{timeSlot ? formatSlotLabel(timeSlot) : 'ASAP'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.applePayBtn}
            onPress={async () => {
              const slot =
                timeSlot || {
                  start: new Date(),
                  end: new Date(Date.now() + 15 * 60 * 1000),
                };
              const receipt = buildReceipt({
                cartItems: items,
                selectedTimeSlot: slot,
                customer: null,
                pifContribution: 0,
                vouchersApplied: 0,
                paymentMethod: 'test',
              });

              const canonical = JSON.parse(JSON.stringify(receipt));
              printReceiptToConsole(canonical);
              await sendReceiptToPOS(canonical);
              let inserted;
              const { data: session } = await supabase.auth.getSession();
              const userId = session?.session?.user?.id;
              if (userId) {
                try {
                  inserted = await saveReceiptForUser(userId, canonical);
                  console.log('[ORDERS] saved →', inserted?.id, inserted?.order_id);
                  setHasOrders(true);
                  try { await refreshOrdersPresence(); } catch {}
                  navigation.navigate('OrderDetail', { order: inserted });
                } catch (e) {
                  console.warn('[ORDERS] save failed', e);
                }
              }

              const add = countStampsFromReceipt(canonical);
              if (userId && add > 0) {
                console.log('[LOYALTY] awarding', add, 'for order', canonical.orderId);
                const { data, error } = await supabase.rpc('award_stamps', {
                  p_user: userId,
                  p_order_id: canonical.orderId,
                  p_add: add,
                });
                if (error) {
                  console.warn('[LOYALTY] award_stamps failed:', error);
                } else {
                  const [row] = Array.isArray(data) ? data : [];
                  const stampsNow = row?.updated_stamps ?? null;
                  const freeNow = row?.updated_free_drinks ?? null;
                  console.log('[LOYALTY] new totals → stamps:', stampsNow, 'free drinks:', freeNow);
                }
              } else {
                console.log('[LOYALTY] no stamps awarded (no user or zero qualifying items).');
              }


              try {
                await refreshStats();
              } catch (e) {
                console.warn('[LOYALTY] refreshStats failed', e);
              }
              try {
                await getMembershipSummary?.();
              } catch {}


              Alert.alert('Order placed', `Pickup code: ${canonical.pickupCode}`);

              clear?.();
              setTimeSlot(null);
            }}
          >
            <Text style={styles.applePayText}> Pay</Text>
          </TouchableOpacity>
        </View>
      </View>
      </SafeAreaView>

      <Modal
      visible={slotPickerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setSlotPickerVisible(false)}
    >
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContent}>
          <ScrollView>
            <Pressable
              style={styles.pickerOption}
              onPress={() => {
                setTimeSlot(null);
                setSlotPickerVisible(false);
              }}
            >
              <Text style={styles.pickerOptionText}>ASAP</Text>
            </Pressable>
            {availableSlots.map((slot, i) => (
              <Pressable
                key={i}
                style={styles.pickerOption}
                onPress={() => {
                  setTimeSlot(slot);
                  setSlotPickerVisible(false);
                }}
              >
                <Text style={styles.pickerOptionText}>{formatSlotLabel(slot)}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.pickerClose} onPress={() => setSlotPickerVisible(false)}>
            <Text style={styles.pickerCloseText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
      </Modal>
    </>
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
  itemSubtitle: {
    fontSize: 12,
    color: palette.clay,
    fontFamily: 'Fraunces_600SemiBold',
    marginTop: 4,
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
  applePayText: {
    color: '#fff',
    fontFamily: 'Fraunces_700Bold',
    fontSize: 16,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerContent: {
    backgroundColor: palette.paper,
    borderRadius: 14,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  pickerOption: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  pickerOptionText: {
    color: palette.coffee,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 16,
  },
  pickerClose: {
    marginTop: 10,
    alignItems: 'center',
  },
  pickerCloseText: {
    color: palette.coffee,
    fontFamily: 'Fraunces_600SemiBold',
  },
});
