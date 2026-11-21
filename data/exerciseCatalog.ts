export const equipmentFilters = [
  'Machine',
  'Cable',
  'Barbell',
  'Dumbbell',
  'Bodyweight',
  'Kettlebell',
] as const;
export type Equipment = (typeof equipmentFilters)[number];

export type CatalogExercise = {
  id: string;
  name: string;
  equipment: Equipment;
  muscle: string;
  aliases: string[];
};

export const exerciseCatalog: readonly CatalogExercise[] = [
  {
    id: 'bench-press',
    name: 'Barbell bench press',
    equipment: 'Barbell',
    muscle: 'Chest',
    aliases: ['bench press', 'flat bench', 'flat barbell bench press'],
  },
  {
    id: 'seated-row',
    name: 'Seated cable row',
    equipment: 'Cable',
    muscle: 'Back',
    aliases: ['seated row', 'low row', 'cable row', 'low pulley row'],
  },
  {
    id: 'leg-press',
    name: 'Leg press',
    equipment: 'Machine',
    muscle: 'Legs',
    aliases: ['leg press machine', 'sled press', '45 degree leg press'],
  },
  {
    id: 'barbell-squat',
    name: 'Barbell back squat',
    equipment: 'Barbell',
    muscle: 'Legs',
    aliases: ['squat', 'back squat', 'barbell squat', 'barbell full squat'],
  },
  {
    id: 'lat-pulldown',
    name: 'Close-grip lat pulldown',
    equipment: 'Cable',
    muscle: 'Back',
    aliases: [
      'lat pull down',
      'lat pulldown',
      'lat pull',
      'pulldown',
      'close grip lat pull down',
      'narrow grip pulldown',
    ],
  },
  {
    id: 'dumbbell-bench-press',
    name: 'Dumbbell bench press',
    equipment: 'Dumbbell',
    muscle: 'Chest',
    aliases: ['flat dumbbell press', 'db bench press'],
  },
  {
    id: 'leg-extension',
    name: 'Leg extension',
    equipment: 'Machine',
    muscle: 'Legs',
    aliases: ['leg extensions', 'leg extension machine', 'quad extension'],
  },
  {
    id: 'barbell-deadlift',
    name: 'Barbell deadlift',
    equipment: 'Barbell',
    muscle: 'Back',
    aliases: ['deadlift', 'deadlifts', 'conventional deadlift'],
  },
  {
    id: 'chest-press-machine',
    name: 'Machine chest press',
    equipment: 'Machine',
    muscle: 'Chest',
    aliases: ['chest press', 'chest press machine', 'seated chest press'],
  },
  {
    id: 'dumbbell-shoulder-press',
    name: 'Dumbbell shoulder press',
    equipment: 'Dumbbell',
    muscle: 'Shoulders',
    aliases: ['db press', 'dumbbell overhead press', 'seated dumbbell press'],
  },
  {
    id: 'seated-leg-curl',
    name: 'Seated leg curl',
    equipment: 'Machine',
    muscle: 'Legs',
    aliases: ['hamstring curl', 'seated hamstring curl', 'seated leg curl machine', 'leg curl'],
  },
  {
    id: 'machine-row',
    name: 'Machine seated row',
    equipment: 'Machine',
    muscle: 'Back',
    aliases: ['seated row machine', 'machine row', 'chest supported machine row'],
  },
  {
    id: 'dumbbell-lateral-raise',
    name: 'Dumbbell lateral raise',
    equipment: 'Dumbbell',
    muscle: 'Shoulders',
    aliases: ['lateral raise', 'side raise', 'dumbbell side raise'],
  },
  {
    id: 'machine-shoulder-press',
    name: 'Machine shoulder press',
    equipment: 'Machine',
    muscle: 'Shoulders',
    aliases: ['shoulder press machine', 'seated overhead machine press'],
  },
  {
    id: 'triceps-pushdown',
    name: 'Cable triceps pushdown',
    equipment: 'Cable',
    muscle: 'Arms',
    aliases: ['tricep pushdown', 'triceps pushdown', 'pressdown', 'cable pushdown'],
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline dumbbell press',
    equipment: 'Dumbbell',
    muscle: 'Chest',
    aliases: ['incline bench press dumbbell', 'incline db bench'],
  },
  {
    id: 'incline-barbell-press',
    name: 'Incline barbell bench press',
    equipment: 'Barbell',
    muscle: 'Chest',
    aliases: ['incline bench press', 'incline barbell press'],
  },
  {
    id: 'barbell-row',
    name: 'Bent-over barbell row',
    equipment: 'Barbell',
    muscle: 'Back',
    aliases: ['barbell row', 'bent over row', 'barbell bent over row'],
  },
  {
    id: 'goblet-squat',
    name: 'Dumbbell goblet squat',
    equipment: 'Dumbbell',
    muscle: 'Legs',
    aliases: ['goblet squat', 'db squat'],
  },
  {
    id: 'lying-leg-curl',
    name: 'Lying leg curl',
    equipment: 'Machine',
    muscle: 'Legs',
    aliases: ['prone leg curl', 'lying hamstring curl'],
  },
  {
    id: 'hip-abduction',
    name: 'Hip abduction machine',
    equipment: 'Machine',
    muscle: 'Legs',
    aliases: ['hip abductor', 'outer thighs', 'abductor machine', 'seated abduction'],
  },
  {
    id: 'hip-adduction',
    name: 'Hip adduction machine',
    equipment: 'Machine',
    muscle: 'Legs',
    aliases: ['hip adductor', 'inner thighs', 'adductor machine', 'seated adduction'],
  },
  {
    id: 'pec-deck',
    name: 'Pec deck fly',
    equipment: 'Machine',
    muscle: 'Chest',
    aliases: ['pec deck', 'peck deck', 'butterfly', 'machine chest fly'],
  },
  {
    id: 'one-arm-dumbbell-row',
    name: 'Single-arm dumbbell row',
    equipment: 'Dumbbell',
    muscle: 'Back',
    aliases: ['one arm dumbbell row', 'dumbbell row', 'db row'],
  },
  {
    id: 'barbell-overhead-press',
    name: 'Barbell overhead press',
    equipment: 'Barbell',
    muscle: 'Shoulders',
    aliases: ['overhead press', 'military press', 'ohp', 'barbell shoulder press'],
  },
  {
    id: 'barbell-front-squat',
    name: 'Barbell front squat',
    equipment: 'Barbell',
    muscle: 'Legs',
    aliases: ['front squat'],
  },
  {
    id: 'dumbbell-rdl',
    name: 'Dumbbell Romanian deadlift',
    equipment: 'Dumbbell',
    muscle: 'Legs',
    aliases: ['rdl', 'db rdl', 'romanian deadlift'],
  },
  {
    id: 'dumbbell-split-squat',
    name: 'Dumbbell Bulgarian split squat',
    equipment: 'Dumbbell',
    muscle: 'Legs',
    aliases: ['bulgarian split squat', 'rear foot elevated split squat', 'rfess'],
  },
  {
    id: 'dumbbell-walking-lunge',
    name: 'Dumbbell walking lunge',
    equipment: 'Dumbbell',
    muscle: 'Legs',
    aliases: ['walking lunge', 'dumbbell lunge'],
  },
  {
    id: 'dumbbell-hip-thrust',
    name: 'Dumbbell hip thrust',
    equipment: 'Dumbbell',
    muscle: 'Legs',
    aliases: ['db hip thrust', 'hip thrust'],
  },
  {
    id: 'dumbbell-calf-raise',
    name: 'Standing dumbbell calf raise',
    equipment: 'Dumbbell',
    muscle: 'Legs',
    aliases: ['calf raise', 'db calf raise', 'standing calf raise'],
  },
  {
    id: 'smith-squat',
    name: 'Smith machine squat',
    equipment: 'Machine',
    muscle: 'Legs',
    aliases: ['smith squat', 'smith bar squat'],
  },
  {
    id: 'dumbbell-curl',
    name: 'Dumbbell biceps curl',
    equipment: 'Dumbbell',
    muscle: 'Arms',
    aliases: ['dumbbell curl', 'bicep curl', 'db curl'],
  },
  {
    id: 'barbell-curl',
    name: 'Barbell biceps curl',
    equipment: 'Barbell',
    muscle: 'Arms',
    aliases: ['barbell curl', 'bicep curl'],
  },
  {
    id: 'hammer-curl',
    name: 'Dumbbell hammer curl',
    equipment: 'Dumbbell',
    muscle: 'Arms',
    aliases: ['hammer curl', 'neutral grip curl'],
  },
  {
    id: 'preacher-curl',
    name: 'EZ-bar preacher curl',
    equipment: 'Barbell',
    muscle: 'Arms',
    aliases: ['preacher curl', 'ez curl', 'ez bar'],
  },
  {
    id: 'rope-pushdown',
    name: 'Rope triceps pushdown',
    equipment: 'Cable',
    muscle: 'Arms',
    aliases: ['rope pushdown', 'triceps rope extension', 'tricep pushdowns', 'pressdown'],
  },
  {
    id: 'cable-crossover',
    name: 'Cable crossover',
    equipment: 'Cable',
    muscle: 'Chest',
    aliases: ['cable fly', 'cable flye', 'crossover', 'chest fly'],
  },
  {
    id: 'cable-front-raise',
    name: 'Cable front raise',
    equipment: 'Cable',
    muscle: 'Shoulders',
    aliases: ['front cable raise', 'low pulley front raise'],
  },
  {
    id: 'straight-arm-pulldown',
    name: 'Straight-arm cable pulldown',
    equipment: 'Cable',
    muscle: 'Back',
    aliases: ['straight arm pulldown', 'cable pullover'],
  },
  {
    id: 'pallof-press',
    name: 'Pallof press',
    equipment: 'Cable',
    muscle: 'Core',
    aliases: ['cable anti rotation press', 'cable core'],
  },
  {
    id: 'back-extension',
    name: 'Back extension',
    equipment: 'Machine',
    muscle: 'Back',
    aliases: ['hyperextension', 'roman chair', 'back raise'],
  },
  {
    id: 'pull-up',
    name: 'Pull-up',
    equipment: 'Bodyweight',
    muscle: 'Back',
    aliases: ['pull ups', 'pullups', 'pullup', 'pull up'],
  },
  {
    id: 'chin-up',
    name: 'Chin-up',
    equipment: 'Bodyweight',
    muscle: 'Back',
    aliases: ['chinup', 'chin ups', 'chinups'],
  },
  {
    id: 'push-up',
    name: 'Close-grip push-up',
    equipment: 'Bodyweight',
    muscle: 'Chest',
    aliases: ['pushups', 'push ups', 'press up', 'pushup'],
  },
  {
    id: 'dip',
    name: 'Parallel-bar dip',
    equipment: 'Bodyweight',
    muscle: 'Arms',
    aliases: ['dip', 'dips', 'chest dip', 'triceps dip'],
  },
  {
    id: 'plank',
    name: 'Plank',
    equipment: 'Bodyweight',
    muscle: 'Core',
    aliases: ['front plank', 'forearm plank'],
  },
  {
    id: 'lying-leg-raise',
    name: 'Lying leg raise',
    equipment: 'Bodyweight',
    muscle: 'Core',
    aliases: ['leg raise', 'lying leg lifts'],
  },
  {
    id: 'kettlebell-swing',
    name: 'Kettlebell swing',
    equipment: 'Kettlebell',
    muscle: 'Legs',
    aliases: ['kb swing', 'two handed swing'],
  },
  {
    id: 'cable-curl',
    name: 'Cable biceps curl',
    equipment: 'Cable',
    muscle: 'Arms',
    aliases: ['cable curl', 'cable bicep curl'],
  },
  {
    id: 'machine-lateral-raise',
    name: 'Machine lateral raise',
    equipment: 'Machine',
    muscle: 'Shoulders',
    aliases: ['side raise machine', 'lateral raise machine'],
  },
  {
    id: 't-bar-row',
    name: 'T-bar row',
    equipment: 'Machine',
    muscle: 'Back',
    aliases: ['t bar row', 'tbar row'],
  },
  {
    id: 'cable-rear-delt-fly',
    name: 'Cable rear delt fly',
    equipment: 'Cable',
    muscle: 'Shoulders',
    aliases: ['rear delt cable fly', 'reverse cable fly'],
  },
];

export function exerciseNameKey(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const byId = new Map(exerciseCatalog.map((item) => [item.id, item]));
const byName = new Map(exerciseCatalog.map((item) => [exerciseNameKey(item.name), item]));

export function catalogExerciseFor(exercise: { id: string; name: string }) {
  return byId.get(exercise.id) ?? byName.get(exerciseNameKey(exercise.name));
}

const searchable = exerciseCatalog.map((item) => ({
  item,
  name: exerciseNameKey(item.name),
  aliases: item.aliases.map(exerciseNameKey),
  text: exerciseNameKey([item.name, item.equipment, item.muscle, ...item.aliases].join(' ')),
}));

export function searchExercises(query: string, equipment?: Equipment): CatalogExercise[] {
  const normalized = exerciseNameKey(query);
  const terms = normalized ? normalized.split(' ') : [];
  return searchable
    .filter(
      ({ item, text }) =>
        (!equipment || item.equipment === equipment) && terms.every((term) => text.includes(term)),
    )
    .map(({ item, name, aliases }) => ({
      item,
      rank:
        name === normalized ? 0 : aliases.includes(normalized) ? 1 : name.startsWith(normalized) ? 2 : 3,
    }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item);
}
