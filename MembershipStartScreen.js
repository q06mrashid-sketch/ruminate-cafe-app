import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View, Text, TextInput, Switch } from 'react-native';
import GlowingGlassButton from './src/components/GlowingGlassButton';
import { MEMBERSHIP } from './src/constants/membership';
import { palette } from './theme';

export default function MembershipStartScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [marketing, setMarketing] = useState(true);

  const onPay = () => {
    // TODO: integrate Apple Pay flow later
    alert('Thanks! We will complete Apple Pay in the next step.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Your Membership</Text>
          <Text style={styles.price}>{MEMBERSHIP.price}</Text>
          <View style={{ height: 8 }} />
          <TextInput
            placeholder="Full name"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#8C6B56"
            style={styles.input}
          />
          <TextInput
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor="#8C6B56"
            style={styles.input}
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Send me updates and perks</Text>
            <Switch value={marketing} onValueChange={setMarketing} trackColor={{ true: palette.clay }} />
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total today</Text>
            <Text style={styles.totalAmt}>{MEMBERSHIP.price}</Text>
          </View>
          <GlowingGlassButton text="Pay with Apple Pay" variant="dark" ring onPress={onPay} style={{ marginTop: 10 }} />
        </View>
        <View style={{ height: 24 }} />
        <View style={styles.card}>
          <Text style={styles.title}>What you get</Text>
          {MEMBERSHIP.perks.map((p, i) => (
            <View key={i} style={styles.perkRow}>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.perkText}>{p}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1 },
  content:{ padding:16, paddingBottom:28 },
  card:{ backgroundColor:'#FFF5EA', borderColor:'#E7D6C3', borderWidth:1, borderRadius:14, padding:16 },
  title:{ fontFamily:'Fraunces_700Bold', fontSize:20, color:palette.coffee },
  price:{ marginTop:4, fontFamily:'Fraunces_700Bold', fontSize:18, color:palette.clay },
  input:{ backgroundColor:'#F5DFCD', borderRadius:10, paddingHorizontal:12, paddingVertical:12, color:palette.coffee, marginBottom:10 },
  switchRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:4, marginBottom:8 },
  switchLabel:{ color:palette.coffee, fontSize:15 },
  totalRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:8 },
  totalLabel:{ color:palette.coffee, fontSize:16, fontFamily:'Fraunces_600SemiBold' },
  totalAmt:{ color:palette.coffee, fontSize:18, fontFamily:'Fraunces_700Bold' },
  perkRow:{ flexDirection:'row', alignItems:'flex-start', marginTop:6 },
  dot:{ color:palette.clay, fontSize:18, marginRight:6, lineHeight:18 },
  perkText:{ color:palette.coffee, fontSize:15, flex:1 }
});
