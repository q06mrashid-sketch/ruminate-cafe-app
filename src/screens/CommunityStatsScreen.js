
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import { palette } from '../design/theme';

export default function CommunityStatsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Community Fund</Text>
        <Text style={styles.copy}>Monthly totals and history coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F8EBDD' },
  content:{ padding:16 },
  title:{ fontSize:22, color:palette.coffee, fontFamily:'Fraunces_700Bold', marginBottom:8 },
  copy:{ color:palette.coffee }
});
