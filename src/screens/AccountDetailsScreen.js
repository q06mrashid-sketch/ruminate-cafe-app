import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlowingGlassButton from '../components/GlowingGlassButton';
import { palette } from '../design/theme';
import { supabase } from '../lib/supabase';

export default function AccountDetailsScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentEmail(user?.email || '');
      } catch {}
    })();
  }, []);

  const handleSave = async () => {
    const updates = {};
    if (email) updates.email = email;
    if (password) updates.password = password;

    if (!currentPassword) {
      Alert.alert('Enter current password', 'Please confirm your existing password to make changes.');
      return;
    }

    if (Object.keys(updates).length === 0) {
      Alert.alert('Nothing to update', 'Enter email or password to change.');
      return;
    }

    const { error: pwError } = await supabase.auth.signInWithPassword({ email: currentEmail, password: currentPassword });
    if (pwError) {
      Alert.alert('Incorrect password', 'Your current password is incorrect.');
      return;
    }

    const { error } = await supabase.auth.updateUser(updates);
    if (error) {
      Alert.alert('Update failed', error.message);
    } else {
      Alert.alert('Updated', 'Account details updated.');
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Account details</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Current password</Text>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            placeholderTextColor="#A89182"
            style={styles.input}
            secureTextEntry
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>New email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="New email"
            placeholderTextColor="#A89182"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>New password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="New password"
            placeholderTextColor="#A89182"
            style={styles.input}
            secureTextEntry
          />
        </View>
        <View style={{ marginTop:12 }}>
          <GlowingGlassButton text="Save changes" variant="dark" onPress={handleSave} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: palette.cream },
  content: { flex:1, padding:20 },
  title: { fontFamily:'Fraunces_700Bold', fontSize:22, color:palette.coffee, marginBottom:8 },
  field: { marginTop:12 },
  label: { color:palette.coffee, marginBottom:6, fontFamily:'Fraunces_600SemiBold' },
  input: { backgroundColor:'#FFF9F2', borderColor:palette.border, borderWidth:1, borderRadius:12, paddingHorizontal:12, paddingVertical:12, color:palette.coffee },
});
