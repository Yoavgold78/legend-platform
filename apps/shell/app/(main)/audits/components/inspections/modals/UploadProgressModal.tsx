'use client';

import React from 'react';
import { Modal, Box, Typography, LinearProgress } from '@mui/material';

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
  status: string;
  progress: number; // 0-100
}

export default function UploadProgressModal({ open, status, progress }: Props) {
  return (
    <Modal open={open}>
      <Box sx={modalStyle}>
        <Typography variant="h6" component="h2">מעבד ביקורת...</Typography>
        <Typography sx={{ mt: 2, mb: 1, direction: 'ltr' }}>{status}</Typography>
        <LinearProgress variant="determinate" value={progress} />
        <Typography sx={{ mt: 2, fontSize: '0.9rem', color: 'text.secondary' }}>
          תהליך זה עשוי לקחת מספר דקות. נא לא לסגור או לרענן את העמוד.
        </Typography>
      </Box>
    </Modal>
  );
}
