'use client';

import React from 'react';
import { Box, Typography, List, Paper, ListItemIcon, ListItemText, IconButton, Button } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Task } from '@/types/inspection';

interface Props {
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
  onOpenCreate: () => void;
}

export default function GeneralTasksSection({ tasks, onDeleteTask, onOpenCreate }: Props) {
  const generalTasks = tasks.filter(t => !t.questionId);
  return (
    <Box>
      <Typography variant="h5" gutterBottom>משימות כלליות</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        הוסף משימות כלליות שאינן קשורות לשאלה ספציפית.
      </Typography>
      {generalTasks.length > 0 && (
        <List>
          {generalTasks.map((task) => (
            <Paper key={task._id} variant="outlined" sx={{ p: 1, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <ListItemIcon sx={{ minWidth: 40 }}><AssignmentIcon color="action" /></ListItemIcon>
              <ListItemText
                primary={task.description}
                secondary={`תאריך יעד: ${new Date(task.dueDate).toLocaleDateString('he-IL')} | דחיפות: ${task.priority === 'High' ? 'גבוהה' : 'רגילה'}`}
              />
              <IconButton edge="end" onClick={() => onDeleteTask(task._id!)}>
                <DeleteIcon color="error" />
              </IconButton>
            </Paper>
          ))}
        </List>
      )}
      <Button variant="outlined" sx={{ mt: 1 }} onClick={onOpenCreate}>
        הוסף משימה כללית
      </Button>
    </Box>
  );
}
