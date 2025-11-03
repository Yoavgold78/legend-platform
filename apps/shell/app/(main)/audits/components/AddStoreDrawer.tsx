import { Drawer, Box, Typography, TextField, Button, Stack } from '@mui/material';
import { useState, useEffect } from 'react';
import axios from '../lib/axios';
import useAuthStore from '../store/authStore';

interface AddStoreDrawerProps {
  open: boolean;
  onClose: () => void;
  storeToEdit: {
    _id: string;
    name: string;
    address: string;
  } | null;
}

const AddStoreDrawer = ({ open, onClose, storeToEdit }: AddStoreDrawerProps) => {
  const [formData, setFormData] = useState({ name: '', address: '' });
  const [error, setError] = useState('');
  const { user } = useAuthStore();

  const isEditMode = Boolean(storeToEdit);

  useEffect(() => {
    if (isEditMode && storeToEdit) {
      setFormData({
        name: storeToEdit.name,
        address: storeToEdit.address,
      });
    } else {
      setFormData({ name: '', address: '' });
    }
    setError('');
  }, [storeToEdit, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isEditMode && storeToEdit) {
        await axios.put(`/stores/${storeToEdit._id}`, formData);
      } else {
        await axios.post('/stores', formData);
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'An unexpected error occurred');
      console.error(err);
    }
  };

  return (
    <Drawer anchor='right' open={open} onClose={onClose}>
      <Box sx={{ width: 400, p: 3 }} role='presentation'>
        <Typography variant='h5' component='h2' sx={{ mb: 3 }}>
          {isEditMode ? 'עדכון פרטי חנות' : 'הוספת חנות חדשה'}
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label='שם החנות'
              name='name'
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              label='כתובת'
              name='address'
              value={formData.address}
              onChange={handleChange}
              required
              fullWidth
            />
            {error && <Typography color='error'>{error}</Typography>}
            <Button type='submit' variant='contained' sx={{ mt: 2 }}>
              {isEditMode ? 'שמור שינויים' : 'הוסף חנות'}
            </Button>
          </Stack>
        </form>
      </Box>
    </Drawer>
  );
};

export default AddStoreDrawer;