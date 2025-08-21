import React from 'react';
import { View, Text, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlowingGlassButton from '../components/GlowingGlassButton';
import { palette } from '../design/theme';

export default function ManageSubscriptionScreen({ navigation }) {
  const handleUpgrade = () => {
    try { navigation.navigate('MembershipStart'); } catch {}
  };
  const handleCancel = async () => {
    try {
      await Linking.openURL('https://apps.apple.com/account/subscriptions');
    } catch {
      Alert.alert('Unable to open settings', 'Please manage your subscription in the iOS Settings app.');
    }
  };
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Manage Subscription</Text>
        <Text style={styles.p}>Upgrade to a paid membership or cancel your subscription.</Text>
        <View style={{ marginTop:20 }}>
          <GlowingGlassButton text="Upgrade to paid membership" variant="dark" onPress={handleUpgrade} />
        </View>
        <View style={{ marginTop:12 }}>
          <GlowingGlassButton text="Cancel subscription" variant="light" onPress={handleCancel} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1 },
  content: { flex:1, padding:20 },
  title: { fontFamily:'Fraunces_700Bold', fontSize:22, color:palette.coffee, marginBottom:8 },
  p: { color:palette.coffee, fontSize:16 }
});
