// src/features/admin/components/ReusableTable.tsx

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { TableColumn } from '../types';
import { createThemedStyles } from '../../../theme/themedStyles';

interface ReusableTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
}

export function ReusableTable<T>({ data, columns, keyExtractor, emptyMessage = 'No data found' }: ReusableTableProps<T>) {
  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  const renderHeaderCell = (col: TableColumn<T>, index: number) => {
    return React.createElement(
      Text,
      { key: index, style: [styles.headerCell, col.width ? { width: col.width } : styles.flex] },
      col.header
    );
  };

  const renderCell = (col: TableColumn<T>, item: T, index: number) => {
    const content = col.renderCell
      ? col.renderCell(item)
      : React.createElement(Text, { style: styles.cellText, numberOfLines: 1 }, String((item as any)[col.key as string] ?? '-'));

    return React.createElement(
      View,
      { key: index, style: [styles.cell, col.width ? { width: col.width } : styles.flex] },
      content
    );
  };

  const renderRow = (item: T) => {
    return React.createElement(
      View,
      { key: keyExtractor(item), style: styles.row },
      columns.map((col, index) => renderCell(col, item, index))
    );
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={styles.headerRow}>
          {columns.map((col, index) => renderHeaderCell(col, index))}
        </View>
        {data.map((item) => renderRow(item))}
      </View>
    </ScrollView>
  );
}

const styles = createThemedStyles({
  headerRow:  { flexDirection: 'row', backgroundColor: '#0F172A', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 4 },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', paddingRight: 12 },
  row:        { flexDirection: 'row', backgroundColor: '#1E293B', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, marginBottom: 4 },
  cell:       { paddingRight: 12, justifyContent: 'center' },
  cellText:   { fontSize: 13, color: '#F1F5F9' },
  flex:       { flex: 1 },
  empty:      { padding: 32, alignItems: 'center' },
  emptyText:  { color: '#64748B', fontSize: 14 },
});

export default ReusableTable;