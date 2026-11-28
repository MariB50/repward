import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { catalogExerciseFor } from '../data/exerciseCatalog';
import { changeFrom, exerciseTrends, type ExerciseTrend } from '../data/progress';
import type { SessionSnapshot } from '../data/workoutStorage';
import { ExercisePhoto } from './ExercisePhoto';
import { Button, c, Icon, Link, s } from './kit';

const workoutPageSize = 6;
const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 });
const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const workoutDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const metrics = [
  { key: 'weight', label: 'Weight', unit: 'lb' },
  { key: 'reps', label: 'Reps', unit: 'reps' },
] as const;
type Metric = (typeof metrics)[number];

function TrendChart({ workouts, metric }: { workouts: ExerciseTrend['workouts']; metric: Metric }) {
  const [width, setWidth] = useState(0);
  const height = 128;
  const inset = 6;
  const latest = workouts[0];
  const first = workouts[workouts.length - 1];
  let min = latest.topSet[metric.key];
  let max = min;
  for (const { topSet } of workouts) {
    min = Math.min(min, topSet[metric.key]);
    max = Math.max(max, topSet[metric.key]);
  }
  const span = max - min;
  const points = workouts.map(({ topSet }, i) => ({
    x: inset + (1 - i / (workouts.length - 1)) * (width - inset * 2),
    y: span ? inset + ((max - topSet[metric.key]) / span) * (height - inset * 2) : height / 2,
  }));
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${metric.label} from ${number.format(first.topSet[metric.key])} to ${number.format(latest.topSet[metric.key])} ${metric.unit} over ${workouts.length} workouts`}
      style={{ gap: 5 }}
    >
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ justifyContent: span ? 'space-between' : 'center', alignItems: 'flex-end' }}>
          <Text style={chartLabel}>{number.format(max)}</Text>
          {!!span && <Text style={chartLabel}>{number.format(min)}</Text>}
        </View>
        <View style={{ flex: 1, height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          {width > inset * 2 && (
            <Svg width={width} height={height}>
              {[inset, height / 2, height - inset].map((y) => (
                <Line key={y} x1={0} x2={width} y1={y} y2={y} stroke={c.faint} />
              ))}
              <Polyline
                points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
                fill="none"
                stroke={c.blue}
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
              <Circle cx={points[0].x} cy={points[0].y} r={4} fill={c.blue} />
            </Svg>
          )}
        </View>
      </View>
      <View style={s.between}>
        <Text style={chartLabel}>{shortDate.format(first.date)}</Text>
        <Text style={chartLabel}>{shortDate.format(latest.date)}</Text>
      </View>
    </View>
  );
}

const chartLabel: TextStyle = { fontSize: 12, color: c.mute, fontVariant: ['tabular-nums'] };

function setText({ weight, reps }: ExerciseTrend['workouts'][number]['topSet']) {
  return `${number.format(weight)} lb × ${number.format(reps)} ${reps === 1 ? 'rep' : 'reps'}`;
}

function ExerciseTrendCard({ trend, onChoose }: { trend: ExerciseTrend; onChoose?: () => void }) {
  const { workouts } = trend;
  const latest = workouts[0];
  const first = workouts[workouts.length - 1];
  const [metric, setMetric] = useState<Metric>(() =>
    workouts.some(({ topSet }) => topSet.weight > 0) ? metrics[0] : metrics[1],
  );
  const [limit, setLimit] = useState(workoutPageSize);

  return (
    <>
      <View style={s.card}>
        <Pressable
          accessibilityRole={onChoose ? 'button' : undefined}
          accessibilityLabel={onChoose ? `Choose exercise, ${trend.name} selected` : undefined}
          disabled={!onChoose}
          onPress={onChoose}
          style={({ pressed }) => [s.row, { opacity: pressed ? 0.65 : 1 }]}
        >
          <ExercisePhoto id={catalogExerciseFor(trend)?.id} width={48} height={44} />
          <Text style={[s.title, { flex: 1 }]} accessibilityRole="header">{trend.name}</Text>
          {onChoose && <Icon name="down" size={20} color={c.blue} />}
        </Pressable>
        <View style={{ backgroundColor: c.navy, borderRadius: 12, padding: 16, gap: 5 }}>
          <Text style={{ fontSize: 13, color: '#C3D1F6', fontWeight: '700' }}>Latest top set</Text>
          <Text style={[s.title, { color: c.white }]}>{setText(latest.topSet)}</Text>
          {workouts.length > 1 && (
            <Text style={{ color: '#DAE2F3', fontSize: 13 }}>
              {changeFrom(latest.topSet, first.topSet)} vs. first workout
            </Text>
          )}
        </View>
        {workouts.length > 1 ? (
          <>
            <View accessibilityRole="tablist" style={[s.row, { gap: 6 }]}>
              {metrics.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: item === metric }}
                  onPress={() => setMetric(item)}
                  style={({ pressed }) => [{
                    minHeight: 44,
                    justifyContent: 'center',
                    paddingHorizontal: 16,
                    borderRadius: 9,
                    backgroundColor: item === metric ? c.pale : c.bg,
                    opacity: pressed ? 0.65 : 1,
                  }]}
                >
                  <Text style={{ fontWeight: '700', color: item === metric ? c.blue : c.mute }}>
                    {item.key === 'weight' ? 'Weight (lb)' : item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TrendChart workouts={workouts} metric={metric} />
          </>
        ) : (
          <Text style={s.body}>Log this exercise in another workout to see the trend.</Text>
        )}
      </View>
      <View style={s.card}>
        <Text accessibilityRole="header" style={[s.title, { fontSize: 20 }]}>Top sets by workout</Text>
        <Text style={s.body}>The heaviest set in each workout, with reps at that weight.</Text>
        {workouts.slice(0, limit).map(({ sessionId, workoutName, date, topSet }) => (
          <View
            key={sessionId}
            style={[s.between, { borderTopWidth: 1, borderColor: c.faint, paddingTop: 12, flexWrap: 'wrap' }]}
          >
            <View style={{ flexGrow: 1, flexBasis: 105, gap: 2 }}>
              <Text style={{ fontWeight: '700', color: c.ink }}>{workoutDate.format(date)}</Text>
              <Text style={{ color: c.mute, fontSize: 13 }}>{workoutName}</Text>
            </View>
            <Text style={{ fontWeight: '700', color: c.ink }}>{setText(topSet)}</Text>
          </View>
        ))}
        {workouts.length > limit && (
          <Link icon="down" onPress={() => setLimit(limit + workoutPageSize)}>Show older workouts</Link>
        )}
      </View>
    </>
  );
}

export function ExerciseProgress({ history, onTrain }: { history: SessionSnapshot[]; onTrain: () => void }) {
  const trends = useMemo(() => exerciseTrends(history), [history]);
  const [selectedId, setSelectedId] = useState<string>();
  const [choosing, setChoosing] = useState(false);
  const selected = trends.find(({ id }) => id === selectedId) ?? trends[0];

  if (!selected) {
    return (
      <View style={[s.card, { alignItems: 'flex-start', padding: 24 }]}>
        <View style={s.tile}><Icon name="chart" color={c.blue} /></View>
        <Text accessibilityRole="header" style={s.title}>Exercise progress starts here</Text>
        <Text style={s.body}>Finish a workout with logged reps to start seeing your exercise trends.</Text>
        <Button secondary onPress={onTrain}>Go to training</Button>
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <ExerciseTrendCard
        key={selected.id}
        trend={selected}
        onChoose={trends.length > 1 ? () => setChoosing(true) : undefined}
      />
      {choosing && (
        <Modal visible transparent onRequestClose={() => setChoosing(false)}>
          <SafeAreaView
            accessibilityViewIsModal
            style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: 'rgba(17,27,53,0.5)' }}
          >
            <View style={[s.card, { width: '100%', maxWidth: 480, maxHeight: '85%', alignSelf: 'center' }]}>
              <View style={s.between}>
                <Text accessibilityRole="header" style={[s.title, { flex: 1 }]}>Choose exercise</Text>
                <Link onPress={() => setChoosing(false)}>Close</Link>
              </View>
              <FlatList
                data={[...trends].sort((a, b) => a.name.localeCompare(b.name))}
                keyExtractor={({ id }) => id}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: item.id === selected.id }}
                    onPress={() => {
                      setSelectedId(item.id);
                      setChoosing(false);
                    }}
                    style={({ pressed }) => [s.between, {
                      minHeight: 48,
                      padding: 10,
                      borderRadius: 9,
                      backgroundColor: pressed || item.id === selected.id ? c.pale : c.white,
                    }]}
                  >
                    <Text style={{ color: c.ink, fontWeight: '700', flex: 1 }}>{item.name}</Text>
                    {item.id === selected.id && <Icon name="check" size={18} color={c.blue} />}
                  </Pressable>
                )}
              />
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}
