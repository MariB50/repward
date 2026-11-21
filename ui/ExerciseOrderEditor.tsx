import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import {
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type PointerEvent,
  type ViewStyle,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { catalogExerciseFor } from '../data/exerciseCatalog';
import { ExercisePhoto } from './ExercisePhoto';
import { Button, c, Icon, Link, s } from './kit';

type ExerciseItem = { id: string; name: string };
type RowBounds = { y: number; height: number };
type Drag = {
  from: number;
  to: number;
  bounds: RowBounds[];
  startScroll: number;
  startPointer: number;
  delta: number;
};
type DragPreview = { from: number; to: number; offset: number; rowSpan: number };
const rowGap = 8;

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= items.length) return items;
  const updated = [...items];
  const [item] = updated.splice(from, 1);
  updated.splice(to, 0, item);
  return updated;
}

function ExerciseDragArea({
  children,
  onStart,
  onMove,
  onEnd,
}: {
  children: ReactNode;
  onStart: (locationY: number) => void;
  onMove: (delta: number) => void;
  onEnd: (commit: boolean) => void;
}) {
  // Keep the same responder as the surrounding rows move under the pointer.
  const handlers = useRef({ onStart, onMove, onEnd });
  const pointer = useRef<{ id: number; y: number } | null>(null);
  useLayoutEffect(() => {
    handlers.current = { onStart, onMove, onEnd };
  }, [onStart, onMove, onEnd]);
  const { panHandlers } = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => handlers.current.onStart(event.nativeEvent.locationY),
        onPanResponderMove: (_, gesture) => handlers.current.onMove(gesture.dy),
        onPanResponderRelease: () => handlers.current.onEnd(true),
        onPanResponderTerminate: () => handlers.current.onEnd(false),
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );
  // Capture the browser pointer so scrolling or crossing another row doesn't end a drag.
  function endPointer({ nativeEvent }: PointerEvent, commit: boolean) {
    if (pointer.current?.id !== nativeEvent.pointerId) return;
    if (commit) onMove(nativeEvent.clientY - pointer.current.y);
    pointer.current = null;
    onEnd(commit);
  }
  const browserHandlers = {
    onPointerDown: (event: PointerEvent) => {
      const { isPrimary, button, pointerId, clientY } = event.nativeEvent;
      if (!isPrimary || button !== 0) return;
      event.preventDefault();
      const handle = event.currentTarget as unknown as HTMLDivElement;
      handle.setPointerCapture(pointerId);
      pointer.current = { id: pointerId, y: clientY };
      onStart(clientY - handle.getBoundingClientRect().top);
    },
    onPointerMove: ({ nativeEvent }: PointerEvent) => {
      if (pointer.current?.id === nativeEvent.pointerId) onMove(nativeEvent.clientY - pointer.current.y);
    },
    onPointerUp: (event: PointerEvent) => endPointer(event, true),
    onPointerCancel: (event: PointerEvent) => endPointer(event, false),
  };
  const webStyle: (ViewStyle & { touchAction: 'none'; userSelect: 'none' }) | undefined =
    Platform.OS === 'web' ? { cursor: 'pointer', touchAction: 'none', userSelect: 'none' } : undefined;
  return (
    <View
      testID="exercise-drag-area"
      style={[{ flex: 1, alignSelf: 'stretch', justifyContent: 'center' }, webStyle]}
      {...(Platform.OS === 'web' ? browserHandlers : panHandlers)}
    >
      <View pointerEvents="none" style={[s.row, { flex: 1, gap: 6, paddingVertical: 4 }]}>
        <View style={{ width: 44, alignItems: 'center' }}>
          <Icon name="grip" size={22} color={c.blue} />
        </View>
        {children}
      </View>
    </View>
  );
}

