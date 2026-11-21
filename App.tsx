import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTraining } from './data/useTraining';
import { completedSetCount, createWorkoutExercises } from './data/workoutSession';
import { previousSet, sessionTotals } from './data/progress';
import { Brand, Button, c, Icon, Label, Link, s } from './ui/kit';
import { RestTimer } from './ui/RestTimer';
import { RoutineEditor } from './ui/RoutineEditor';
import { SetEntry } from './ui/SetEntry';
import { ExerciseList, Hero, SessionDetails, SetRows, WeekCard } from './ui/TrainingCards';

type Page = 'training' | 'history' | 'routine' | 'summary';
function TrainingApp() {
  const t = useTraining();
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const [page, setPage] = useState<Page>('training');
  const [selected, setSelected] = useState<string | null>(null);
  const [editingSet, setEditingSet] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const exercises = t.active?.exercises ?? createWorkoutExercises(t.plan);
  const total = exercises.reduce((n, e) => n + e.plannedSets, 0);
  const done = exercises.reduce((n, e) => n + completedSetCount(e), 0);
  const current =
    exercises.find((e) => e.id === selected) ??
    exercises.find((e) => completedSetCount(e) < e.plannedSets) ??
    exercises[0];
  const slot = editingSet ?? current.sets.findIndex((r) => r === null);
  const editSet = (index: number) => {
    setSelected(current.id);
    setEditingSet(index);
    top();
  };
  const detail = t.history.find((h) => h.id === detailId);
  const today = new Date();
  const date = today.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const historyTab = page === 'history' || page === 'summary';
  const top = () => scroll.current?.scrollTo({ y: 0, animated: false });
  function navigate(next: Page) {
    if (t.busy || t.retrySet) return;
    setConfirm(false);
    setEditingSet(null);
    setPage(next);
    if (next === 'history') setDetailId(null);
    top();
  }
  useEffect(() => {
    top();
  }, [page, detailId]);
  const nav = (
    <View style={[s.row, { gap: 6, justifyContent: wide ? 'center' : 'space-evenly' }]}>
      {(['training', 'history'] as const).map((item) => {
        const on = (item === 'history') === historyTab;
        return (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: on, disabled: t.busy || t.retrySet }}
            disabled={t.busy || t.retrySet}
            onPress={() => navigate(item)}
            style={({ pressed }) => [
              s.row,
              {
                minHeight: 42,
                paddingHorizontal: 18,
                borderRadius: 12,
                backgroundColor: on ? c.pale : 'transparent',
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <Icon
              name={item === 'training' ? 'bar' : 'history'}
              color={on ? c.blue : c.mute}
              size={19}
            />
            <Text style={{ color: on ? c.blue : c.mute, fontWeight: '700', fontSize: 14 }}>
              {item === 'training' ? 'Training' : 'History'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
  async function finish() {
    if (!t.active) return;
    const id = t.active.id;
    if (await t.finish()) {
      setConfirm(false);
      setEditingSet(null);
      setSelected(null);
      setDetailId(id);
      setPage('summary');
    }
  }
  const timer = (
    <RestTimer
      active={!!t.active}
      until={t.active?.restUntil ?? null}
      duration={t.duration}
      locked={t.locked}
      compact={!wide}
      alerts={t.alerts}
      onAlerts={t.toggleAlerts}
      onDuration={t.chooseDuration}
      onRest={t.setRest}
    />
  );
  const aside = (
    <View style={{ gap: 16 }}>
      {timer}
      <WeekCard history={t.history} onHistory={() => navigate('history')} />
    </View>
  );
  const title =
    page === 'routine'
      ? 'Edit routine'
      : page === 'history'
        ? detail
          ? 'Workout details'
          : 'Workout history'
        : page === 'summary'
          ? 'Workout saved'
          : t.active
            ? 'In session'
            : 'Training dashboard';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.white }}>
      <StatusBar style="dark" />
      <View style={{ borderBottomWidth: 1, borderColor: c.faint, backgroundColor: c.white }}>
        <View
          style={[
            s.between,
            {
              width: '100%',
              maxWidth: 1168,
              alignSelf: 'center',
              minHeight: wide ? 72 : 58,
              paddingHorizontal: wide ? 32 : 18,
            },
          ]}
        >
          <Brand />
          {wide && nav}
          <View style={[s.row, { gap: 7 }]}>
            <Icon name="calendar" size={15} color={c.mute} />
            <Text style={{ fontSize: 13, color: c.mute, fontWeight: '600' }}>{date}</Text>
          </View>
        </View>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            width: '100%',
            maxWidth: 1168,
            alignSelf: 'center',
            paddingHorizontal: wide ? 32 : 16,
            paddingTop: wide ? 32 : 20,
            paddingBottom: 36,
            gap: 18,
          }}
        >
          <View style={{ gap: 5 }}>
            {(page === 'routine' || page === 'summary' || (page === 'history' && detail)) && (
              <Link
                disabled={t.busy}
                onPress={() => navigate(page === 'routine' ? 'training' : 'history')}
                icon="back"
              >
                {page === 'routine' ? 'Training' : 'History'}
              </Link>
            )}
            <Text
              accessibilityRole="header"
              style={{
                fontSize: wide ? 40 : 32,
                lineHeight: wide ? 48 : 39,
                fontWeight: '900',
                letterSpacing: -1.7,
                color: c.ink,
              }}
            >
              {title}
            </Text>
          </View>
          {(!!t.error || !!t.notice) && (
            <View style={[s.card, { padding: 12 }]}>
              <Text accessibilityRole="alert" style={t.error ? s.error : s.body}>
                {t.error || t.notice}
              </Text>
              {!t.ready && (
                <Button secondary onPress={t.retryLoad}>
                  Retry
                </Button>
              )}
            </View>
          )}
          {!t.ready && !t.error && (
            <ActivityIndicator accessibilityLabel="Opening workout log" color={c.blue} />
          )}
          {page === 'training' && (
            <View
              style={{
                flexDirection: wide ? 'row' : 'column',
                alignItems: 'stretch',
                gap: wide ? 22 : 16,
              }}
            >
              <View style={{ flex: wide ? 1 : undefined, minWidth: 0, gap: 18 }}>
                {(!t.active || wide) && (
                  <Hero
                    name={t.active?.name ?? t.plan.name}
                    exerciseCount={exercises.length}
                    sets={total}
                    active={!!t.active}
                    done={done}
                    locked={t.locked}
                    onPress={async () => {
                      if (await t.start()) {
                        setSelected(null);
                        top();
                      }
                    }}
                  />
                )}
                {t.active && !wide && (
                  <View style={[s.between, { gap: 8 }]}>
                    <Text style={[s.title, { flex: 1, fontSize: 20 }]}>{t.active.name}</Text>
                    <Text style={s.body}>
                      {done} / {total} sets
                    </Text>
                  </View>
                )}
                {!wide && !!t.active?.restUntil && editingSet === null && timer}
                {t.active && slot >= 0 && (
                  <SetEntry
                    key={t.active.id + current.id + ':' + slot}
                    exercise={current}
                    index={slot}
                    prior={previousSet(t.history, current.id, slot)}
                    busy={t.busy}
                    locked={t.locked}
                    retry={t.retrySet}
                    onCancel={editingSet === null ? undefined : () => setEditingSet(null)}
                    onSave={async (record) => {
                      const ok = await t.save(current.id, slot, record);
                      if (ok) {
                        setEditingSet(null);
                        if (
                          editingSet === null &&
                          completedSetCount(current) + 1 === current.plannedSets
                        )
                          setSelected(null);
                      }
                      return ok;
                    }}
                  />
                )}
                {t.active && slot < 0 && (
                  <View style={s.card}>
                    <Label color={c.green}>
                      {done === total ? 'ALL SETS LOGGED' : 'EXERCISE COMPLETE'}
                    </Label>
                    <Text style={s.title}>{current.name}</Text>
                    <SetRows exercise={current} history={t.history} onEdit={editSet} locked={t.locked} />
                  </View>
                )}
                {t.active &&
                  !wide &&
                  (!t.active.restUntil || editingSet !== null) &&
                  done < total &&
                  timer}
                <ExerciseList
                  exercises={exercises}
                  active={!!t.active}
                  selected={current.id}
                  locked={t.locked}
                  onEdit={() => navigate('routine')}
                  onSelect={(id) => {
                    setEditingSet(null);
                    setSelected(id);
                    top();
                  }}
                />
                {t.active && slot >= 0 && completedSetCount(current) > 0 && (
                  <View style={s.card}>
                    <Label>THIS SESSION · {current.name.toUpperCase()}</Label>
                    <SetRows exercise={current} history={t.history} onEdit={editSet} locked={t.locked} />
                  </View>
                )}
                {t.active &&
                  (confirm ? (
                    <View style={s.card}>
                      <Text style={s.title}>Finish this workout?</Text>
                      <Text style={s.body}>
                        {done} of {total} sets logged. Your recorded sets will be saved in History.
                      </Text>
                      <View style={[s.row, { flexWrap: 'wrap' }]}>
                        <Button disabled={t.locked} onPress={finish}>
                          Finish workout
                        </Button>
                        <Link disabled={t.locked} onPress={() => setConfirm(false)}>
                          Keep training
                        </Link>
                      </View>
                    </View>
                  ) : (
                    <Button
                      secondary={done !== total}
                      icon="check"
                      disabled={t.locked}
                      onPress={() => (done === total ? void finish() : setConfirm(true))}
                    >
                      Finish workout
                    </Button>
                  ))}
              </View>
              {(wide || !t.active) && <View style={{ width: wide ? 300 : undefined }}>{aside}</View>}
            </View>
          )}
          {page === 'routine' && (
            <View style={{ width: '100%', maxWidth: 720 }}>
              <RoutineEditor
                plan={t.plan}
                locked={t.busy}
                knownIds={
                  new Map(
                    [
                      ...t.history
                        .slice()
                        .reverse()
                        .flatMap((h) => h.exercises),
                      ...t.plan.exercises,
                    ].map((e) => [e.name.trim().toLowerCase(), e.id]),
                  )
                }
                onCancel={() => navigate('training')}
                onSave={async (p) => {
                  if (await t.savePlan(p)) navigate('training');
                }}
              />
            </View>
          )}
          {(page === 'summary' || page === 'history') && detail && (
            <View style={{ width: '100%', maxWidth: 760, gap: 16 }}>
              <SessionDetails
                session={detail}
                history={t.history.slice(t.history.indexOf(detail) + 1)}
              />
              <Button onPress={() => navigate('training')} icon="bar">
                Back to training
              </Button>
            </View>
          )}
          {page === 'history' && !detail && (
            <View style={{ gap: 12, width: '100%', maxWidth: 760 }}>
              {!t.history.length && t.ready && (
                <View style={[s.card, { alignItems: 'flex-start', padding: 24 }]}>
                  <View style={s.tile}>
                    <Icon name="history" color={c.blue} />
                  </View>
                  <Text style={s.title}>Your first workout goes here</Text>
                  <Text style={s.body}>
                    Finish a session to see the weight and reps you logged for each set.
                  </Text>
                  <Button secondary onPress={() => navigate('training')}>
                    Go to training
                  </Button>
                </View>
              )}
              {t.history.map((h) => {
                const totals = sessionTotals(h);
                return (
                  <Pressable
                    key={h.id}
                    accessibilityRole="button"
                    onPress={() => setDetailId(h.id)}
                    style={({ pressed }) => [s.card, s.between, pressed && { opacity: 0.75 }]}
                  >
                    <View style={{ gap: 6, flex: 1 }}>
                      <Label>
                        {h.endedAt
                          ? new Date(h.endedAt)
                              .toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                              .toUpperCase()
                          : 'UNFINISHED'}
                      </Label>
                      <Text style={s.title}>{h.name}</Text>
                      <Text style={s.body}>
                        {totals.sets} sets · {totals.volume.toLocaleString()} lb volume
                      </Text>
                    </View>
                    <Icon name="next" color={c.blue} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {!wide && (
        <View
          style={{
            backgroundColor: c.white,
            borderTopWidth: 1,
            borderColor: c.faint,
            paddingVertical: 5,
          }}
        >
          {nav}
        </View>
      )}
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <TrainingApp />
    </SafeAreaProvider>
  );
}
