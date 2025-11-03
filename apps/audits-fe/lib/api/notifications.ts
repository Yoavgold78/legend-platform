// frontend/lib/api/notifications.ts

import axios from '../axios';

export interface Notification {
  _id: string;
  user: string;
  message: string;
  type: 'NEW_INSPECTION' | 'NEW_TASK' | 'TASK_COMPLETED' | 'TASK_DUE_SOON' | 'TASK_EXPIRED' | 'CHECKLIST_COMPLETED';
  relatedItem: {
    kind: 'Inspection' | 'Task' | 'ChecklistInstance';
    item: string;
  };
  isRead: boolean;
  createdAt: string;
}

/**
 * Fetches unread notifications for the current user.
 */
export const getNotifications = async (): Promise<Notification[]> => {
  try {
    const response = await axios.get<{ data: Notification[] }>('/notifications');
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    throw new Error('Failed to fetch notifications');
  }
};

/**
 * Marks a single notification as read.
 * @param notificationId - The ID of the notification to mark as read.
 */
export const markNotificationAsRead = async (notificationId: string): Promise<Notification> => {
  try {
    const response = await axios.put<Notification>(`/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error(`Failed to mark notification ${notificationId} as read:`, error);
    throw new Error('Failed to update notification');
  }
};

/**
 * Marks all unread notifications as read for the current user.
 */
export const markAllNotificationsAsRead = async (): Promise<{ success: boolean }> => {
  try {
    const response = await axios.put<{ success: boolean }>('/notifications/read-all');
    return response.data;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw new Error('Failed to update notifications');
  }
};