import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { textStyles } from '@design/typography';
import type { AppTheme } from '../../../theme/useAppTheme';
import { useAppTheme } from '../../../theme/useAppTheme';

export type TextVariant = 
  | 'display' | 'h1' | 'h2' | 'h3' | 'h4' 
  | 'body1' | 'body2' | 'label' | 'caption' | 'micro' | 'nano' 
  | 'dataXL' | 'dataLG' | 'dataMD' | 'dataSM' | 'dataXS';

export type TextColor = 
  | 'primary' | 'secondary' | 'muted' | 'disabled' 
  | 'onGreen' | 'green' | 'danger' | 'warning' 
  | (string & {}); // allow hex strings

export interface TextProps extends Omit<RNTextProps, 'style'> {
  variant?: TextVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
  style?: RNTextProps['style'];
  children: React.ReactNode;
}

const resolveColor = (colorInput: TextColor, colors: AppTheme['colors']): string => {
  switch (colorInput) {
    case 'primary': return colors.textPrimary;
    case 'secondary': return colors.textSecondary;
    case 'muted': return colors.textMuted;
    case 'disabled': return colors.textDisabled;
    case 'onGreen': return colors.textOnGreen;
    case 'green': return colors.textGreen;
    case 'danger': return colors.textDanger;
    case 'warning': return colors.textWarning;
    default: return colorInput;
  }
};

const getDefaultColorForVariant = (variant: TextVariant): TextColor => {
  if (['display', 'h1', 'h2', 'h3', 'h4', 'dataXL', 'dataLG'].includes(variant)) {
    return 'primary';
  }
  if (['body2', 'caption', 'micro', 'nano'].includes(variant)) {
    return 'secondary';
  }
  return 'primary'; // body1, label, dataMD, etc. default to primary
};

export const Text = ({
  variant = 'body1',
  color,
  align = 'left',
  style,
  children,
  numberOfLines,
  ...rest
}: TextProps) => {
  const { colors } = useAppTheme();
  const resolvedColor = resolveColor(color || getDefaultColorForVariant(variant), colors);
  
  const baseStyle = textStyles[variant];
  
  const dynamicStyle = {
    color: resolvedColor,
    textAlign: align,
  };

  return (
    <RNText
      style={StyleSheet.flatten([baseStyle, dynamicStyle, style])}
      maxFontSizeMultiplier={1.3}
      numberOfLines={numberOfLines}
      {...rest}
    >
      {children}
    </RNText>
  );
};
