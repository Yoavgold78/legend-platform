// frontend/components/common/PasswordConfirmationDialog.tsx

'use client';

import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

interface PasswordConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<boolean>; // Returns true on success, false on failure
}

const PasswordConfirmationDialog: React.FC<PasswordConfirmationDialogProps> = ({ open, onClose, onConfirm }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleConfirmClick = async () => {
    setIsLoading(true);
    setError(null);
    const success = await onConfirm(password);
    setIsLoading(false);
    if (!success) {
      setError('הסיסמה שגויה. אנא נסה שוב.');
    } else {
      setPassword(''); 
      setShowPassword(false);
    }
  };

  const handleDialogClose = () => {
    setPassword('');
    setError(null);
    setShowPassword(false);
    onClose();
  };
  
  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} PaperProps={{ sx: { direction: 'rtl' } }}>
      {/* --- START OF UI FIX: Align title to the right --- */}
      <DialogTitle sx={{ textAlign: 'right' }}>אימות נדרש</DialogTitle>
      {/* --- END OF UI FIX --- */}
      <DialogContent>
        <DialogContentText sx={{ textAlign: 'right' }}>
          כדי לגשת לעמוד זה, אנא הזן את סיסמת המנהל שלך.
        </DialogContentText>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        <TextField
          autoFocus
          margin="dense"
          id="password"
          label="סיסמה"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          // --- START OF UI FIX: Change variant to 'outlined' for better alignment ---
          variant="outlined"
          // --- END OF UI FIX ---
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleConfirmClick()}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose}>ביטול</Button>
        <Button onClick={handleConfirmClick} disabled={isLoading || !password}>
          {isLoading ? <CircularProgress size={24} /> : 'אישור'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PasswordConfirmationDialog;