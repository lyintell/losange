import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

const LOGO_SOURCE = require('../../../assets/logo2.png');

const SIZES = {
  small: 40,
  medium: 88,
  large: 128,
};

export function LosangeLogo({ size = 'large', style, imageStyle }) {
  const dimension = typeof size === 'number' ? size : SIZES[size] || SIZES.large;

  return (
    <Image
      source={LOGO_SOURCE}
      style={[styles.logo, { width: dimension, height: dimension }, imageStyle, style]}
      resizeMode="contain"
      accessibilityLabel="Logo Losange"
    />
  );
}

export default function LosangeLogoLoader({
  size = 'large',
  style,
  imageStyle,
  containerStyle,
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.14,
          duration: 280,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const dimension = typeof size === 'number' ? size : SIZES[size] || SIZES.large;

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.Image
        source={LOGO_SOURCE}
        style={[
          styles.logo,
          { width: dimension, height: dimension, transform: [{ scale: pulseAnim }] },
          imageStyle,
          style,
        ]}
        resizeMode="contain"
        accessibilityLabel="Chargement"
      />
    </View>
  );
}

export function LosangeLogoBackground({ opacity = 0.1, size = 280, style }) {
  return (
    <View style={[styles.backgroundWrap, style]} pointerEvents="none">
      <Image
        source={LOGO_SOURCE}
        style={[styles.backgroundLogo, { width: size, height: size, opacity }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: SIZES.large,
    height: SIZES.large,
  },
  backgroundWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  backgroundLogo: {
    width: 280,
    height: 280,
  },
});
