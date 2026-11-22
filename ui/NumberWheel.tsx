import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { c } from './kit';

const rowHeight = 42;
const web = Platform.OS === 'web';
const webScroll = { scrollSnapType: 'y mandatory', overscrollBehaviorY: 'contain' } as ViewStyle;
const webRow = { scrollSnapAlign: 'center' } as TextStyle;

export function NumberWheel({
  label,
  value,
  step,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const [options] = useState(() => {
    const values = Array.from({ length: max / step + 1 }, (_, index) => index * step);
    // Keep exact values from history and typed entry selectable on the wheel.
    if (!values.includes(value)) {
      values.push(value);
      values.sort((a, b) => a - b);
    }
    return values;
  });
  const selected = useRef(options.indexOf(value));
  const initialOffset = useRef({ x: 0, y: selected.current * rowHeight }).current;
  const positioned = useRef(!web || initialOffset.y === 0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    if (disabled) scroll.current?.scrollTo({ y: selected.current * rowHeight, animated: false });
  }, [disabled]);

  function select(index: number) {
    if (selected.current === index) return;
    selected.current = index;
    onChange(options[index]);
  }

  function moveTo(index: number) {
    if (disabled || index < 0 || index >= options.length) return;
    select(index);
    scroll.current?.scrollTo({ y: index * rowHeight, animated: false });
  }

  function onKeyDown(event: { nativeEvent: { key: string }; preventDefault: () => void }) {
    const destinations: Record<string, number> = {
      ArrowUp: selected.current + 1,
      ArrowRight: selected.current + 1,
      ArrowDown: selected.current - 1,
      ArrowLeft: selected.current - 1,
      Home: 0,
      End: options.length - 1,
    };
    const { key } = event.nativeEvent;
    if (!Object.hasOwn(destinations, key)) return;
    event.preventDefault();
    moveTo(destinations[key]);
  }

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      aria-valuemin={0}
      aria-valuemax={options[options.length - 1]}
      aria-valuenow={value}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'increment') moveTo(selected.current + 1);
        if (nativeEvent.actionName === 'decrement') moveTo(selected.current - 1);
      }}
      {...(web && { onKeyDown, tabIndex: disabled ? -1 : 0, 'aria-orientation': 'vertical' })}
      style={[styles.wheel, disabled && styles.disabled]}
    >
      <View pointerEvents="none" style={styles.selection} />
      <ScrollView
        ref={scroll}
        style={web && webScroll}
        contentContainerStyle={styles.track}
        contentOffset={web ? undefined : initialOffset}
        onContentSizeChange={web ? () => {
          if (positioned.current) return;
          positioned.current = true;
          scroll.current?.scrollTo({ ...initialOffset, animated: false });
        } : undefined}
        onScroll={({ nativeEvent }) => {
          if (disabled || !positioned.current) return;
          const index = Math.round(nativeEvent.contentOffset.y / rowHeight);
          if (index >= 0 && index < options.length) select(index);
        }}
        scrollEnabled={!disabled}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        snapToInterval={rowHeight}
        decelerationRate="fast"
        nestedScrollEnabled
        bounces={false}
        scrollsToTop={false}
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        tabIndex={-1}
      >
        {options.map((option, index) => (
          <Text
            key={option}
            accessible={false}
            onPress={disabled ? undefined : () => moveTo(index)}
            numberOfLines={1}
            adjustsFontSizeToFit
            selectable={false}
            style={[styles.number, web && webRow, option === value && styles.selectedNumber]}
          >
            {option}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: {
    height: rowHeight * 3,
    borderRadius: 12,
    backgroundColor: c.bg,
    overflow: 'hidden',
  },
  disabled: { opacity: 0.6 },
  track: { paddingVertical: rowHeight },
  selection: {
    position: 'absolute',
    top: rowHeight,
    left: 5,
    right: 5,
    height: rowHeight,
    backgroundColor: c.pale,
    borderRadius: 8,
  },
  number: {
    height: rowHeight,
    lineHeight: rowHeight,
    paddingHorizontal: 8,
    textAlign: 'center',
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
    fontSize: 17,
    color: c.mute,
  },
  selectedNumber: { color: c.ink, fontSize: 24, fontWeight: '800' },
});
