'use client';

import React from 'react';
import { Typography, CircularProgress, Alert, Box, Autocomplete, TextField } from '@mui/material';

interface Store {
  _id: string;
  name: string;
}

interface Props {
  stores: Store[];
  selectedStore: string;
  onStoreChange: (storeId: string) => void;
  loading: boolean;
  error: string | null;
}

const Step1_SelectStore = ({ stores, selectedStore, onStoreChange, loading, error }: Props) => {
  const selectedStoreObject = stores.find(store => store._id === selectedStore) || null;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>שלב 1: בחירת חנות</Typography>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Autocomplete
          options={stores}
          getOptionLabel={(option) => option.name}
          value={selectedStoreObject}
          onChange={(event, newValue) => {
            onStoreChange(newValue ? newValue._id : '');
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="חנות"
              placeholder="הקלד את האותיות הראשונות של שם החנות"
              fullWidth
            />
          )}
          noOptionsText="לא נמצאו חנויות"
          isOptionEqualToValue={(option, value) => option._id === value._id}
        />
      )}
    </Box>
  );
};

export default Step1_SelectStore;