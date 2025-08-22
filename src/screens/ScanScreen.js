
import React from 'react';
import { View, Text, Button } from 'react-native';
import { supabase } from '../lib/supabase';

async function loadScanner() {
  try { const m = await import('expo-barcode-scanner'); return m.BarCodeScanner; }
  catch { return null; }
}

  export default function ScanScreen(){
    const [Scanner,setScanner]=React.useState(null);
    const [status,setStatus]=React.useState(null);
    const [loading,setLoading]=React.useState(true);
    const [info,setInfo]=React.useState(null);

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
        <>
          <Scanner
            style={{flex:1}}
            onBarCodeScanned={async ({ type, data })=>{
              const prefix='ruminate:';
              if(!data.startsWith(prefix)) return;
              const content=data.slice(prefix.length);
              try {
                if(content.startsWith('member:')){
                  const member_uuid=content.slice('member:'.length);
                  const { data: res } = await supabase.functions.invoke('member-lookup',{ body:{ member_uuid } });
                  setInfo(res);
                } else if(content.startsWith('voucher:')){
                  const voucher_code=content.slice('voucher:'.length);
                  const { data: res } = await supabase.functions.invoke('member-lookup',{ body:{ voucher_code } });
                  setInfo(res);
                }
              } catch(err){ console.log('lookup failed', err); }
            }}
          />
          {info && (
            <View style={{position:'absolute',bottom:20,left:0,right:0,alignItems:'center'}}>
              <Text style={{backgroundColor:'#fff',padding:8,borderRadius:6}}>
                {`Tier: ${info.tier||'free'} (${info.status||'none'})`}
              </Text>
            </View>
          )}
        </>
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
