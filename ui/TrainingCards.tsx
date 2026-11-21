import { ImageBackground, Pressable, Text, View } from 'react-native';
import type { SessionSnapshot } from '../data/workoutStorage';
import type { WorkoutExercise } from '../data/workoutSession';
import { completedSetCount } from '../data/workoutSession';
import { changeFrom, previousSet, sessionTotals } from '../data/progress';
import { catalogExerciseFor } from '../data/exerciseCatalog';
import { ExercisePhoto } from './ExercisePhoto';
import { Button, c, digits, Icon, Label, Link, s } from './kit';

export function Hero({
  name,
  exerciseCount,
  sets,
  active,
  done,
  locked,
  onPress,
}: {
  name: string;
  exerciseCount: number;
  sets: number;
  active: boolean;
  done: number;
  locked: boolean;
  onPress: () => void;
}) {
  return (
    <ImageBackground
      source={require('../assets/training.jpg')}
      resizeMode="cover"
      imageStyle={{ borderRadius: 18, width: '100%', height: '100%', zIndex: 0 }}
      style={{
        backgroundColor: '#060C20',
        borderRadius: 18,
        overflow: 'hidden',
        minHeight: active ? 176 : 230,
        justifyContent: 'center',
      }}
    >
      <View
        style={{ padding: 24, alignItems: 'flex-start', gap: 12, backgroundColor: 'rgba(4,10,26,0.32)' }}
      >
        <View style={s.row}>
          <View style={{ width: 20, height: 3, backgroundColor: '#8EA8FF' }} />
          <Label color="#DAE3FF">{active ? 'CURRENT WORKOUT' : 'YOUR ROUTINE'}</Label>
        </View>
        <Text
          style={{
            fontSize: 40,
            fontWeight: '900',
            color: c.white,
            letterSpacing: -1.9,
            maxWidth: '94%',
            textShadowColor: '#071026',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 5,
          }}
        >
          {name}
        </Text>
        <View style={[s.row, { flexWrap: 'wrap', gap: 14 }]}>
          <View style={[s.row, { gap: 5 }]}>
            <Icon name="bar" size={17} color="#D8E1F3" />
            <Text style={{ color: c.white, fontSize: 14 }}>{exerciseCount} exercises</Text>
          </View>
          <View style={[s.row, { gap: 5 }]}>
            <Icon name="stack" size={16} color="#D8E1F3" />
            <Text style={{ color: c.white, fontSize: 14 }}>
              {active ? done + ' / ' + sets + ' sets' : sets + ' sets'}
            </Text>
          </View>
        </View>
        {!active && (
          <Button style={{ marginTop: 8 }} icon="play" disabled={locked} onPress={onPress}>
            Start workout
          </Button>
        )}
        {active && (
          <View
            style={{
              height: 4,
              width: 160,
              backgroundColor: '#42506A',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: ((100 * done) / sets + '%') as `${number}%`,
                height: 4,
                backgroundColor: '#94ABFF',
              }}
            />
          </View>
        )}
      </View>
    </ImageBackground>
  );
}

