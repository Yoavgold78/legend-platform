'use client';

import { Box, Typography, Button, Stack, CircularProgress, List, ListItem, ListItemText, IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddStoreDrawer from '../../../components/AddStoreDrawer';
import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { useUser } from '@auth0/nextjs-auth0/client';

const StoresAdminPage = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useUser();
  const [storeToEdit, setStoreToEdit] = useState(null);

  // Helper function to make authenticated API calls
  const makeAuthenticatedRequest = async (method: string, url: string, data: any = null) => {
    try {
      const tokenResponse = await fetch('/api/auth/token');
      const { accessToken } = await tokenResponse.json();
      const tokenHeader = accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`;
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

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest('GET', '/stores');
      if (response) {
        setStores(response.data.data || response.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching stores:', err);
      setError(err.message || 'שגיאה בטעינת החנויות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
        fetchStores();
    }
  }, [user]);

  const handleAddStore = () => {
    setStoreToEdit(null);
    setIsDrawerOpen(true);
  };

  const handleUpdateStore = (storeId: string) => {
    const store = stores.find((s: any) => s._id === storeId);
    if (store) {
      setStoreToEdit(store);
      setIsDrawerOpen(true);
    }
  };

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [storeToDeleteId, setStoreToDeleteId] = useState<string | null>(null);

  const handleDeleteStore = (storeId: string) => {
    setStoreToDeleteId(storeId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteStore = async () => {
    if (storeToDeleteId) {
      try {
        await makeAuthenticatedRequest('DELETE', `/stores/${storeToDeleteId}`);
        fetchStores();
      } catch (error) {
        console.error('Error deleting store:', error);
      } finally {
        setIsDeleteDialogOpen(false);
        setStoreToDeleteId(null);
      }
    }
  };

  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setStoreToDeleteId(null);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setStoreToEdit(null);
    fetchStores();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='h4' component='h1' sx={{ fontWeight: '600' }}>
          ניהול חנויות
        </Typography>
        <Button
          variant='contained'
          startIcon={<AddIcon />}
          onClick={handleAddStore}
          sx={{ backgroundColor: '#4285F4', color: 'white', '&:hover': { backgroundColor: '#3c79e6' } }}
        >
          הוספת חנות חדשה
        </Button>
      </Box>

      <Box>
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Typography color='error'>Error: {error}</Typography>
        ) : (
          <List>
            {stores.map((store: any) => (
              <ListItem key={store._id} sx={{ borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <ListItemText primary={store.name} secondary={store.address} />
                <Stack direction='row' spacing={1}>
                  <IconButton edge='end' aria-label='edit' onClick={() => handleUpdateStore(store._id)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge='end' aria-label='delete' onClick={() => handleDeleteStore(store._id)}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <AddStoreDrawer
        open={isDrawerOpen}
        onClose={handleDrawerClose}
        storeToEdit={storeToEdit}
      />

      <Dialog open={isDeleteDialogOpen} onClose={cancelDelete}>
        <DialogTitle>{'מחיקת חנות'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            האם אתה בטוח שברצונך למחוק חנות זו?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>ביטול</Button>
          <Button onClick={confirmDeleteStore} autoFocus color='error'>
            מחק
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StoresAdminPage;