export function ExerciseOrderEditor<T extends ExerciseItem>({
  exercises,
  onDone,
  onCancel,
}: {
  exercises: T[];
  onDone: (ordered: T[]) => void;
  onCancel: () => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 640;
  const [order, setOrder] = useState(exercises);
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const scrollView = useRef<ComponentRef<typeof ScrollView>>(null);
  const rowBounds = useRef(new Map<string, RowBounds>());
  const layout = useRef({ offset: 0, height: 0, contentHeight: 0 });
  const drag = useRef<Drag | null>(null);
  const isDragging = preview !== null;

  function startDrag(from: number, locationY: number) {
    const bounds = order.map((item) => rowBounds.current.get(item.id));
    if (!bounds.every((row): row is RowBounds => row !== undefined)) return;
    const startScroll = layout.current.offset;
    const row = bounds[from];
    drag.current = {
      from,
      to: from,
      bounds,
      startScroll,
      delta: 0,
      startPointer: row.y - startScroll + (Number.isFinite(locationY) ? locationY : row.height / 2),
    };
    setPreview({ from, to: from, offset: 0, rowSpan: row.height + rowGap });
  }

  function updateDrag(delta: number) {
    const current = drag.current;
    if (!current) return;
    current.delta = delta;
    const { from, bounds, startScroll } = current;
    const row = bounds[from];
    const last = bounds[bounds.length - 1];
    const distance = delta + layout.current.offset - startScroll;
    const offset = Math.max(
      bounds[0].y - row.y,
      Math.min(last.y + last.height - row.y - row.height, distance),
    );
    const center = row.y + row.height / 2 + distance;
    const midpoint = (i: number) => bounds[i].y + bounds[i].height / 2;
    let to = from;
    while (to + 1 < bounds.length && center >= midpoint(to + 1)) to++;
    while (to > 0 && center <= midpoint(to - 1)) to--;
    current.to = to;
    setPreview({ from, to, offset, rowSpan: row.height + rowGap });
  }

  function finishDrag(commit: boolean) {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    if (commit) setOrder((items) => moveItem(items, current.from, current.to));
    setPreview(null);
  }

  useEffect(() => {
    if (!isDragging) return;
    const timer = setInterval(() => {
      const current = drag.current;
      if (!current) return;
      const { offset, height, contentHeight } = layout.current;
      const edge = Math.min(56, height / 4);
      const pointer = current.startPointer + current.delta;
      const distance = pointer < edge ? pointer - edge : Math.max(0, pointer - (height - edge));
      const step = Math.max(-14, Math.min(14, distance / 4));
      const nextOffset = Math.max(0, Math.min(contentHeight - height, offset + step));
      if (Math.abs(nextOffset - offset) < 1) return;
      scrollView.current?.scrollTo({ y: nextOffset, animated: false });
    }, 16);
    return () => clearInterval(timer);
  }, [isDragging]);

  function offsetFor(index: number) {
    if (!preview) return 0;
    if (index === preview.from) return preview.offset;
    if (index > preview.from && index <= preview.to) return -preview.rowSpan;
    if (index < preview.from && index >= preview.to) return preview.rowSpan;
    return 0;
  }

  return (
    <Modal
      visible
      transparent={wide}
      animationType={Platform.OS === 'web' ? 'none' : 'slide'}
      onRequestClose={onCancel}
    >
      <SafeAreaProvider>
        <SafeAreaView
          accessibilityViewIsModal
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: wide ? 'rgba(17,27,53,0.5)' : c.white,
            padding: wide ? 24 : 0,
          }}
        >
          <View
            style={{
              flex: 1,
              width: '100%',
              maxWidth: 620,
              maxHeight: wide ? 740 : undefined,
              borderRadius: wide ? 18 : 0,
              overflow: 'hidden',
              backgroundColor: c.bg,
            }}
          >
            <View
              style={{
                padding: 16,
                paddingTop: wide ? 16 : 20,
                gap: 4,
                backgroundColor: c.white,
                borderBottomWidth: 1,
                borderColor: c.faint,
              }}
            >
              <Text accessibilityRole="header" style={s.title}>
                Exercise order
              </Text>
              <Text style={s.body}>Drag an exercise or tap the arrows to change the order.</Text>
            </View>
            <ScrollView
              ref={scrollView}
              scrollEnabled={!isDragging}
              scrollEventThrottle={16}
              onLayout={({ nativeEvent }) => {
                layout.current.height = nativeEvent.layout.height;
              }}
              onContentSizeChange={(_, height) => {
                layout.current.contentHeight = height;
              }}
              onScroll={({ nativeEvent }) => {
                layout.current.offset = nativeEvent.contentOffset.y;
                if (drag.current) updateDrag(drag.current.delta);
              }}
              contentContainerStyle={{ padding: 12, gap: rowGap }}
            >
              {order.map((item, index) => {
                const raised = preview?.from === index;
                return (
                  <View
                    key={item.id}
                    onLayout={({ nativeEvent }) => rowBounds.current.set(item.id, nativeEvent.layout)}
                    style={[
                      s.row,
                      {
                        gap: 6,
                        minHeight: 68,
                        paddingRight: 6,
                        backgroundColor: c.white,
                        borderWidth: 1,
                        borderRadius: 12,
                        borderColor: c.faint,
                        transform: [{ translateY: offsetFor(index) }],
                      },
                      raised && {
                        zIndex: 1,
                        elevation: 3,
                        borderColor: c.blue,
                        backgroundColor: c.pale,
                      },
                    ]}
                  >
                    <ExerciseDragArea
                      onStart={(y) => startDrag(index, y)}
                      onMove={updateDrag}
                      onEnd={finishDrag}
                    >
                      <ExercisePhoto id={catalogExerciseFor(item)?.id} width={44} height={43} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: c.mute }}>Position {index + 1}</Text>
                      </View>
                    </ExerciseDragArea>
                    {([-1, 1] as const).map((direction) => {
                      const next = index + direction;
                      const disabled = isDragging || next < 0 || next >= order.length;
                      return (
                        <Pressable
                          key={direction}
                          accessibilityRole="button"
                          accessibilityLabel={'Move ' + item.name + (direction < 0 ? ' up' : ' down')}
                          accessibilityState={{ disabled }}
                          disabled={disabled}
                          onPress={() => setOrder((items) => moveItem(items, index, next))}
                          style={({ pressed }) => [
                            {
                              minHeight: 44,
                              width: 34,
                              justifyContent: 'center',
                              alignItems: 'center',
                              borderRadius: 8,
                              backgroundColor: disabled ? c.bg : c.pale,
                              opacity: pressed ? 0.6 : 1,
                            },
                          ]}
                        >
                          <Icon
                            name={direction < 0 ? 'up' : 'down'}
                            size={16}
                            color={disabled ? c.mute : c.blue}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
            <View
              style={[
                s.row,
                {
                  justifyContent: 'flex-end',
                  paddingHorizontal: wide ? 12 : 18,
                  paddingTop: 12,
                  paddingBottom: wide ? 12 : 20,
                  gap: 16,
                  backgroundColor: c.white,
                  borderTopWidth: 1,
                  borderColor: c.faint,
                },
              ]}
            >
              <Link disabled={isDragging} onPress={onCancel}>
                Cancel
              </Link>
              <Button icon="check" disabled={isDragging} onPress={() => onDone(order)}>
                Done
              </Button>
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
