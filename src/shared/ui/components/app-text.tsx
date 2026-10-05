import { Text, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '../theme';

type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

export function AppText({
  variant = 'body',
  color = colors.text,
  align,
  style,
  ...props
}: AppTextProps) {
  return <Text {...props} style={[typography[variant], { color, textAlign: align }, style]} />;
}
