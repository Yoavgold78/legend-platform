// frontend/app/manager/layout.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useAuthStore from '../../store/authStore';
import useManagerStore from '../../store/managerStore';
import { getAllStores } from '../../lib/api/stores';
import type { Store } from '../../types/inspection';
import { 
  CircularProgress, Box, Drawer, List, ListItemButton, ListItemText, Toolbar, 
  Divider, ListItemIcon, AppBar, IconButton, Typography, Select, MenuItem, FormControl, InputLabel, Stack 
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import EditNoteIcon from '@mui/icons-material/EditNote';
import LogoutButton from '../../components/common/LogoutButton';
import NotificationsBell from '../../components/common/NotificationsBell';

const drawerWidth = 240;

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, fetchUser } = useAuthStore();
  const { selectedStoreId, setSelectedStoreId } = useManagerStore();
  const [managerStores, setManagerStores] = useState<Store[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      fetchUser();
    }
  }, [user, fetchUser]);

  useEffect(() => {
    if (isLoading) {
      return; 
    }
    const isAuthorized = user && (user.role === 'manager' || user.role === 'admin' || user.role === 'employee');
    if (!isAuthorized) {
      router.push('/api/auth/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchManagerStores = async () => {
      if (user?.stores && user.stores.length > 0) {
        try {
          const allStores = await getAllStores();
          const filteredStores = allStores.filter((store: Store) => user.stores!.includes(store._id));
          setManagerStores(filteredStores);
        } catch (error) {
          console.error("Failed to fetch manager's stores", error);
        }
      }
    };
    
    if (user) {
      fetchManagerStores();
    }
  }, [user]);
  
  const handleMenuNavigation = (path: string) => {
    router.push(path);
    setMobileOpen(false);
  };
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isEditorPage = pathname?.includes('/manager/checklists/editor');

  // Menu configuration with role-based access control
  const menuItems = [
    {
      text: 'משימות',
      path: '/manager/tasks',
      icon: <AssignmentIcon />,
      allowedRoles: ['manager', 'employee']
    },
    {
      text: 'בקרות',
      path: '/manager/audits',
      icon: <AssessmentIcon />,
      allowedRoles: ['manager', 'employee']
    },
    {
      text: 'מילוי צ\'קליסט',
      path: '/manager/checklists/run',
      icon: <PlaylistAddCheckIcon />,
      allowedRoles: ['manager', 'employee']
    },
    {
      text: 'עריכת צ\'קליסטים',
      path: '/manager/checklists/editor',
      icon: <EditNoteIcon />,
      allowedRoles: ['manager']
    }
  ];

  // Filter menu items based on user role
  const allowedMenuItems = menuItems.filter(item => 
    user?.role && item.allowedRoles.includes(user.role)
  );

  const drawerContent = (
    <div>
      <Toolbar />
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
      {managerStores.length > 1 && (
        <Box sx={{ p: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="store-filter-label" sx={{ color: 'white' }}>סנן לפי סניף</InputLabel>
            <Select
              labelId="store-filter-label"
              value={selectedStoreId}
              label="סנן לפי סניף"
              onChange={(e) => setSelectedStoreId(e.target.value)}
              sx={{ color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.23)' }, '& .MuiSvgIcon-root': { color: 'white' } }}
            >
              <MenuItem value="all">כל הסניפים</MenuItem>
              {managerStores.map((store) => (
                <MenuItem key={store._id} value={store._id}>{store.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      <List sx={{ flexGrow: 1 }}>
        {allowedMenuItems.map((item, index) => (
          <div key={item.path}>
            <ListItemButton onClick={() => handleMenuNavigation(item.path)}>
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} sx={{ textAlign: 'right' }}/>
            </ListItemButton>
            {index === 1 && <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)', my: 1 }} />}
          </div>
        ))}
      </List>
      <Box sx={{ position: 'absolute', bottom: 0, width: '100%' }}>
        <LogoutButton variant="listItem" />
      </Box>
    </div>
  );

  if (isLoading || !user) {
    return (<Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box>);
  }

  return (
  <Box sx={{ display: 'flex' }}>
    <AppBar position="fixed" sx={{ width: { sm: `calc(100% - ${drawerWidth}px)` }, ml: { sm: `${drawerWidth}px` } }}>
      <Toolbar>
        <IconButton color="inherit" aria-label="open drawer" edge="end" onClick={handleDrawerToggle} sx={{ ml: 2, display: { sm: 'none' }, visibility: isEditorPage ? 'hidden' : 'visible' }}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          דשבורד מנהל
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle1" noWrap>
            ברוך הבא, {user?.fullName}
          </Typography>
          <NotificationsBell />
        </Stack>
      </Toolbar>
    </AppBar>

    <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} aria-label="side navigation">
      <Drawer variant="temporary" anchor="left" open={mobileOpen && !isEditorPage} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, backgroundColor: '#1E293B', color: 'white' } }}>
        {drawerContent}
      </Drawer>
      <Drawer variant="permanent" anchor="left" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, backgroundColor: '#1E293B', color: 'white' } }} open>
        {drawerContent}
      </Drawer>
    </Box>
    <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
      <Toolbar />
      {children}
    </Box>
  </Box>
  );
}