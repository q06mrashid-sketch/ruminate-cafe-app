
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../design/theme';
import GlowingGlassButton from '../components/GlowingGlassButton';
import { signOut } from '../services/membership';
import { supabase } from '../lib/supabase';

export default function AdminScreen({ navigation }){
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Admin</Text>
        <Text style={styles.p}>Moderate activity and manage the café workflow.</Text>

        <View style={{ marginTop:20 }}>
          <GlowingGlassButton text="Manage subscription" variant="light" onPress={() => navigation.navigate('ManageSubscription')} />
        </View>

        <View style={{ marginTop:12 }}>
          <GlowingGlassButton text="Change account details" variant="light" onPress={() => navigation.navigate('AccountDetails')} />
        </View>

        <View style={{ marginTop:12 }}>
          <GlowingGlassButton text="Sign out" variant="light" onPress={async()=>{
            try { await signOut(); } catch {}
            try { navigation.reset({ index:0, routes:[{ name:'Home' }] }); } catch {}
          }} />
        </View>

        <View style={{ marginTop:12 }}>
          <GlowingGlassButton text="Delete account" variant="dark" onPress={handleDelete} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#F8EBDD' },
  content: { flex:1, padding:20 },
  title: { fontFamily:'Fraunces_700Bold', fontSize:22, color:palette.coffee, marginBottom:8 },
  p: { color:palette.coffee, fontSize:16 }
});
