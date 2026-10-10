import { StyleSheet } from 'react-native';

export const colors = {
  background: '#FFF8F1',
  surface: '#FFFFFF',
  primary: '#C2410C',
  primaryText: '#FFFFFF',
  text: '#1F1A17',
  muted: '#78716C',
  border: '#E7DED6',
  error: '#B91C1C',
  errorBackground: '#FEF2F2',
  success: '#15803D',
  successBackground: '#F0FDF4',
};

export const common = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  hint: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonText: { color: colors.primaryText, fontSize: 16, fontWeight: '600' },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonSecondaryText: { color: colors.primary },
  buttonDisabled: { opacity: 0.5 },
  error: {
    color: colors.error,
    backgroundColor: colors.errorBackground,
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
  },
  success: {
    color: colors.success,
    backgroundColor: colors.successBackground,
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
  },
});
