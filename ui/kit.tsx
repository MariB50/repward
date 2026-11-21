import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

export const c = {
  bg: '#F6F7FA',
  white: '#FFFFFF',
  ink: '#121A2D',
  mute: '#59667B',
  faint: '#E1E5ED',
  blue: '#284FE5',
  pale: '#EDF1FF',
  navy: '#111B35',
  green: '#19734F',
  danger: '#A03532',
};
const paths = {
  bar: 'M3 9v6m3-9v12m12-12v12m3-9v6M6 12h12',
  clock: 'M12 6a8 8 0 1 1-.01 0M12 10v4l2 1M10 2h4m3 4 2-2',
  history: 'M3 10a9 9 0 1 1 1 7M3 4v6h6m3-3v5l3 2',
  chart: 'M3 18l6-6 4 3 7-9m-5 0h5v5',
  stack: 'M3 8l9-5 9 5-9 5-9-5zm0 5 9 5 9-5m-18 5 9 5 9-5',
  play: 'M7 4l13 8-13 8z',
  next: 'm9 5 7 7-7 7',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  edit: 'm4 16 11-11 4 4L8 20l-5 1 1-5zm9-9 4 4',
  check: 'm4 12 5 5L20 6',
  calendar: 'M4 6h16v15H4zM8 3v6m8-6v6M4 11h16',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  back: 'm14 5-7 7 7 7',
  bell: 'M5 17h14l-2-4V9a5 5 0 0 0-10 0v4l-2 4zm5 3a2 2 0 0 0 4 0',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1',
  close: 'm6 6 12 12M18 6 6 18',
  search: 'M15.5 15.5 21 21M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
  grip: 'M8 5h1M15 5h1M8 12h1M15 12h1M8 19h1M15 19h1',
  up: 'm6 15 6-6 6 6',
  down: 'm6 9 6 6 6-6',
  bench: 'M3 17h17M5 17v4m13-4v4M7 11h10M7 7v8m10-8v8M4 9v4m16-4v4',
  row: 'M3 18h16m-4 0 5-13M6 14l3-5 4 4 5-4M6 14l-2 4',
};
export type IconName = keyof typeof paths;
export function Icon({
  name,
  size = 20,
  color = c.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={paths[name]}
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={name === 'play' ? color : 'none'}
      />
    </Svg>
  );
}
export function Brand() {
  return (
    <View style={[s.row, { gap: 9 }]}>
      <Svg width={30} height={31} viewBox="0 0 32 32">
        <Path fill={c.blue} d="M2 26 11 5h6L8 26zm10 0 9-21h6l-9 21zm10 0 5-12h5l-5 12z" />
      </Svg>
      <Text style={{ fontSize: 25, fontWeight: '900', letterSpacing: -1.6, color: c.ink }}>Repward</Text>
    </View>
  );
}
export function Label({ children, color = c.mute }: { children: ReactNode; color?: string }) {
  return <Text style={[s.label, { color }]}>{children}</Text>;
}
export function Button({
  children,
  onPress,
  icon,
  secondary,
  disabled,
  style,
  label,
}: {
  children: ReactNode;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  label?: string;
}) {
  const color = secondary ? c.blue : c.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: secondary ? c.pale : c.blue },
        style,
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.8 },
      ]}
    >
      {icon && <Icon name={icon} color={color} size={16} />}
      <Text style={{ color, fontSize: 15, fontWeight: '700' }}>{children}</Text>
    </Pressable>
  );
}
export function Link({
  children,
  onPress,
  icon,
  disabled,
}: {
  children: ReactNode;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      style={({ pressed }) => [s.row, { gap: 6, minHeight: 44, opacity: disabled || pressed ? 0.5 : 1 }]}
    >
      {icon && <Icon name={icon} size={15} color={c.blue} />}
      <Text style={s.link}>{children}</Text>
    </Pressable>
  );
}
export const digits: TextStyle = {
  fontVariant: ['tabular-nums'],
  fontFamily: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    web: 'ui-monospace, Consolas, monospace',
  }),
};
export const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  body: { fontSize: 15, lineHeight: 22, color: c.mute },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.9, color: c.ink },
  label: { fontSize: 11, lineHeight: 16, fontWeight: '800', letterSpacing: 1.5 },
  link: { fontSize: 14, color: c.blue, fontWeight: '700' },
  card: {
    backgroundColor: c.white,
    borderColor: c.faint,
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 20,
  },
  input: {
    backgroundColor: c.bg,
    color: c.ink,
    fontSize: 17,
    borderWidth: 1,
    borderColor: '#C6CFDD',
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  error: { color: c.danger, fontSize: 14, lineHeight: 20 },
  divider: { height: 1, backgroundColor: c.faint },
  tile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.pale,
  },
});
