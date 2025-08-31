import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { palette } from '../design/theme';
import { computeItemTotal } from '../services/menuData.js';
import formatCurrency from '../utils/formatCurrency';

export default function MenuItemDetail({ item, options, visible, onClose, onAdd }) {
  const [altMilk, setAltMilk] = useState(null);
  const [coffeeBlend, setCoffeeBlend] = useState('house');
  const [extraShots, setExtraShots] = useState(0);
  const [syrups, setSyrups] = useState({}); // key -> count

  useEffect(() => {
    setAltMilk(null);
    setCoffeeBlend('house');
    setExtraShots(0);
    setSyrups({});
  }, [item]);

  const syrupCount = useMemo(() => Object.values(syrups).reduce((a,b)=>a+b,0), [syrups]);
  const total = useMemo(() => computeItemTotal(item?.price || 0, { syrupCount, extraShots }), [item, syrupCount, extraShots]);

  const add = () => {
    const modifiers = {};
    if (item.flags.alt && altMilk) modifiers.altMilk = altMilk;
    if (item.flags.coffee) {
      const blendLabel = options.coffeeBlends.find(b=>b.key===coffeeBlend)?.label || 'House blend';
      modifiers.coffeeBlend = blendLabel;
    }
    if (item.flags.syrups) {
      const chosen = [];
      for (const [key,count] of Object.entries(syrups)) {
        const label = options.syrups.find(s=>s.key===key)?.label;
        for (let i=0;i<count;i++) chosen.push(label);
      }
      if (chosen.length) modifiers.syrups = chosen;
    }
    if (item.flags.extra && extraShots>0) modifiers.extraShots = extraShots;
    const lineItem = {
      id: `${item.id}:${JSON.stringify(modifiers)}`,
      name: item.name,
      basePrice: item.price,
      price: total,
      unitPrice: total,
      modifiers,
      quantity: 1,
    };
    onAdd?.(lineItem);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <ScrollView>
            <Text style={styles.title}>{item?.name}</Text>
            {item?.desc && <Text style={styles.desc}>{item.desc}</Text>}
            {item?.flags.alt && (
              <View style={styles.optionSection}>
                <Text style={styles.label}>Alt milk</Text>
                <View style={styles.chipRow}>
                  {options.altMilks.map(m => (
                    <Pressable key={m} onPress={() => setAltMilk(m)} style={[styles.chip, altMilk===m && styles.chipSelected]}>
                      <Text style={styles.chipText}>{m}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            {item?.flags.syrups && (
              <View style={styles.optionSection}>
                <Text style={styles.label}>Syrups</Text>
                {options.syrups.map(opt => (
                  <View key={opt.key} style={styles.stepRow}>
                    <Text style={styles.stepLabel}>{opt.label}</Text>
                    <View style={styles.stepCtrls}>
                      <Pressable onPress={() => setSyrups(prev=>({ ...prev, [opt.key]: Math.max(0,(prev[opt.key]||0)-1) }))} style={styles.ctrlBtn}><Text style={styles.ctrlTxt}>-</Text></Pressable>
                      <Text style={styles.stepCount}>{syrups[opt.key]||0}</Text>
                      <Pressable onPress={() => setSyrups(prev=>({ ...prev, [opt.key]: (prev[opt.key]||0)+1 }))} style={styles.ctrlBtn}><Text style={styles.ctrlTxt}>+</Text></Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {item?.flags.coffee && (
              <View style={styles.optionSection}>
                <Text style={styles.label}>Coffee blend</Text>
                <View style={styles.chipRow}>
                  {options.coffeeBlends.map(opt => (
                    <Pressable key={opt.key} onPress={() => setCoffeeBlend(opt.key)} style={[styles.chip, coffeeBlend===opt.key && styles.chipSelected]}>
                      <Text style={styles.chipText}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            {item?.flags.extra && (
              <View style={styles.optionSection}>
                <Text style={styles.label}>Extra shot</Text>
                <View style={styles.stepCtrls}>
                  <Pressable onPress={() => setExtraShots(Math.max(0,extraShots-1))} style={styles.ctrlBtn}><Text style={styles.ctrlTxt}>-</Text></Pressable>
                  <Text style={styles.stepCount}>{extraShots}</Text>
                  <Pressable onPress={() => setExtraShots(extraShots+1)} style={styles.ctrlBtn}><Text style={styles.ctrlTxt}>+</Text></Pressable>
                </View>
              </View>
            )}
          </ScrollView>
          <Text style={styles.price}>{formatCurrency(total)}</Text>
          <Pressable style={styles.addBtn} onPress={add}><Text style={styles.addTxt}>Add to cart</Text></Pressable>
          <Pressable style={styles.closeBtn} onPress={onClose}><Text style={styles.closeTxt}>Close</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', alignItems:'center', justifyContent:'center' },
  content:{ backgroundColor:palette.paper, borderRadius:14, padding:20, width:'80%', maxHeight:'90%' },
  title:{ fontSize:20, color:palette.coffee, fontFamily:'Fraunces_700Bold', marginBottom:8 },
  desc:{ color:palette.coffee, fontFamily:'Fraunces_600SemiBold', marginBottom:12 },
  optionSection:{ marginBottom:16 },
  label:{ color:palette.coffee, fontFamily:'Fraunces_600SemiBold', marginBottom:8 },
  chipRow:{ flexDirection:'row', flexWrap:'wrap', gap:8 },
  chip:{ paddingVertical:6, paddingHorizontal:10, borderRadius:16, backgroundColor:palette.cream, marginRight:8, marginBottom:8 },
  chipSelected:{ backgroundColor:palette.coffee },
  chipText:{ color:palette.coffee },
  stepRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  stepLabel:{ color:palette.coffee, fontFamily:'Fraunces_600SemiBold' },
  stepCtrls:{ flexDirection:'row', alignItems:'center' },
  ctrlBtn:{ paddingHorizontal:12, paddingVertical:6, backgroundColor:palette.cream, borderRadius:8 },
  ctrlTxt:{ fontSize:18, color:palette.coffee },
  stepCount:{ width:24, textAlign:'center', fontSize:16, color:palette.coffee },
  price:{ fontSize:18, color:palette.coffee, fontFamily:'Fraunces_700Bold', marginBottom:12, textAlign:'center' },
  addBtn:{ backgroundColor:palette.coffee, padding:12, borderRadius:8, alignItems:'center', marginBottom:8 },
  addTxt:{ color:'#fff', fontFamily:'Fraunces_700Bold' },
  closeBtn:{ alignItems:'center', padding:8 },
  closeTxt:{ color:palette.coffee, fontFamily:'Fraunces_600SemiBold' },
});

