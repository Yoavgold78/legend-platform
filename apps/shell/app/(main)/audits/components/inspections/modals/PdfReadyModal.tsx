'use client';

import React from 'react';
import { Modal, Box, Typography, Stack, Button, CircularProgress } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import DownloadIcon from '@mui/icons-material/Download';

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
  onSharePdf: () => void;
  onDownloadPdf: () => void;
  onClose: () => void;
}

export default function PdfReadyModal({ open, loading, onSharePdf, onDownloadPdf, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" component="h2">הביקורת נשמרה בהצלחה!</Typography>
        {loading ? (
          <Box sx={{ my: 2 }}>
            <CircularProgress />
            <Typography sx={{ mt: 1 }}>מכין קובץ PDF...</Typography>
          </Box>
        ) : (
          <Box sx={{ my: 3 }}>
            <Typography gutterBottom>קובץ ה-PDF מוכן.</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'center' }}>
              <Button variant="contained" startIcon={<ShareIcon />} onClick={onSharePdf}>שתף PDF...</Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={onDownloadPdf}>הורד</Button>
            </Stack>
          </Box>
        )}
        <Button onClick={onClose}>סגור</Button>
      </Box>
    </Modal>
  );
}
