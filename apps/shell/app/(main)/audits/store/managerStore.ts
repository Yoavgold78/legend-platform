// frontend/store/managerStore.ts
import { create } from 'zustand';

interface ManagerState {
  selectedStoreId: string; // 'all' or a specific store ID
  setSelectedStoreId: (storeId: string) => void;
}

const useManagerStore = create<ManagerState>((set) => ({
  selectedStoreId: 'all', // Default view is all stores
  setSelectedStoreId: (storeId) => set({ selectedStoreId: storeId }),
}));

export default useManagerStore;