import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../design/theme';

export default function AdminScreen(){
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Admin</Text>
        <Text style={styles.p}>Moderate activity and manage the café workflow.</Text>
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
