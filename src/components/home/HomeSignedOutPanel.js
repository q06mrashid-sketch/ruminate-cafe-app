
import React from 'react';
import { View } from 'react-native';
import GlowingGlassButton from '../../components/GlowingGlassButton';

export default function HomeSignedOutPanel({ navigation }) {
  return (
    <>
      <View style={{ height: 18 }} />
      <GlowingGlassButton text="Join today" variant="dark" ring onPress={() => navigation.navigate('MembershipStart')} />
      <View style={{ height: 10 }} />
      <GlowingGlassButton text="Learn about Membership & Profit Sharing" variant="light" onPress={() => navigation.navigate('Membership')} />
    </>
  );
}
