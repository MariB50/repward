import { useEffect, useState } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { clockText } from '../data/progress';
import { Button, c, digits, Icon, Label, Link, s } from './kit';

const presets = [60, 90, 120, 180];
function Dial({
  seconds,
  fraction,
  small,
  active,
}: {
  seconds: number;
  fraction: number;
  small: boolean;
  active: boolean;
}) {
  const diameter = small ? 108 : 166;
  return (
    <View style={{ width: diameter, height: diameter, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={diameter}
        height={diameter}
        viewBox="0 0 160 160"
        style={{ position: 'absolute' }}
      >
        {Array.from({ length: 60 }, (_, i) => (
          <Line
            key={i}
            x1="80"
            x2="80"
            y1="3"
            y2={i % 5 === 0 ? '10' : '7'}
            stroke={i % 5 === 0 ? '#9AA9C1' : '#D6DDEA'}
            strokeWidth={1.5}
            transform={'rotate(' + i * 6 + ' 80 80)'}
          />
        ))}
        <Circle cx="80" cy="80" r="61" fill="#F7F9FF" stroke="#E3E8F5" strokeWidth="5" />
        <Circle
          cx="80"
          cy="80"
          r="61"
          fill="none"
          stroke={c.blue}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={[383.27, 383.27]}
          strokeDashoffset={383.27 * (1 - fraction)}
          transform="rotate(-90 80 80)"
        />
      </Svg>
      <Text
        style={[
          digits,
          { fontSize: small ? 23 : 33, color: c.ink, fontWeight: '700', letterSpacing: -2 },
        ]}
      >
        {clockText(seconds)}
      </Text>
      {!small && (
        <Text
          style={{ color: c.mute, fontSize: 9, letterSpacing: 1.1, fontWeight: '800', marginTop: 3 }}
        >
          {active ? 'REMAINING' : 'MIN : SEC'}
        </Text>
      )}
    </View>
  );
}
export function RestTimer({
  until,
  duration,
  active,
  compact,
  locked,
  alerts,
  onAlerts,
  onDuration,
  onRest,
}: {
  until: number | null;
  duration: number;
  active: boolean;
  compact: boolean;
  locked: boolean;
  alerts: boolean;
  onAlerts: () => void;
  onDuration: (v: number) => void;
  onRest: (v: number | null) => void;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    if (!until) return;
    const tick = () => setNow(Date.now());
    const id = setInterval(() => {
      tick();
      if (Date.now() >= until) clearInterval(id);
    }, 250);
    const sub = AppState.addEventListener('change', tick);
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [until]);
  const remaining = until === null ? duration : Math.max(0, Math.ceil((until - now) / 1000));
  const running = until !== null && remaining > 0;
  return (
    <View style={s.card}>
      <View style={s.between}>
        <View style={s.row}>
          <Icon name="clock" color={c.blue} />
          <Text style={[s.title, { fontSize: 19 }]}>Rest timer</Text>
        </View>
        {Platform.OS !== 'web' && (
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Rest notifications"
            accessibilityState={{ checked: alerts, disabled: locked }}
            disabled={locked}
            onPress={onAlerts}
            style={[s.row, { gap: 4, minHeight: 44, paddingHorizontal: 4 }]}
          >
            <Icon name="bell" size={15} color={alerts ? c.blue : c.mute} />
            <Text style={{ fontSize: 12, color: alerts ? c.blue : c.mute }}>
              {alerts ? 'On' : 'Off'}
            </Text>
          </Pressable>
        )}
      </View>
      <View
        style={{
          alignItems: 'center',
          flexDirection: compact ? 'row' : 'column',
          gap: compact ? 18 : 12,
          paddingVertical: compact ? 0 : 4,
        }}
      >
        <Dial
          seconds={remaining}
          fraction={until === null ? 1 : Math.min(1, remaining / duration)}
          small={compact}
          active={running}
        />
        <View style={{ flexShrink: 1, alignItems: compact ? 'flex-start' : 'center', gap: 4 }}>
          <Label color={running ? c.blue : c.mute}>
            {running ? 'RESTING' : until !== null ? 'REST COMPLETE' : 'BETWEEN SETS'}
          </Label>
          <Text style={[s.body, { fontSize: 13, textAlign: compact ? 'left' : 'center' }]}>
            {running
              ? 'Time until your next set.'
              : until !== null
                ? 'Ready for your next set.'
                : 'Starts when you log a set.'}
          </Text>
        </View>
      </View>
      <View style={[s.row, { gap: 5 }]}>
        {presets.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityLabel={v + ' seconds for each rest'}
            accessibilityState={{ selected: v === duration, disabled: locked }}
            disabled={locked}
            onPress={() => onDuration(v)}
            style={{
              flex: 1,
              minHeight: 40,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: v === duration ? c.pale : c.bg,
              borderWidth: 1,
              borderColor: v === duration ? '#A6B6FF' : c.faint,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: v === duration ? c.blue : c.mute }}>
              {clockText(v)}
            </Text>
          </Pressable>
        ))}
      </View>
      {active && (
        <View style={s.between}>
          <Link disabled={locked} onPress={() => onRest(running ? null : Date.now() + duration * 1000)}>
            {running ? 'Skip rest' : 'Start rest'}
          </Link>
          {running && (
            <Button secondary disabled={locked} onPress={() => onRest(until! + 30000)}>
              +30 sec
            </Button>
          )}
        </View>
      )}
    </View>
  );
}
