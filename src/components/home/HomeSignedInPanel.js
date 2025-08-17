
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { palette } from '../../design/theme';

export default function HomeSignedInPanel({ quoteOpacity }) {
  return (
    <Animated.View style={[styles.rumiWrap, { opacity: quoteOpacity }]}>
      </Animated.View>
  );
}

const styles = StyleSheet.create({
  rumiWrap: { paddingVertical: 30, paddingHorizontal: 20, alignItems: 'center' },
  rumiQuote: { fontSize: 18, fontStyle: 'italic', textAlign: 'center', color: palette.coffee, marginBottom: 5 },
  rumiAttribution: { fontSize: 14, color: palette.coffee, opacity: 0.85 },
});
