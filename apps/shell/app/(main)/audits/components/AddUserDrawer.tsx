import { Drawer, Box, Typography, TextField, Button, Stack, MenuItem, CircularProgress, Select, Chip, OutlinedInput, FormControl, InputLabel } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { getAllStores } from '../lib/api/stores';
import { createUser, updateUser } from '../lib/api/users';
import type { Store } from '../types/inspection';

interface AddUserDrawerProps {
  open: boolean;
  onClose: () => void;
  userToEdit: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
    stores?: string[];
    phoneNumber?: string; // Added phoneNumber
  } | null;
}

const AddUserDrawer = ({ open, onClose, userToEdit }: AddUserDrawerProps) => {
  const [formData, setFormData] = useState({ fullName: '', email: '', role: 'inspector', stores: [] as string[], phoneNumber: '' });
  const [error, setError] = useState('');
  const { user } = useUser();
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditMode = Boolean(userToEdit);

  useEffect(() => {
    const fetchStores = async () => {
      if (open) {
        setLoadingStores(true);
        try {
          const storesData = await getAllStores();
          setAllStores(storesData);
        } catch (err) {
          console.error("Failed to fetch stores", err);
          setError("Failed to load stores list.");
        } finally {
          setLoadingStores(false);
        }
      }
    };
    fetchStores();
  }, [open]);

  useEffect(() => {
    if (isEditMode && userToEdit) {
      setFormData({
        fullName: userToEdit.fullName,
        email: userToEdit.email,
        role: userToEdit.role,
        stores: userToEdit.stores || [],
        phoneNumber: userToEdit.phoneNumber || '',
      });
    } else {
      setFormData({ fullName: '', email: '', role: 'inspector', stores: [], phoneNumber: '' });
    }
    setError('');
  }, [userToEdit, open]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    
    if (name === 'role') {
      // Clear stores when role changes to prevent data inconsistency
      setFormData(prev => ({ ...prev, role: value, stores: [] }));
    } else if (name === 'stores') {
      // Handle store selection based on role
      if (formData.role === 'manager') {
        // Multi-select for managers
        setFormData(prev => ({ ...prev, stores: value }));
      } else if (formData.role === 'employee') {
        // Single-select for employees (convert to array)
        setFormData(prev => ({ ...prev, stores: [value] }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Check if user is authenticated
    if (!user) {
      setError('You must be logged in to perform this action');
      setLoading(false);
      return;
    }

    const payload: any = {
      fullName: formData.fullName,
      email: formData.email,
      role: formData.role,
    };
    
    // Remove password handling since Auth0 handles this
    if (formData.role === 'manager') {
      payload.stores = formData.stores;
      payload.phoneNumber = formData.phoneNumber;
    } else if (formData.role === 'employee') {
      payload.stores = formData.stores;
    }

    try {
      console.log('Submitting user form:', isEditMode ? 'UPDATE' : 'CREATE');
      console.log('User data:', { ...payload, email: payload.email });
      
      if (isEditMode && userToEdit) {
        await updateUser(userToEdit._id, payload);
        console.log('User updated successfully');
      } else {
        await createUser(payload);
        console.log('User created successfully');
      }
      
      onClose();
    } catch (error: any) {
      console.error('User form submission error:', error);
      setError(error.message || 'שגיאה ביצירת/עדכון המשתמש');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer anchor='right' open={open} onClose={onClose}>
      <Box sx={{ width: 400, p: 3 }} role='presentation'>
        <Typography variant='h5' component='h2' sx={{ mb: 3 }}>
          {isEditMode ? 'עדכון פרטי משתמש' : 'הוספת משתמש חדש'}
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField label='שם מלא' name='fullName' value={formData.fullName} onChange={handleChange} required fullWidth />
            <TextField label='אימייל' name='email' type='email' value={formData.email} onChange={handleChange} required fullWidth />
            
            <TextField label='תפקיד' name='role' select value={formData.role} onChange={handleChange} required fullWidth>
              <MenuItem value='inspector'>בקר (מפקח)</MenuItem>
              <MenuItem value='manager'>מנהל סניף/אזור</MenuItem>
              <MenuItem value='employee'>עובד סניף</MenuItem>
              <MenuItem value='admin'>מנהל כללי</MenuItem>
            </TextField>

            {/* MODIFIED: Conditional fields for managers and employees */}
            {(formData.role === 'manager' || formData.role === 'employee') && (
              <>
                {formData.role === 'manager' && (
                  <TextField label="מספר טלפון (ל-SMS)" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required fullWidth />
                )}
                
                {loadingStores ? <CircularProgress /> : (
                  // FIXED: Wrapped Select in FormControl for proper labeling
                  <FormControl fullWidth>
                    <InputLabel id="stores-select-label">
                      {formData.role === 'manager' ? 'שייך לסניפים' : 'שייך לסניף'}
                    </InputLabel>
                    <Select
                      name="stores"
                      labelId="stores-select-label"
                      multiple={formData.role === 'manager'}
                      value={formData.role === 'manager' ? formData.stores : (formData.stores[0] || '')}
                      onChange={handleChange}
                      input={<OutlinedInput label={formData.role === 'manager' ? 'שייך לסניפים' : 'שייך לסניף'} />}
                      renderValue={formData.role === 'manager' ? (selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => {
                            const storeName = allStores.find(s => s._id === value)?.name || value;
                            return <Chip key={value} label={storeName} />;
                          })}
                        </Box>
                      ) : (selected) => {
                        const storeName = allStores.find(s => s._id === selected)?.name || selected;
                        return storeName;
                      }}
                    >
                      {allStores.map((store) => (
                        <MenuItem key={store._id} value={store._id}>
                          {store.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </>
            )}

            {error && <Typography color='error'>{error}</Typography>}
            <Button type='submit' variant='contained' sx={{ mt: 2 }}>
              {isEditMode ? 'שמור שינויים' : 'הוסף משתמש'}
            </Button>
          </Stack>
        </form>
      </Box>
    </Drawer>
  );
};

export default AddUserDrawer;