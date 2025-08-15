import React from 'react';
import { View, Text, ScrollView } from 'react-native';
export default class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state={e:null,info:null}; }
  componentDidCatch(e,info){ this.setState({e,info}); }
  render(){
    if(!this.state.e) return this.props.children;
    return (
      <ScrollView style={{flex:1,backgroundColor:'#111',padding:16}}>
        <Text style={{color:'#ff5555',fontSize:18,marginBottom:8}}>JS Error</Text>
        <Text selectable style={{color:'#fff',marginBottom:12}}>{String(this.state.e?.message||this.state.e)}</Text>
        <Text selectable style={{color:'#aaa'}}>{this.state.info?.componentStack}</Text>
      </ScrollView>
    );
  }
}
