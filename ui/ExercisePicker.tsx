import { useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import imageCredits from '../assets/exercises/credits.json';
import {
  equipmentFilters,
  exerciseNameKey,
  searchExercises,
  type CatalogExercise,
  type Equipment,
} from '../data/exerciseCatalog';
import { ExercisePhoto } from './ExercisePhoto';
import { Button, c, Icon, Link, s } from './kit';

export function ExercisePicker({
  selectedIds,
  selectedNames,
  onAdd,
  onCustom,
  onClose,
}: {
  selectedIds: Set<string>;
  selectedNames: Set<string>;
  onAdd: (exercise: CatalogExercise) => void;
  onCustom: (name: string) => void;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 680;
  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState<Equipment>();
  const [preview, setPreview] = useState<CatalogExercise>();
  const credit = preview
    ? (
        imageCredits as Record<
          string,
          { author: string; source: string; license: string; licenseUrl: string }
        >
      )[preview.id]
    : undefined;
  const results = useMemo(() => searchExercises(query, equipment), [query, equipment]);
  const name = query.trim();
  const key = exerciseNameKey(name);
  const exact = searchExercises(query).some((item) => exerciseNameKey(item.name) === key);
  const canAddCustom = !!key && !exact && !selectedNames.has(key);
  const close = () => {
    Keyboard.dismiss();
    onClose();
  };
  const add = (item: CatalogExercise) => {
    onAdd(item);
    setPreview(undefined);
  };

  function card(item: CatalogExercise) {
    const added = selectedIds.has(item.id);
    return (
      <View style={[s.card, s.row, { padding: 8, gap: 11, minHeight: 86 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={'Preview picture of ' + item.name}
          onPress={() => {
            Keyboard.dismiss();
            setPreview(item);
          }}
        >
          <ExercisePhoto id={item.id} width={84} height={67} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={(added ? 'Added ' : 'Add ') + item.name}
          accessibilityState={{ disabled: added }}
          disabled={added}
          onPress={() => add(item)}
          style={({ pressed }) => [s.row, { flex: 1, minHeight: 64, opacity: pressed ? 0.65 : 1 }]}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>{item.name}</Text>
            <Text style={{ fontSize: 12, color: c.mute }}>
              {item.equipment} · {item.muscle}
            </Text>
          </View>
          <View style={[s.tile, { width: 32, height: 32, borderRadius: 8 }]}>
            <Icon name={added ? 'check' : 'plus'} size={18} color={added ? c.green : c.blue} />
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <Modal
      visible
      transparent={wide}
      animationType={Platform.OS === 'web' ? 'none' : 'slide'}
      onRequestClose={preview ? () => setPreview(undefined) : close}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: wide ? 'rgba(17,27,53,0.5)' : c.bg }}
        accessibilityViewIsModal
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: wide ? 24 : 0 }}
        >
          <View
            style={{
              backgroundColor: c.bg,
              borderRadius: wide ? 20 : 0,
              flex: 1,
              width: '100%',
              maxWidth: 760,
              maxHeight: wide ? 810 : undefined,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                padding: 16,
                gap: 12,
                backgroundColor: c.white,
                borderBottomWidth: 1,
                borderColor: c.faint,
              }}
            >
              <View style={s.between}>
                <Text accessibilityRole="header" style={s.title}>
                  {preview ? 'Exercise picture' : 'Find an exercise'}
                </Text>
                <Button secondary onPress={close}>
                  Done
                </Button>
              </View>
              {!preview && (
                <>
                  <View style={[s.row, s.input, { gap: 8, backgroundColor: c.bg }]}>
                    <Icon name="search" size={18} color={c.mute} />
                    <TextInput
                      accessibilityLabel="Search exercises"
                      placeholder="Search by exercise name"
                      placeholderTextColor={c.mute}
                      autoCorrect={false}
                      value={query}
                      onChangeText={setQuery}
                      returnKeyType="search"
                      style={{ flex: 1, color: c.ink, fontSize: 16, minHeight: 46 }}
                    />
                    {!!query && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Clear search"
                        onPress={() => setQuery('')}
                        hitSlop={8}
                      >
                        <Icon name="close" size={16} color={c.mute} />
                      </Pressable>
                    )}
                  </View>
                  <ScrollView
                    horizontal
                    keyboardShouldPersistTaps="handled"
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 7 }}
                  >
                    {[undefined, ...equipmentFilters].map((filter) => (
                      <Pressable
                        key={filter ?? 'all'}
                        accessibilityRole="button"
                        accessibilityState={{ selected: equipment === filter }}
                        onPress={() => setEquipment(filter)}
                        style={{
                          minHeight: 42,
                          justifyContent: 'center',
                          borderRadius: 9,
                          borderWidth: 1,
                          borderColor: equipment === filter ? '#A6B6FF' : c.faint,
                          paddingHorizontal: 12,
                          backgroundColor: equipment === filter ? c.pale : c.white,
                        }}
                      >
                        <Text
                          style={{
                            color: equipment === filter ? c.blue : c.mute,
                            fontSize: 13,
                            fontWeight: '700',
                          }}
                        >
                          {filter ?? 'All equipment'}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
            {preview ? (
              <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
                <Link icon="back" onPress={() => setPreview(undefined)}>
                  Search results
                </Link>
                <Text style={s.title}>{preview.name}</Text>
                <Text style={s.body}>
                  {preview.equipment} · {preview.muscle}
                </Text>
                <ExercisePhoto id={preview.id} width="100%" height={250} />
                {credit && (
                  <Text style={[s.body, { fontSize: 12 }]}>
                    Image by{' '}
                    <Text
                      accessibilityRole="link"
                      style={s.link}
                      onPress={() => {
                        void Linking.openURL(credit.source).catch(() => undefined);
                      }}
                    >
                      {credit.author}
                    </Text>
                    {' · '}
                    <Text
                      accessibilityRole="link"
                      style={s.link}
                      onPress={() => {
                        void Linking.openURL(credit.licenseUrl).catch(() => undefined);
                      }}
                    >
                      {credit.license}
                    </Text>
                  </Text>
                )}
                <Button icon="plus" disabled={selectedIds.has(preview.id)} onPress={() => add(preview)}>
                  {selectedIds.has(preview.id) ? 'Already added' : 'Add to workout'}
                </Button>
              </ScrollView>
            ) : (
              <FlatList
                key={wide ? 'two-columns' : 'one-column'}
                data={results}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={{ flex: 1, maxWidth: wide ? '50%' : '100%' }}>{card(item)}</View>
                )}
                numColumns={wide ? 2 : 1}
                columnWrapperStyle={wide ? { gap: 10 } : undefined}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
                ListHeaderComponent={
                  <View style={{ marginBottom: 10 }}>
                    <Text style={s.body} accessibilityLiveRegion="polite">
                      {results.length} {results.length === 1 ? 'exercise' : 'exercises'}
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  <View style={{ marginTop: 8, gap: 8 }}>
                    {canAddCustom && (
                      <Link
                        icon="plus"
                        onPress={() => {
                          Keyboard.dismiss();
                          onCustom(name);
                        }}
                      >
                        Add “{name}” as a custom exercise
                      </Link>
                    )}
                    {!results.length && (
                      <Text style={s.body}>
                        No exercises found. Try another name or equipment filter.
                      </Text>
                    )}
                  </View>
                }
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
