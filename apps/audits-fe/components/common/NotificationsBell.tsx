// frontend/components/common/NotificationsBell.tsx

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  Box,
  Button,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MarkChatReadIcon from '@mui/icons-material/MarkChatRead';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import useNotificationStore from '@/store/notificationStore';
import type { Notification } from '@/lib/api/notifications';

// Function to get the correct link for a notification
const getLinkForNotification = (notification: Notification): string => {
  const { kind, item } = notification.relatedItem;
  switch (kind) {
    case 'Inspection':
      return `/inspection/results/${item}`;
    case 'Task':
      // Assuming you have a page to view a specific task, or a tasks page that can highlight a task
      return `/manager/tasks?taskId=${item}`;
    case 'ChecklistInstance':
      // Link to the page where a manager can see completed checklists
      return `/manager/checklists/history?instanceId=${item}`;
    default:
      return '#';
  }
};

export default function NotificationsBell() {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    const link = getLinkForNotification(notification);
    router.push(link);
    handleClose();
  };

  const handleMarkAll = () => {
    markAllAsRead();
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notifications-popover' : undefined;

  return (
    <>
      <Tooltip title="התראות">
        <IconButton
          aria-describedby={id}
          color="inherit"
          onClick={handleClick}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 360, maxWidth: '90vw' },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">התראות</Typography>
          {notifications.length > 0 && (
            <Button
              size="small"
              onClick={handleMarkAll}
              startIcon={<MarkChatReadIcon />}
            >
              סמן הכל כנקרא
            </Button>
          )}
        </Box>
        <Divider />
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <Typography sx={{ p: 2, color: 'text.secondary' }}>
            אין התראות חדשות.
          </Typography>
        ) : (
          <List sx={{ p: 0, maxHeight: 400, overflow: 'auto' }}>
            {notifications.map((notification) => (
              <ListItem
                key={notification._id}
                button
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  backgroundColor: !notification.isRead
                    ? 'action.hover'
                    : 'transparent',
                }}
              >
                <ListItemText
                  primary={notification.message}
                  secondary={formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                    locale: he,
                  })}
                  primaryTypographyProps={{
                    fontWeight: !notification.isRead ? 'bold' : 'normal',
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
}