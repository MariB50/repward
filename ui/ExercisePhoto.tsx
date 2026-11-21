import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { exerciseImages } from '../data/exerciseImages';
import { c, Icon } from './kit';

export function ExercisePhoto({
  id,
  width = 76,
  height = 64,
}: {
  id?: string;
  width?: number | '100%';
  height?: number;
}) {
  const source: ImageSourcePropType | undefined = id ? exerciseImages[id] : undefined;
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: c.faint,
        backgroundColor: source ? c.white : c.pale,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {source ? (
        <Image
          source={source}
          resizeMode="contain"
          accessible={false}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <Icon name="bar" color={c.blue} />
      )}
    </View>
  );
}
