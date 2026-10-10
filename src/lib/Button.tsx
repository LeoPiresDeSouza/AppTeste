import { ActivityIndicator, Pressable, Text } from 'react-native';

import { colors, common } from './theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading }: Props) {
  const secondary = variant === 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        common.button,
        secondary && common.buttonSecondary,
        (disabled || loading) && common.buttonDisabled,
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.primary : colors.primaryText} />
      ) : (
        <Text style={[common.buttonText, secondary && common.buttonSecondaryText]}>{title}</Text>
      )}
    </Pressable>
  );
}
