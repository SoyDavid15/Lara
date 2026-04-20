import { StyleSheet, Text, type TextProps } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { fs } from '@/lib/responsive';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: fs(16),
    lineHeight: fs(24),
  },
  defaultSemiBold: {
    fontSize: fs(16),
    lineHeight: fs(24),
    fontWeight: '600',
  },
  title: {
    fontSize: fs(32),
    fontWeight: 'bold',
    lineHeight: fs(32),
  },
  subtitle: {
    fontSize: fs(20),
    fontWeight: 'bold',
  },
  link: {
    lineHeight: fs(30),
    fontSize: fs(16),
    color: '#0a7ea4',
  },
});
