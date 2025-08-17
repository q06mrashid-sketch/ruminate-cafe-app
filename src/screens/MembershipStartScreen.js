
import React, { useState } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { palette } from '../design/theme';
import GlowingGlassButton from '../components/GlowingGlassButton';
import { supabase, hasSupabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';

const Seg = ({ value, setValue }) => (
  <View style={styles.segWrap}>
    {['Sign in', 'Create account'].map((label, i) => {
      const key = i === 0 ? 'signin' : 'create';
      const active = value === key;
      return (
        <Pressable key={key} onPress={() => setValue(key)} style={[styles.segBtn, active && styles.segBtnActive]}>
          <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const TierToggle = ({ tier, setTier }) => (
  <View style={styles.tierWrap}>
    {[
      { key: 'free', label: 'Loyalty card (Free)' },
      { key: 'paid', label: 'Member (£20/mo)' },
    ].map(({ key, label }) => {
      const active = tier === key;
      return (
        <Pressable key={key} onPress={() => setTier(key)} style={[styles.tierBtn, active && styles.tierBtnActive]}>
          <Text style={[styles.tierText, active && styles.tierTextActive]}>{label}</Text>
        </Pressable>
      );
    })}
  </View>
);

export default function MembershipStartScreen() {
  const navigation = useNavigation();
  const [mode, setMode] = useState('create');
  const [tier, setTier] = useState('paid');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  async function ensureSupabase() {
    if (!hasSupabase || !supabase) {
      Alert.alert('Setup needed', 'Supabase keys are missing. Add SUPABASE_URL and SUPABASE_ANON_KEY to app config.');
      return false;
    }
    return true;
  }

  async function handleSignIn() {
    if (!(await ensureSupabase())) return;
    if (!email || !password) { Alert.alert('Missing details', 'Email and password are required.'); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Sign in failed', error.message);
    else { Alert.alert('Welcome back', 'Signed in successfully.'); navigation.navigate('Home'); }
  }

  async function handleForgot() {
    if (!(await ensureSupabase())) return;
    if (!email) { Alert.alert('Enter email', 'Type your email above, then tap “Forgot password”.'); return; }
    const redirectTo = Platform.select({ ios: 'ruminate://reset', android: 'https://ruminate.example/reset' });
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) Alert.alert('Reset failed', error.message);
    else Alert.alert('Email sent', 'Check your inbox for a password reset link.');
  }

  async function signUpCommon(profile) {
    if (!(await ensureSupabase())) return null;
    if (!email || !password) { Alert.alert('Missing details', 'Email and password are required.'); return null; }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: profile },
    });
    if (error) { Alert.alert('Sign up failed', error.message); return null; }
    return data;
  }

  async function handleCreateFree() {
    const data = await signUpCommon({ name, phone, tier: 'free' });
    if (!data) return;
    Alert.alert('Loyalty card created', 'You can start collecting stamps immediately.'); navigation.navigate('Home'); }

  async function handleCreatePaid() {
    const data = await signUpCommon({ name, phone, tier: 'paid' });
    if (!data) return;
    Alert.alert('Membership', 'Apple Pay / Stripe PaymentSheet would open here in the dev build.'); navigation.navigate('Home');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAwareScrollView enableOnAndroid={true} enableAutomaticScroll={true} keyboardShouldPersistTaps="handled" extraScrollHeight={24} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Membership & Loyalty</Text>

        <Seg value={mode} setValue={setMode} />

        {mode === 'create' ? (
          <>
            <TierToggle tier={tier} setTier={setTier} />

            <View style={styles.infoCard}>
              {tier === 'free' ? (
                <>
                  <Text style={styles.tierTitle}>Loyalty card — Free</Text>
                  <Text style={styles.perk}>• Collect 8 drinks, the 9th is free</Text>
                  <Text style={styles.perk}>• Works for takeaway or in-café</Text>
                </>
              ) : (
                <>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceValue}>£20</Text>
                    <Text style={styles.perMonth}>/month</Text>
                  </View>
                  <Text style={styles.perkTitle}>What you get</Text>
                  <Text style={styles.perk}>• 3 free drinks every month</Text>
                  <Text style={styles.perk}>• 10% discount thereafter</Text>
                  <Text style={styles.perk}>• Share of 5% Member Pool (dividends)</Text>
                  <Text style={styles.perk}>• Voting on select community issues</Text>
                  <Text style={styles.perk}>• Loyalty card included (8 stamps → 9th free)</Text>
                </>
              )}
            </View>

            <Text style={styles.sectionLabel}>Your details</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full name</Text>
              <TextInput value={name} onChangeText={setName} placeholder="e.g. Aaliyah Khan" placeholderTextColor="#A89182" style={styles.input} autoCapitalize="words" />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#A89182" style={styles.input} autoCapitalize="none" keyboardType="email-address" />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput value={password} onChangeText={setPassword} placeholder="Create a password" placeholderTextColor="#A89182" style={styles.input} secureTextEntry />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Phone (optional)</Text>
              <TextInput value={phone} onChangeText={setPhone} placeholder="+44 7…" placeholderTextColor="#A89182" style={styles.input} keyboardType="phone-pad" />
            </View>

            {tier === 'paid' ? (
              <Pressable style={styles.applePay} onPress={handleCreatePaid}>
                <Ionicons name="logo-apple" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.applePayText}>Pay with Apple Pay</Text>
              </Pressable>
            ) : (
              <GlowingGlassButton text="Create loyalty card" variant="light" onPress={handleCreateFree} />
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Sign in</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#A89182" style={styles.input} autoCapitalize="none" keyboardType="email-address" />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor="#A89182" style={styles.input} secureTextEntry />
            </View>
            <GlowingGlassButton text="Sign in" variant="dark" onPress={handleSignIn} />
            <Pressable onPress={handleForgot} style={{ alignSelf: 'center', marginTop: 10 }}>
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>
          </>
        )}

        <View style={{ height: 24 }} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor: palette.cream },
  content:{ padding:16, paddingBottom:28 },
  title:{ fontSize:22, color:palette.coffee, fontFamily:'Fraunces_700Bold', marginBottom:12 },

  segWrap:{ flexDirection:'row', backgroundColor:'#F4E8DA', borderRadius:12, padding:4, marginBottom:12, borderWidth:1, borderColor:palette.border },
  segBtn:{ flex:1, borderRadius:8, alignItems:'center', paddingVertical:10 },
  segBtnActive:{ backgroundColor:'#FFF5EA' },
  segText:{ color:palette.coffee, fontFamily:'Fraunces_600SemiBold' },
  segTextActive:{ color:palette.clay },

  tierWrap:{ flexDirection:'row', gap:8, marginBottom:12 },
  tierBtn:{ flex:1, borderWidth:1, borderColor:palette.border, borderRadius:10, paddingVertical:10, alignItems:'center', backgroundColor:'#FFF5EA' },
  tierBtnActive:{ borderColor:palette.clay, backgroundColor:'#FFE8E9' },
  tierText:{ color:palette.coffee, fontFamily:'Fraunces_600SemiBold' },
  tierTextActive:{ color:palette.clay },

  infoCard:{ backgroundColor:palette.paper, borderColor:palette.border, borderWidth:1, borderRadius:14, padding:16, marginBottom:16 },
  tierTitle:{ fontSize:16, color:palette.coffee, fontFamily:'Fraunces_700Bold', marginBottom:6 },
  perkTitle:{ marginTop:8, fontFamily:'Fraunces_700Bold', color:palette.coffee, fontSize:16 },
  perk:{ marginTop:6, color:palette.coffee },
  priceRow:{ flexDirection:'row', alignItems:'flex-end' },
  priceValue:{ fontSize:28, color:palette.coffee, fontFamily:'Fraunces_700Bold' },
  perMonth:{ fontSize:16, color:palette.coffee, fontFamily:'Fraunces_600SemiBold', marginLeft:6 },

  sectionLabel:{ fontSize:15, color:palette.coffee, fontFamily:'Fraunces_600SemiBold', marginBottom:8 },
  field:{ marginBottom:12 },
  fieldLabel:{ color:palette.coffee, marginBottom:6, fontFamily:'Fraunces_600SemiBold' },
  input:{ backgroundColor:'#FFF9F2', borderColor:palette.border, borderWidth:1, borderRadius:12, paddingHorizontal:12, paddingVertical:12, color:palette.coffee },

  applePay:{ backgroundColor:'#000', borderRadius:14, paddingVertical:14, alignItems:'center', justifyContent:'center', flexDirection:'row', marginTop:2 },
  applePayText:{ color:'#fff', fontSize:16, fontFamily:'Fraunces_700Bold' },

  link:{ color:palette.clay, fontFamily:'Fraunces_600SemiBold' },
});


async function handleEmailSignIn(email, password, navigation) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  navigation.navigate('Home');
}
