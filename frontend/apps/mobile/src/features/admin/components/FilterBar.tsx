// src/features/admin/components/FilterBar.tsx

import { palette } from "../../../theme/palette";
import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@theme/colors';
import { FilterOption } from '../types';
import { createThemedStyles } from '../../../theme/themedStyles';

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (text: string) => void;
  filters?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  placeholder?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue, onSearchChange, filters, activeFilter, onFilterChange, placeholder = 'Search...',
}) => (
  <View style={s.container}>
    <View style={s.searchRow}>
      <View style={s.searchIconWrap}>
        <Ionicons name="search" size={15} color={Colors.brand.blue} />
      </View>
      <TextInput
        style={s.input}
        value={searchValue}
        onChangeText={onSearchChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.tertiary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {searchValue.length > 0 && (
        <Pressable onPress={() => onSearchChange('')} hitSlop={10} style={s.clearBtn}>
          <Ionicons name="close-circle" size={17} color={Colors.text.tertiary} />
        </Pressable>
      )}
    </View>

    {filters && filters.length > 0 && (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 7, paddingRight: 4 }}
      >
        {filters.map((f) => {
          const isActive = activeFilter === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => onFilterChange?.(f.value)}
              style={({ pressed }) => [s.chip, isActive && s.chipActive, pressed && s.chipPressed]}
            >
              {isActive && <View style={s.activeDot} />}
              <Text style={[s.chipText, isActive && s.chipTextActive]}>{f.label}</Text>
              {f.count !== undefined && (
                <View style={[s.countBadge, isActive && s.countBadgeActive]}>
                  <Text style={[s.countText, isActive && s.countTextActive]}>{f.count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    )}
  </View>
);

const s = createThemedStyles({
  container:       { marginBottom: 16 },
  searchRow:       {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.white,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 10,
  },
  searchIconWrap:  { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.brand.blueLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  input:           { flex: 1, color: Colors.text.primary, fontSize: 14, fontWeight: '500', padding: 0 },
  clearBtn:        { padding: 2 },
  chip:            {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  chipActive:        { backgroundColor: Colors.brand.blue, borderColor: Colors.brand.blue },
  chipPressed:       { opacity: 0.82 },
  activeDot:         { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)' },
  chipText:          { fontSize: 12, color: Colors.text.secondary, fontWeight: '700' },
  chipTextActive:    { color: palette.white, fontWeight: '800' },
  countBadge:        { backgroundColor: palette.neutralL94_4, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  countBadgeActive:  { backgroundColor: 'rgba(255,255,255,0.25)' },
  countText:         { fontSize: 10, fontWeight: '800', color: Colors.text.secondary },
  countTextActive:   { color: palette.white },
});

export default FilterBar;
