import { useEffect, useState } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';
import { clockText } from '../data/progress';
import { Button, c, digits, Icon, Label, Link, s } from './kit';

const presets = [60, 90, 120, 180];
export function RestTimer({
  until,
  duration,
  active,
  locked,
  alerts,
  onAlerts,
  onDuration,
  onRest,
}: {
  until: number | null;
  duration: number;
  active: boolean;
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
      <View style={s.row}>
        <Text style={[digits, { fontSize: 28, color: c.ink, fontWeight: '700' }]}>
          {clockText(remaining)}
        </Text>
        <View style={{ flex: 1, gap: 3 }}>
          <Label color={running ? c.blue : c.mute}>
            {running ? 'RESTING' : until !== null ? 'REST COMPLETE' : 'BETWEEN SETS'}
          </Label>
          <Text style={s.body}>
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
              borderColor: v === duration ? c.blue : c.faint,
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
