// frontend/store/notificationStore.ts

import { create } from 'zustand';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/api/notifications';
import type { Notification } from '@/lib/api/notifications';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: true,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const notifications = await getNotifications();
      set({
        notifications,
        unreadCount: notifications.filter(n => !n.isRead).length,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching notifications in store:', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      set(state => ({
        notifications: state.notifications.map(n =>
          n._id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
      await markNotificationAsRead(notificationId);
      // Optional: re-fetch to ensure sync with backend
      // get().fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read in store:', error);
      // Revert optimistic update on error
      get().fetchNotifications();
    }
  },
  
  markAllAsRead: async () => {
    try {
      set({ notifications: [], unreadCount: 0 });
      await markAllNotificationsAsRead();
    } catch (error) {
      console.error('Error marking all notifications as read in store:', error);
      get().fetchNotifications();
    }
  },
}));

export default useNotificationStore;