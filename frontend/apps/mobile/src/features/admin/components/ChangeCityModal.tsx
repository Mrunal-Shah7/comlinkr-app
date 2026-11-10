// Plan 08 (TR-042): an admin sets a user's city by hand, overriding the one their phone's location gave them.
// The app is open in the United States and the United Kingdom, so the country is one of the two.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { InWindowModal } from '../../../shared/d/InWindowModal';
import { useTheme } from '../../../theme/useTheme';
import { adminSetUserLocation } from '../../../api/admin.api';
import { showToast } from '../../../shared/ui/Toast';
import { alertAdminApiError } from '../api/handleAdminError';

const COUNTRIES = [
  { name: 'United States', code: 'US', dial: '+1', region: 'State' },
  { name: 'United Kingdom', code: 'GB', dial: '+44', region: 'Region' },
] as const;

export function ChangeCityModal({ visible, userName, current, userId, onClose, onSaved }: {
  visible: boolean; userName: string; userId: string;
  current: { city?: string | null; state?: string | null; country?: string | null };
  onClose: () => void; onSaved: () => void;
}) {
  const { tc } = useTheme();
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>(COUNTRIES[0]);
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const cityRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setCountry(COUNTRIES.find((c) => c.name === current.country) ?? COUNTRIES[0]);
    setState(current.state ?? '');
    setCity(current.city ?? '');
  }, [visible, current.country, current.state, current.city]);

  const ready = city.trim().length > 1 && state.trim().length > 1 && !saving;
  const save = async () => {
    if (!ready) return;
    setSaving(true);
    try {
      await adminSetUserLocation(userId, {
        country: country.name, countryCode: country.code, dialCode: country.dial, state: state.trim(), city: city.trim(),
      });
      showToast(`${userName}'s city is now ${city.trim()}.`, 'success');
      onSaved();
      onClose();
    } catch (e) {
      alertAdminApiError(e, 'Could not change the city');
    } finally {
      setSaving(false);
    }
  };

  const input = [s.input, { backgroundColor: tc.inputBg, color: tc.textPrimary, borderColor: tc.borderLight }];
  return (
    <InWindowModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[s.backdrop, { backgroundColor: tc.overlay }]} onPress={onClose} accessible={false}>
        <Pressable style={[s.card, { backgroundColor: tc.sheetBg, borderColor: tc.borderLight }]} onPress={() => {}} accessibilityViewIsModal>
          <Text style={[s.title, { color: tc.textPrimary }]} accessibilityRole="header">Change city</Text>
          <Text style={[s.sub, { color: tc.textSecondary }]}>
            Overrides the city {userName}&apos;s location gave them. They can update it from their location again later.
          </Text>
          <View style={s.row}>
            {COUNTRIES.map((c) => {
              const on = c.code === country.code;
              return (
                <Pressable key={c.code} onPress={() => setCountry(c)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                  style={[s.chip, { borderColor: on ? tc.accent : tc.borderLight, backgroundColor: on ? tc.accentSoft : 'transparent' }]}>
                  <Text style={{ color: on ? tc.accentText : tc.textPrimary, fontWeight: '700' }}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[s.label, { color: tc.textSecondary }]}>{country.region}</Text>
          <TextInput style={input} value={state} onChangeText={setState} returnKeyType="next" onSubmitEditing={() => cityRef.current?.focus()} submitBehavior="submit" placeholder={country.code === 'US' ? 'California' : 'England'} placeholderTextColor={tc.textTertiary} />
          <Text style={[s.label, { color: tc.textSecondary }]}>City</Text>
          <TextInput ref={cityRef} style={input} value={city} onChangeText={setCity} returnKeyType="done" onSubmitEditing={() => void save()} placeholder={country.code === 'US' ? 'Los Angeles' : 'London'} placeholderTextColor={tc.textTertiary} />
          <View style={[s.row, { marginTop: 18 }]}>
            <Pressable onPress={onClose} style={[s.btn, { backgroundColor: tc.inputBg }]} accessibilityRole="button">
              <Text style={{ color: tc.textPrimary, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => void save()} disabled={!ready} style={[s.btn, { backgroundColor: tc.accent, opacity: ready ? 1 : 0.5 }]} accessibilityRole="button">
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </InWindowModal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { borderRadius: 24, borderWidth: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  btn: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
});
