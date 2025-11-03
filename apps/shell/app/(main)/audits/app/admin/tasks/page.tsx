'use client';

import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Grid,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Fab,
    Stack,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormGroup,
    FormControlLabel,
    Checkbox
} from '@mui/material';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import TaskIcon from '@mui/icons-material/Task';
import { he } from 'date-fns/locale';
import { 
    createChecklistTemplate, 
    updateChecklistTemplate
} from '../../../lib/api/checklists.js';
import axios from '../../../lib/axios.js';

interface UniversalTask {
    _id: string;
    name: string;
    description: string;
    tasks: Array<{
        _id: string;
        text: string;
        requiresPhoto: boolean;
    }>;
    type: 'task';
    taskType: 'universal';
    isUniversalTemplate: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy?: {
        fullName?: string;
        name?: string;
    };
}

// Helper function to parse time string to Date object
const parseTimeString = (timeString?: string): Date | null => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':');
  if (isNaN(parseInt(hours, 10)) || isNaN(parseInt(minutes, 10))) return null;
  const date = new Date();
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return date;
};

const formatTime = (date: Date | null): string => date ? date.toTimeString().slice(0, 5) : '';

export default function AdminTasksPage() {
    const [tasks, setTasks] = useState<UniversalTask[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<UniversalTask | null>(null);
    
    // Form state
    const [taskName, setTaskName] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [taskItems, setTaskItems] = useState([{ id: Date.now(), text: '', requiresPhoto: false }]);
    
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/checklists/universal');
            setTasks(response.data);
            setError(null);
        } catch (err) {
            setError('לא ניתן היה לטעון את המשימות הכלליות. נסה שוב מאוחר יותר.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateDialog = () => {
        setEditingTask(null);
        setTaskName('');
        setTaskDescription('');
        setTaskItems([{ id: Date.now(), text: '', requiresPhoto: false }]);
        setDialogOpen(true);
    };

    const handleOpenEditDialog = (task: UniversalTask) => {
        setEditingTask(task);
        setTaskName(task.name);
        setTaskDescription(task.description || '');
        setTaskItems(task.tasks.map((t, i) => ({ 
            id: Date.now() + i, 
            text: t.text, 
            requiresPhoto: t.requiresPhoto 
        })));
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingTask(null);
        setTaskName('');
        setTaskDescription('');
        setTaskItems([{ id: Date.now(), text: '', requiresPhoto: false }]);
        setSaving(false);
    };

    const handleAddTaskItem = () => {
        setTaskItems([...taskItems, { id: Date.now(), text: '', requiresPhoto: false }]);
    };

    const handleDeleteTaskItem = (id: number) => {
        setTaskItems(taskItems.filter((item) => item.id !== id));
    };

    const handleTaskItemChange = (id: number, field: 'text' | 'requiresPhoto', value: string | boolean) => {
        setTaskItems(taskItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    const handleDayChange = (dayIndex: number, isChecked: boolean) => {
        // Removed - no longer needed for templates
    };

    const handleSaveTask = async () => {
        if (!taskName.trim() || taskItems.some(item => !item.text.trim())) {
            setError('יש למלא את כל השדות הנדרשים');
            return;
        }

        try {
            setSaving(true);
            const taskData = {
                name: taskName.trim(),
                description: taskDescription.trim(),
                tasks: taskItems.map(item => ({
                    text: item.text.trim(),
                    requiresPhoto: item.requiresPhoto
                })),
                type: 'task' as const,
                taskType: 'universal' as const,
                // No schedule - this is a template only
            };

            if (editingTask) {
                // Update existing task
                await updateChecklistTemplate(editingTask._id, taskData);
            } else {
                // Create new task
                await createChecklistTemplate(taskData);
            }

            await fetchTasks(); // Refresh the list
            handleCloseDialog();
        } catch (err: any) {
            console.error('Failed to save task:', err);
            setError('שמירת המשימה נכשלה. נסה שוב.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק משימה כללית זו? המשימה תוסר מכל החנויות.')) {
            return;
        }

        try {
            await axios.delete(`/checklists/${taskId}`);
            await fetchTasks(); // Refresh the list
        } catch (err: any) {
            console.error('Failed to delete task:', err);
            setError('מחיקת המשימה נכשלה. נסה שוב.');
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    }

    return (
        <Box sx={{ p: 3, direction: 'rtl' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                    ניהול משימות כלליות
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    {tasks.length} משימות כלליות
                </Typography>
            </Box>

            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
                ניהול משימות כלליות שיופיעו בכל החנויות. מנהלי חנויות יוכלו לתזמן אותן אך לא לערוך אותן.
            </Typography>

            {tasks.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <TaskIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        אין משימות כלליות במערכת
                    </Typography>
                    <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                        צור משימות כלליות שמנהלי החנויות יוכלו לתזמן
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleOpenCreateDialog}
                        size="large"
                    >
                        צור משימה כללית חדשה
                    </Button>
                </Box>
            ) : (
                <>
                    <Grid container spacing={2}>
                        {tasks.map((task) => (
                            <Grid item xs={12} sm={6} md={4} key={task._id}>
                                <Card sx={{ backgroundColor: 'white', height: '100%' }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                            <Chip 
                                                label="משימה כללית"
                                                color="info"
                                                size="small"
                                            />
                                            <Box>
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleOpenEditDialog(task)}
                                                    sx={{ mr: 0.5 }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleDeleteTask(task._id)}
                                                    color="error"
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Box>
                                        
                                        <Typography variant="h6" component="div" sx={{ textAlign: 'right', mb: 2 }}>
                                            {task.name}
                                        </Typography>

                                        {task.description && (
                                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right', mb: 2 }}>
                                                {task.description}
                                            </Typography>
                                        )}

                                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right', mb: 2 }}>
                                            משימות: {task.tasks.length}
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
                                            נוצר בתאריך: {new Date(task.createdAt).toLocaleDateString('he-IL')}
                                        </Typography>
                                        
                                        {task.createdBy && (
                                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
                                                נוצר על ידי: {task.createdBy.fullName || task.createdBy.name}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </>
            )}

            {/* Floating Action Button - Always visible */}
            <Fab
                color="primary"
                aria-label="add task"
                sx={{ position: 'fixed', bottom: 16, right: 16 }}
                onClick={handleOpenCreateDialog}
            >
                <AddIcon />
            </Fab>

            {/* Create/Edit Universal Task Template Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="md">
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {editingTask ? 'עריכת תבנית משימה כללית' : 'יצירת תבנית משימה כללית חדשה'}
                    <IconButton onClick={handleCloseDialog}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="שם המשימה"
                            value={taskName}
                            onChange={(e) => setTaskName(e.target.value)}
                            placeholder="למשל: ביקורת ניקיון במטבח"
                            variant="outlined"
                            dir="rtl"
                        />
                        
                        <TextField
                            fullWidth
                            label="תיאור המשימה"
                            value={taskDescription}
                            onChange={(e) => setTaskDescription(e.target.value)}
                            placeholder="תאר בפירוט מה כולל ביצוע המשימה..."
                            variant="outlined"
                            multiline
                            rows={3}
                            dir="rtl"
                        />

                        {/* Task Items Section */}
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                פירוט המשימות
                            </Typography>
                            {taskItems.map((item) => (
                                <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                                    <TextField 
                                        variant="outlined" 
                                        placeholder="פרט משימה" 
                                        value={item.text} 
                                        onChange={(e) => handleTaskItemChange(item.id, 'text', e.target.value)} 
                                        sx={{ flexGrow: 1 }} 
                                        size="small"
                                    />
                                    <FormControlLabel 
                                        control={
                                            <Checkbox 
                                                checked={item.requiresPhoto} 
                                                onChange={(e) => handleTaskItemChange(item.id, 'requiresPhoto', e.target.checked)} 
                                            />
                                        } 
                                        label="דורש תמונה" 
                                        labelPlacement="start" 
                                    />
                                    {taskItems.length > 1 && (
                                        <IconButton onClick={() => handleDeleteTaskItem(item.id)} color="error" size="small">
                                            <DeleteIcon />
                                        </IconButton>
                                    )}
                                </Box>
                            ))}
                            
                            <Button startIcon={<AddIcon />} onClick={handleAddTaskItem} variant="outlined" size="small">
                                הוסף פרט משימה
                            </Button>
                        </Box>

                        <Alert severity="info">
                            <Typography variant="body2">
                                זוהי תבנית משימה. מנהלי החנויות יוכלו לתזמן אותה לפי הצורך שלהם.
                            </Typography>
                        </Alert>

                        {error && (
                            <Alert severity="error">
                                {error}
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleCloseDialog}>
                        בטל
                    </Button>
                    <Button
                        onClick={handleSaveTask}
                        variant="contained"
                        disabled={!taskName.trim() || taskItems.some(item => !item.text.trim()) || saving}
                    >
                        {saving ? <CircularProgress size={20} /> : (editingTask ? 'עדכן' : 'צור')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}