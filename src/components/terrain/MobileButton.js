import React from 'react';
import { Button } from 'react-native-paper';
import { mobileButtonContentStyle, mobileButtonLabelStyle } from '../../styles/theme';

export default function MobileButton({ labelStyle, contentStyle, ...props }) {
  return (
    <Button
      labelStyle={[mobileButtonLabelStyle, labelStyle]}
      contentStyle={[mobileButtonContentStyle, contentStyle]}
      {...props}
    />
  );
}