export function ExerciseList({
  exercises,
  active,
  selected,
  locked,
  onSelect,
  onEdit,
}: {
  exercises: WorkoutExercise[];
  active: boolean;
  selected: string | null;
  locked: boolean;
  onSelect: (id: string) => void;
  onEdit: () => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={s.between}>
        <Text style={s.title}>Exercises</Text>
        {!active && (
          <Link disabled={locked} icon="edit" onPress={onEdit}>
            Edit workout
          </Link>
        )}
      </View>
      <View style={[s.card, { padding: 0, gap: 0, overflow: 'hidden' }]}>
        {exercises.map((e, i) => {
          const count = completedSetCount(e);
          const chosen = active && selected === e.id;
          return (
            <Pressable
              key={e.id}
              disabled={!active || locked}
              accessibilityRole={active ? 'button' : undefined}
              accessibilityState={active ? { selected: chosen, disabled: locked } : undefined}
              onPress={() => onSelect(e.id)}
              style={({ pressed }) => [
                s.row,
                {
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  gap: 14,
                  borderTopWidth: i ? 1 : 0,
                  borderColor: c.faint,
                  backgroundColor: chosen || pressed ? c.pale : c.white,
                },
              ]}
            >
              <ExercisePhoto id={catalogExerciseFor(e)?.id} width={56} height={48} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: c.ink, letterSpacing: -0.35 }}>
                  {e.name}
                </Text>
                <Text style={{ color: c.mute, fontSize: 13 }}>
                  {active
                    ? count + ' of ' + e.plannedSets + ' sets logged'
                    : e.plannedSets + (e.plannedSets === 1 ? ' planned set' : ' planned sets')}
                </Text>
              </View>
              {active && (
                <Icon
                  name={count === e.plannedSets ? 'check' : 'next'}
                  size={18}
                  color={count === e.plannedSets ? c.green : c.blue}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
export function WeekCard({ history, onHistory }: { history: SessionSnapshot[]; onHistory: () => void }) {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const saved = history.filter(
    (h) => h.endedAt && new Date(h.endedAt) >= start && new Date(h.endedAt) < end,
  );
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Icon name="calendar" color={c.blue} />
        <Text style={[s.title, { fontSize: 19 }]}>Training week</Text>
      </View>
      <View style={[s.between, { gap: 3 }]}>
        {Array.from({ length: 7 }, (_, i) => {
          const date = new Date(start);
          date.setDate(date.getDate() + i);
          const current = date.toDateString() === today.toDateString();
          const logged = saved.some((h) => new Date(h.endedAt!).toDateString() === date.toDateString());
          return (
            <View key={i} style={{ alignItems: 'center', flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: c.mute }}>{'MTWTFSS'[i]}</Text>
              <View
                style={{
                  borderRadius: 9,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 34,
                  width: '100%',
                  maxWidth: 38,
                  backgroundColor: current ? c.blue : logged ? c.pale : c.bg,
                }}
              >
                <Text
                  style={[
                    digits,
                    {
                      fontSize: 13,
                      fontWeight: current ? '700' : '500',
                      color: current ? c.white : logged ? c.blue : c.mute,
                    },
                  ]}
                >
                  {date.getDate()}
                </Text>
                {logged && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 2,
                      width: 4,
                      height: 4,
                      borderRadius: 4,
                      backgroundColor: current ? c.white : c.blue,
                    }}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>
      <View style={s.divider} />
      <View style={s.between}>
        <Text style={[s.body, { fontSize: 13 }]}>
          {saved.length} {saved.length === 1 ? 'workout' : 'workouts'} logged
        </Text>
        <Link onPress={onHistory}>History →</Link>
      </View>
    </View>
  );
}
export function SessionDetails({
  session,
  history,
}: {
  session: SessionSnapshot;
  history: SessionSnapshot[];
}) {
  const totals = sessionTotals(session);
  return (
    <View style={{ gap: 16 }}>
      <View style={[s.card, { backgroundColor: c.navy, borderWidth: 0 }]}>
        <Label color="#C3D1F6">
          {session.endedAt
            ? new Date(session.endedAt)
                .toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
                .toUpperCase()
            : 'UNFINISHED WORKOUT'}
        </Label>
        <Text style={[s.title, { color: c.white, fontSize: 30, lineHeight: 37 }]}>{session.name}</Text>
        <Text style={{ color: '#DAE2F3' }}>
          {totals.sets} sets logged · {totals.volume.toLocaleString()} lb total volume
        </Text>
      </View>
      {session.exercises.map((e) => (
        <View key={e.id} style={s.card}>
          <Text style={[s.title, { fontSize: 19 }]}>{e.name}</Text>
          <SetRows exercise={e} history={history} />
        </View>
      ))}
    </View>
  );
}
export function SetRows({
  exercise,
  history,
  onEdit,
  locked,
}: {
  exercise: WorkoutExercise;
  history: SessionSnapshot[];
  onEdit?: (index: number) => void;
  locked?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      {exercise.sets.map((value, i) => {
        const previous = previousSet(history, exercise.id, i);
        return (
          <View
            key={i}
            style={[
              s.between,
              { borderTopWidth: 1, borderColor: c.faint, paddingTop: 10, flexWrap: 'wrap' },
            ]}
          >
            <Text style={[s.body, { fontSize: 14 }]}>Set {i + 1}</Text>
            <View style={{ alignItems: 'flex-end', gap: 2, flex: 1 }}>
              <Text style={{ fontWeight: '700', color: value ? c.ink : c.mute }}>
                {value ? value.weight + ' lb × ' + value.reps + ' reps' : 'Unlogged'}
              </Text>
              {value && previous && (
                <Text style={{ fontSize: 12, color: c.blue }}>
                  {changeFrom(value, previous)} vs. last time
                </Text>
              )}
            </View>
            {value && onEdit && (
              <Link icon="edit" disabled={locked} onPress={() => onEdit(i)}>
                Edit
              </Link>
            )}
          </View>
        );
      })}
    </View>
  );
}
