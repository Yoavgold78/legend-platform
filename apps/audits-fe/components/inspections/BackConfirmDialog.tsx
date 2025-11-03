'use client';

import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  description?: React.ReactNode;
  cancelText?: string;
  confirmText?: string;
  disableBackdropClose?: boolean;
}

export default function BackConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title = 'יציאה מתהליך הביקורת',
  description = (
    <>
      האם אתה בטוח שברצונך לצאת?
      <br />
      המידע שהזנת נשמר אוטומטית ותוכל להמשיך מאוחר יותר.
    </>
  ),
  cancelText = 'הישאר בעמוד',
  confirmText = 'כן, צא',
  disableBackdropClose = true,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={disableBackdropClose ? undefined : onCancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      disableEscapeKeyDown={disableBackdropClose}
    >
      <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">{description}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{cancelText}</Button>
        <Button onClick={onConfirm} autoFocus color="warning">{confirmText}</Button>
      </DialogActions>
    </Dialog>
  );
}
