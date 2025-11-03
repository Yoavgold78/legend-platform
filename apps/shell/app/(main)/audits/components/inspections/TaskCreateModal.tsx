'use client';

import React, { useState, useEffect } from 'react';
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Typography
} from '@mui/material';

interface TaskCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (taskData: { description: string; dueDate: string; priority: 'Normal' | 'High' }) => void;
  questionText?: string; // Optional: for tasks linked to a specific question
}

const TaskCreateModal = ({ open, onClose, onSubmit, questionText }: TaskCreateModalProps) => {
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'High'>('Normal');
  const [dateError, setDateError] = useState('');

  const today = new Date();
  today.setDate(today.getDate() + 1);
  const tomorrowString = today.toISOString().split('T')[0];
  
  // Reset form when the modal opens
  useEffect(() => {
    if (open) {
      setDescription('');
      setDueDate('');
      setPriority('Normal');
      setDateError('');
    }
  }, [open]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDateStr = e.target.value;
    setDueDate(selectedDateStr);

    const selectedDate = new Date(selectedDateStr);
    const tomorrow = new Date(tomorrowString);
    tomorrow.setHours(0, 0, 0, 0);

    if (selectedDate < tomorrow) {
      setDateError('תאריך היעד חייב להיות החל ממחר.');
    } else {
      setDateError('');
    }
  };

  const handleSubmit = () => {
    if (description && dueDate && !dateError) {
      onSubmit({ description, dueDate, priority });
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{questionText ? 'יצירת משימה חדשה' : 'יצירת משימה כללית'}</DialogTitle>
      <DialogContent>
        {questionText && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            עבור שאלה: "{questionText}"
          </Typography>
        )}
        <TextField
          autoFocus
          margin="dense"
          label="תיאור המשימה"
          type="text"
          fullWidth
          multiline
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <TextField
          margin="dense"
          label="תאריך יעד"
          type="date"
          fullWidth
          value={dueDate}
          onChange={handleDateChange}
          error={!!dateError}
          helperText={dateError}
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: tomorrowString }}
          required
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>דחיפות</InputLabel>
          <Select
            value={priority}
            label="דחיפות"
            onChange={(e) => setPriority(e.target.value as 'Normal' | 'High')}
          >
            <MenuItem value="Normal">רגילה</MenuItem>
            <MenuItem value="High">גבוהה</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ביטול</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!description || !dueDate || !!dateError}
        >
          צור משימה
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskCreateModal;