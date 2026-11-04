// src/store/admin/adminStore.ts

import { create } from 'zustand';
import { AdminStats } from '@shared/types/api';

interface AdminState {
  stats: AdminStats | null;
  isStatsLoading: boolean;
  selectedTab: string;
  filterQuery: string;
  currentPage: number;

  setStats: (stats: AdminStats) => void;
  setSelectedTab: (tab: string) => void;
  setFilterQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  reset: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  stats: null,
  isStatsLoading: false,
  selectedTab: 'dashboard',
  filterQuery: '',
  currentPage: 1,

  setStats:        (stats)   => set({ stats }),
  setSelectedTab:  (tab)     => set({ selectedTab: tab, currentPage: 1 }),
  setFilterQuery:  (query)   => set({ filterQuery: query, currentPage: 1 }),
  setCurrentPage:  (page)    => set({ currentPage: page }),
  reset:           ()        => set({ stats: null, selectedTab: 'dashboard', filterQuery: '', currentPage: 1 }),
}));