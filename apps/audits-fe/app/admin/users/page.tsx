'use client';

import { 
  Box, 
  Typography, 
  Button, 
  Stack, 
  CircularProgress, 
  List, 
  ListItem, 
  ListItemText, 
  IconButton, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle,
  Container,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddUserDrawer from '../../../components/AddUserDrawer';
import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { useUser } from '@auth0/nextjs-auth0/client';

const UsersAdminPage = () => {
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();
  const [userToEdit, setUserToEdit] = useState(null);

  // Helper function to make authenticated API calls
  const makeAuthenticatedRequest = async (method: string, url: string, data: any = null) => {
    try {
      const isIframe = typeof window !== 'undefined' && window.self !== window.top;
      
      if (isIframe) {
        // In iframe mode, don't call /api/auth/token - axios interceptor handles auth
        throw new Error('makeAuthenticatedRequest should not be used in iframe mode - use axios directly');
      }
      
      const tokenResponse = await fetch('/api/auth/token');
      if (tokenResponse.status === 401) {
        // No valid API token — force login with audience
        window.location.href = `/api/auth/login`;
        throw new Error('Re-authentication required');
      }
      const { accessToken } = await tokenResponse.json();
      const tokenHeader = accessToken.startsWith('Bearer ')
        ? accessToken
        : `Bearer ${accessToken}`;
      if (!accessToken) {
        window.location.href = `/api/auth/login`;
        throw new Error('Missing access token');
      }

      const config = {
        headers: { 
          'Authorization': tokenHeader,
          'Content-Type': 'application/json'
        }
      };

      if (method === 'GET') {
        return await axios.get(url, config);
      } else if (method === 'POST') {
        return await axios.post(url, data, config);
      } else if (method === 'PUT') {
        return await axios.put(url, data, config);
      } else if (method === 'DELETE') {
        return await axios.delete(url, config);
      }
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };

    const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest('GET', '/auth/users');
      if (response) {
        const usersData = Array.isArray(response.data) ? response.data : response.data.data || [];
        setUsers(usersData);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'שגיאה בטעינת המשתמשים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const handleAddUser = () => {
    setUserToEdit(null);
    setIsAddDrawerOpen(true);
  };

  const handleUpdateUser = (userId: string) => {
    const user = users.find((u: any) => u._id === userId);
    if (user) {
      setUserToEdit(user);
      setIsAddDrawerOpen(true);
    }
  };

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDeleteId, setUserToDeleteId] = useState<string | null>(null);

  const handleDeleteUser = (userId: string) => {
    setUserToDeleteId(userId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (userToDeleteId) {
      try {
        await makeAuthenticatedRequest('DELETE', `/auth/users/${userToDeleteId}`);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      } finally {
        setIsDeleteDialogOpen(false);
        setUserToDeleteId(null);
      }
    }
  };

  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setUserToDeleteId(null);
  };

  const handleDrawerClose = () => {
    setIsAddDrawerOpen(false);
    setUserToEdit(null);
    fetchUsers();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='h4' component='h1' sx={{ fontWeight: '600' }}>
          ניהול משתמשים
        </Typography>
        <Button
          variant='contained'
          startIcon={<AddIcon />}
          onClick={handleAddUser}
          sx={{ backgroundColor: '#4285F4', color: 'white', '&:hover': { backgroundColor: '#3c79e6' } }}
        >
          הוספת משתמש חדש
        </Button>
      </Box>

      <Box>
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Typography color='error'>Error: {error}</Typography>
        ) : (
          <List>
            {users.map((user: any) => (
              <ListItem key={user._id} sx={{ borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1, direction: 'rtl' }}>
                      <Typography component="span" sx={{ fontWeight: 500 }}>{user.fullName}</Typography>
                      <Chip 
                        label={user.role === 'admin' ? 'מנהל' : user.role === 'manager' ? 'מנהל חנות' : 'עובד'} 
                        size="small" 
                        color={user.role === 'admin' ? 'error' : user.role === 'manager' ? 'primary' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={user.email}
                  sx={{ textAlign: 'right' }}
                  secondaryTypographyProps={{ align: 'right' }}
                />
                <Stack direction='row' spacing={1}>
                  <IconButton edge='end' aria-label='edit' onClick={() => handleUpdateUser(user._id)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge='end' aria-label='delete' onClick={() => handleDeleteUser(user._id)}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <AddUserDrawer // שימוש ברכיב הנכון
        open={isAddDrawerOpen}
        onClose={handleDrawerClose}
        userToEdit={userToEdit}
      />

      <Dialog open={isDeleteDialogOpen} onClose={cancelDelete}>
        <DialogTitle>{'מחיקת משתמש'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            האם אתה בטוח שברצונך למחוק משתמש זה?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>ביטול</Button>
          <Button onClick={confirmDeleteUser} autoFocus color='error'>
            מחק
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersAdminPage;