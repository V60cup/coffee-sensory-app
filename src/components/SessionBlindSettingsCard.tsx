// src/components/SessionBlindSettingsCard.tsx

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TastingSession } from '../types/domain';
import { updateSessionBlindSettings } from '../services/sessionService';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from './ui/Card';

interface Props {
  session: TastingSession;
}

export function SessionBlindSettingsCard({ session }: Props) {
  const { theme, mode } = useTheme();

  const isDark = mode === 'dark';

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBackground = isDark ? '#E7D0B5' : '#D8BFA2';
  const selectedText = '#1F1712';

  async function updateSettings(nextValues: {
    isBlind: boolean;
    hideNamesFromMaster: boolean;
  }) {
    setSaving(true);
    setError(null);

    try {
      await updateSessionBlindSettings({
        sessionId: session.id,
        ...nextValues,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar el modo ciego.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleBlindMode() {
    const nextIsBlind = !session.isBlind;

    await updateSettings({
      isBlind: nextIsBlind,
      hideNamesFromMaster: nextIsBlind
        ? !!session.hideNamesFromMaster
        : false,
    });
  }

  async function toggleHideFromMaster() {
    if (!session.isBlind) return;

    await updateSettings({
      isBlind: true,
      hideNamesFromMaster: !session.hideNamesFromMaster,
    });
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Modo ciego
          </Text>

          <Text style={[styles.description, { color: theme.colors.textMuted }]}>
            Oculta los nombres reales de las muestras durante la cata. Los
            catadores verán solo códigos.
          </Text>
        </View>

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: session.isBlind
                ? selectedBackground
                : theme.colors.surfaceAlt,
              borderColor: session.isBlind
                ? selectedBackground
                : theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              {
                color: session.isBlind ? selectedText : theme.colors.textMuted,
              },
            ]}
          >
            {session.isBlind ? 'Activo' : 'Inactivo'}
          </Text>
        </View>
      </View>

      <View style={styles.options}>
        <SettingRow
          title="Modo ciego para catadores"
          description="Los catadores verán Muestra #123 en lugar del nombre real del café."
          active={session.isBlind}
          disabled={saving}
          onPress={toggleBlindMode}
        />

        <SettingRow
          title="Ocultar nombres también para mí"
          description="Útil si el master también quiere catar sin ver la identidad de las muestras."
          active={!!session.hideNamesFromMaster}
          disabled={saving || !session.isBlind}
          onPress={toggleHideFromMaster}
        />
      </View>

      <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
        {session.isBlind
          ? session.hideNamesFromMaster
            ? 'Todos verán solo códigos de muestra.'
            : 'Los catadores verán códigos. El master seguirá viendo nombres.'
          : 'Los nombres reales de los cafés son visibles.'}
      </Text>

      {saving && (
        <Text style={[styles.savingText, { color: theme.colors.textMuted }]}>
          Guardando configuración...
        </Text>
      )}

      {error && (
        <Text style={[styles.errorText, { color: theme.colors.danger }]}>
          {error}
        </Text>
      )}
    </Card>
  );
}

function SettingRow({
  title,
  description,
  active,
  disabled,
  onPress,
}: {
  title: string;
  description: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { theme, mode } = useTheme();

  const isDark = mode === 'dark';

  const activeTrack = isDark ? '#E7D0B5' : theme.colors.primary;
  const inactiveTrack = isDark ? '#302A25' : '#E9DED2';
  const knobColor = active ? '#1F1712' : isDark ? '#F7EEE6' : '#3A2D25';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.settingRow,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceAlt,
          opacity: disabled ? 0.48 : pressed ? 0.78 : 1,
        },
      ]}
    >
      <View style={styles.settingTextBlock}>
        <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
          {title}
        </Text>

        <Text
          style={[
            styles.settingDescription,
            {
              color: theme.colors.textMuted,
            },
          ]}
        >
          {description}
        </Text>
      </View>

      <View
        style={[
          styles.switchTrack,
          {
            backgroundColor: active ? activeTrack : inactiveTrack,
            borderColor: active ? activeTrack : theme.colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.switchKnob,
            {
              alignSelf: active ? 'flex-end' : 'flex-start',
              backgroundColor: knobColor,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  options: {
    gap: 8,
  },
  settingRow: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 3,
  },
  settingDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
  switchTrack: {
    width: 50,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    justifyContent: 'center',
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  savingText: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
});