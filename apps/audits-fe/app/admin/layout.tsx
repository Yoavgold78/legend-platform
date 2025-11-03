// frontend/app/admin/layout.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import { 
  Box, 
  CircularProgress, 
  CssBaseline, 
  Drawer, 
  List, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography,
  Stack, 
  Divider
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PeopleIcon from '@mui/icons-material/People';
import TaskIcon from '@mui/icons-material/Task';
import Link from 'next/link';
import LogoutButton from '@/components/common/LogoutButton';
import NotificationsBell from '@/components/common/NotificationsBell';

const drawerWidth = 240;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, fetchUser } = useAuthStore();

  useEffect(() => {
    if (!user) {
      fetchUser();
    }
  }, [user, fetchUser]);

  useEffect(() => {
    if (isLoading) {
      return; // בזמן טעינה, לא עושים כלום
    }

    // לאחר שהטעינה הסתיימה, בודקים אם המשתמש הוא מנהל
    const isAuthorized = user && user.role === 'admin';
    if (!isAuthorized) {
      router.push('/api/auth/login'); // אם לא מורשה, מעבירים להתחברות
    }
  }, [user, isLoading, router]);

  // בזמן שה-Store מאמת את המשתמש, נציג חיווי טעינה
  if (isLoading || !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2, direction: 'rtl' }}>מאמת פרטי מנהל...</Typography>
      </Box>
    );
  }

  const menuItems = [
    { text: 'דוחות', href: '/admin/dashboard', icon: <DashboardIcon /> },
    { text: 'תבניות', href: '/admin/templates', icon: <AssignmentIcon /> },
    { text: 'חנויות', href: '/admin/stores', icon: <StorefrontIcon /> },
    { text: 'משתמשים', href: '/admin/users', icon: <PeopleIcon /> },
    { text: 'משימות', href: '/admin/tasks', icon: <TaskIcon /> },
  ];

  // רק אם המשתמש הוא מנהל, נציג את ה-Layout המלא
  if (user.role === 'admin') {
    return (
      <Box sx={{ display: 'flex', direction: 'rtl' }}>
        <CssBaseline />
        <Drawer
          variant="permanent"
          anchor="left"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { 
              width: drawerWidth, 
              boxSizing: 'border-box',
              backgroundColor: '#1E293B',
              color: 'white',
            },
          }}
        >
          <Toolbar />
          <Stack 
            direction="row" 
            spacing={2} 
            alignItems="center" 
            justifyContent="space-between" 
            sx={{ p: 2 }}
          >
            <Typography variant="h6" component="div" sx={{ color: 'white' }}>
              {user?.fullName}
            </Typography>
            <NotificationsBell />
          </Stack>
<Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
          <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <List sx={{ flexGrow: 1 }}>
              {menuItems.map((item) => (
                <ListItemButton 
                  key={item.text} 
                  component={Link} 
                  href={item.href}
                  sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}
                >
                  <ListItemIcon sx={{ color: 'white' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              ))}
            </List>
            {/* שימוש ברכיב היציאה החדש, בסגנון של פריט בתפריט */}
            <LogoutButton variant="listItem" />
          </Box>
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, p: 3, mr: `${drawerWidth}px` }}>
          <Toolbar />
          {children}
        </Box>
      </Box>
    );
  }

  // Fallback למקרה שהמשתמש איכשהו עבר את הבדיקה למרות שאינו מנהל
  return null;
}