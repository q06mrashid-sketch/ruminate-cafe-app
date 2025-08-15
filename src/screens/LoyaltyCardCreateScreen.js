import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { palette } from '../design/theme';
import GlowingGlassButton from '../components/GlowingGlassButton';

export default function LoyaltyCardCreateScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const create = () => {
    if (!name || !email) {
      Alert.alert('Missing info', 'Please enter your name and email to create your loyalty card.');
      return;
    }
    Alert.alert('Loyalty card created', 'You can now start collecting stamps!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.cream }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create your loyalty card</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#9C8F86" style={styles.input} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" placeholderTextColor="#9C8F86" style={styles.input} />
        </View>

        <GlowingGlassButton text="Create loyalty card" onPress={create} variant="light" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 22, color: palette.coffee, fontFamily: 'Fraunces_700Bold', marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { color: palette.coffee, marginBottom: 6, fontFamily: 'Fraunces_600SemiBold' },
  input: {
    backgroundColor: '#FFF9F2',
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: palette.coffee,
  },
});
