'use client';

import React from 'react';
import { Modal, Box, Typography, TextField, Stack, Button, CircularProgress } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const modalStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 400 },
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  textAlign: 'center' as const,
};

interface Props {
  open: boolean;
  loading: boolean;
  shareLink: string;
  onShare: () => void;
  onCopy: () => void;
  onClose: () => void;
}

export default function ShareLinkModal({ open, loading, shareLink, onShare, onCopy, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" component="h2">הביקורת נשמרה בהצלחה!</Typography>
        {loading ? (
          <Box sx={{ my: 2 }}>
            <CircularProgress />
            <Typography sx={{ mt: 1 }}>יוצר קישור מאובטח...</Typography>
          </Box>
        ) : (
          <Box sx={{ my: 3 }}>
            <TextField value={shareLink} InputProps={{ readOnly: true }} fullWidth sx={{ direction: 'ltr', textAlign: 'left' }} />
            <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'center' }}>
              <Button variant="contained" startIcon={<ShareIcon />} onClick={onShare}>שתף...</Button>
              <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={onCopy}>העתק</Button>
            </Stack>
          </Box>
        )}
        <Button onClick={onClose}>סגור</Button>
      </Box>
    </Modal>
  );
}
