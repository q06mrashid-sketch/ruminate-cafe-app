
import React from 'react';
import { View, Text, Button } from 'react-native';

async function loadScanner() {
  try { const m = await import('expo-barcode-scanner'); return m.BarCodeScanner; }
  catch { return null; }
}

export default function ScanScreen(){
  const [Scanner,setScanner]=React.useState(null);
  const [status,setStatus]=React.useState(null);
  const [loading,setLoading]=React.useState(true);

  React.useEffect(()=>{
    let on=true;
    (async()=>{
      const S=await loadScanner();
      if(!on){return;}
      if(!S){ setLoading(false); setScanner(null); return; }
      const p=await S.requestPermissionsAsync();
      if(!on){return;}
      setStatus(p?.status);
      setScanner(()=>S);
      setLoading(false);
    })();
    return()=>{on=false};
  },[]);

  if(Scanner && status==='granted'){
    return (
      <Scanner
        style={{flex:1}}
        onBarCodeScanned={({ type, data })=>{ console.log('scanned', type, data); }}
      />
    );
  }

  return (
    <View style={{flex:1,alignItems:'center',justifyContent:'center',padding:24}}>
      <Text style={{fontSize:18,marginBottom:8}}>
        {loading ? 'Loading scanner…' : 'Scanner module unavailable in this client.'}
      </Text>
      <Button title="Retry" onPress={async()=>{
        setLoading(true);
        const S=await loadScanner();
        if(S){
          const p=await S.requestPermissionsAsync();
          setStatus(p?.status);
          setScanner(()=>S);
        }
        setLoading(false);
      }}/>
    </View>
  );
}
