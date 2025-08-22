import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '../design/theme';
import GlowingGlassButton from '../components/GlowingGlassButton';
import { signOut } from '../services/membership';
import { supabase } from '../lib/supabase';

export default function AdminScreen({ navigation }){
  const insets = useSafeAreaInsets();
  const handleDelete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try { await supabase.auth.admin.deleteUser(user.id); } catch {}
      }
    } catch {}
    try { await signOut(); } catch {}
    try { navigation.reset({ index:0, routes:[{ name:'Home' }] }); } catch {}
  };

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <View style={[styles.header, { paddingTop: insets.top }]}><Text style={styles.headerTitle}>Admin</Text></View>
      <View style={styles.content}>
        <Text style={styles.p}>Moderate activity and manage the café workflow.</Text>

        <View style={{ marginTop:20 }}>
          <GlowingGlassButton
            text="Manage subscription"
            variant="light"
            onPress={() => navigation.navigate('ManageSubscription')}
          />
        </View>

        <View style={{ marginTop:12 }}>
          <GlowingGlassButton
            text="Change account details"
            variant="light"
            onPress={() => navigation.navigate('AccountDetails')}
          />
        </View>

        <View style={{ marginTop:12 }}>
          <GlowingGlassButton
            text="Sign out"
            variant="light"
            onPress={async()=>{
              try { await signOut(); } catch {}
              try { navigation.reset({ index:0, routes:[{ name:'Home' }] }); } catch {}
            }}
          />
        </View>

        <View style={{ marginTop:12 }}>
          <GlowingGlassButton
            text="Delete account"
            variant="dark"
            onPress={handleDelete}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: 'transparent' },
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
  content: { flex:1, padding:20 },
  p: { color:palette.coffee, fontSize:16 }
});