// frontend/components/common/LogoutButton.tsx

'use client';

import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import { Button, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

// הרכיב יכול לקבל prop כדי להתאים את עצמו לסגנון של כפתור רגיל או פריט בתפריט
interface LogoutButtonProps {
  variant?: 'button' | 'listItem';
}

const LogoutButton = ({ variant = 'button' }: LogoutButtonProps) => {
  const router = useRouter();
  const logoutUser = useAuthStore((state) => state.logoutUser);

  const handleLogout = () => {
    // 1. ניקוי ה-State הפנימי של האפליקציה
    logoutUser();
    
    // 2. ניתוב לכתובת היציאה של Auth0
    window.location.href = '/api/auth/logout';
  };

  if (variant === 'listItem') {
    return (
      <ListItemButton
        onClick={handleLogout}
        sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' }, color: '#f87171' }} // צבע אדום עדין
      >
        <ListItemIcon sx={{ color: '#f87171', minWidth: 36 }}>
          <LogoutIcon />
        </ListItemIcon>
        <ListItemText primary="יציאה" />
      </ListItemButton>
    );
  }

  return (
    <Button
      variant="contained"
      color="secondary"
      onClick={handleLogout}
      startIcon={<LogoutIcon />}
    >
      יציאה
    </Button>
  );
};

export default LogoutButton;