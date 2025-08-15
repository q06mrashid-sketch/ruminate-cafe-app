import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { palette } from '../design/theme';

const DATA = [
  { id:'1', section:'Coffee', items:[
    { name:'Espresso', price:'£2.40' },
    { name:'Flat White', price:'£3.90' },
    { name:'Cappuccino', price:'£3.80' },
    { name:'Latte', price:'£3.80' },
  ]},
  { id:'2', section:'Specials', items:[
    { name:'Dirty Chai', price:'£4.20' },
    { name:"Cheese & za'atar toastie", price:'£5.50' }
  ]},
  { id:'3', section:'Tea & Others', items:[
    { name:'Loose Leaf Tea', price:'£3.00' },
    { name:'Hot Chocolate', price:'£3.60' }
  ]},
];

export default function MenuScreen(){
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        contentContainerStyle={styles.content}
        data={DATA}
        keyExtractor={(s)=>s.id}
        renderItem={({item}) => (
          <View style={styles.card}>
            <Text style={styles.section}>{item.section}</Text>
            {item.items.map((it)=>(
              <View key={it.name} style={styles.row}>
                <Text style={styles.item}>{it.name}</Text>
                <Text style={styles.price}>{it.price}</Text>
              </View>
            ))}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F8EBDD' },
  content:{ padding:16, paddingBottom:28 },
  card:{ backgroundColor:'#FFF5EA', borderColor:'#E7D6C3', borderWidth:1, borderRadius:14, padding:14, marginBottom:12 },
  section:{ color:palette.coffee, fontSize:18, fontFamily:'Fraunces_700Bold', marginBottom:8 },
  row:{ flexDirection:'row', justifyContent:'space-between', paddingVertical:6 },
  item:{ color:palette.coffee, fontSize:16 },
  price:{ color:palette.coffee, fontSize:16, fontFamily:'Fraunces_600SemiBold' }
});
