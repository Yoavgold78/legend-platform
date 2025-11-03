// frontend/app/manager/checklists/editor/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, TextField, Button, Paper, IconButton, Divider,
  Select, MenuItem, FormControl, InputLabel, FormGroup, FormControlLabel,
  Checkbox, Grid, Switch, CircularProgress, Alert, ToggleButtonGroup, ToggleButton,
  ListSubheader, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { he } from 'date-fns/locale';
import { createChecklistTemplate, getChecklistTemplates, getChecklistTemplateById, updateChecklistTemplate, deleteChecklistTemplate } from '@/lib/api/checklists'; 
import axios from '@/lib/axios';  
import useAuthStore from '@/store/authStore';
import useManagerStore from '@/store/managerStore';
import type { ChecklistTemplate as ChecklistTemplateType } from '@/types/checklist';

type EditorMode = 'template' | 'task' | 'update' | 'schedule-universal';

interface Task {
  id: number;
  text: string;
  requiresPhoto: boolean;
}

interface Schedule {
  type: 'daily' | 'weekly';
  daysOfWeek: number[];
  startTime: Date | null;
  endTime: Date | null;
}

// פונקציית עזר להמרת מחרוזת זמן (כמו "08:00") לאובייקט Date
const parseTimeString = (timeString?: string): Date | null => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':');
  if (isNaN(parseInt(hours, 10)) || isNaN(parseInt(minutes, 10))) return null;
  const date = new Date();
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return date;
};


const ChecklistEditorPage = () => {
  const { user, isLoading: authLoading } = useAuthStore();
  const { selectedStoreId } = useManagerStore();
  const router = useRouter();
  const [mode, setMode] = useState<EditorMode>('template');
  const [allItems, setAllItems] = useState<ChecklistTemplateType[]>([]);
  const [universalTemplates, setUniversalTemplates] = useState<any[]>([]);
  const [selectedUniversalTemplate, setSelectedUniversalTemplate] = useState<string>('');
  const [editingId, setEditingId] = useState<string>('');
  
  const [parentTemplateId, setParentTemplateId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState<Task[]>([{ id: Date.now(), text: '', requiresPhoto: false }]);
  const [schedule, setSchedule] = useState<Schedule>({ type: 'daily', daysOfWeek: [], startTime: null, endTime: null });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Role-based route protection
  useEffect(() => {
    if (!authLoading && user && user.role !== 'manager') {
      router.push('/manager/tasks');
    }
  }, [user, authLoading, router]);

  const fetchAllItems = async () => {
    if (user && user.stores && user.stores.length > 0) {
      console.log('Debug - fetchAllItems called with selectedStoreId:', selectedStoreId); // Debug log
      
      try {
        let allItems: ChecklistTemplateType[] = [];
        
        if (selectedStoreId === 'all') {
          // Fetch data from all stores in parallel
          console.log('Debug - fetching from all stores:', user.stores); // Debug log
          const allStorePromises = user.stores.map(async (storeId: string) => {
            return await getChecklistTemplates(storeId, true);
          });
          
          const allStoreResults = await Promise.all(allStorePromises);
          
          // Flatten and combine results from all stores
          allItems = allStoreResults.flat();
          console.log('Debug - combined items from all stores:', allItems.length); // Debug log
        } else {
          // Fetch data from specific store
          console.log('Debug - fetching from specific store:', selectedStoreId); // Debug log
          allItems = await getChecklistTemplates(selectedStoreId, true);
        }
        
        console.log('Debug - getChecklistTemplates returned:', allItems); // Debug log
        console.log('Debug - Number of items returned:', allItems.length); // Debug log
        setAllItems(allItems);
      } catch (error) {
        console.error('Debug - getChecklistTemplates error:', error); // Debug log
        setError('לא ניתן היה לטעון את רשימת הפריטים הקיימים.');
      }
    } else {
      console.log('Debug - fetchAllItems skipped - no user or stores'); // Debug log
    }
  };

  const fetchUniversalTemplates = async () => {
    try {
      const response = await axios.get('/checklists/universal-templates');
      setUniversalTemplates(response.data);
    } catch (err) {
      console.error('Failed to fetch universal templates:', err);
    }
  };

  useEffect(() => {
    fetchAllItems();
    fetchUniversalTemplates();
  }, [user, selectedStoreId]);

  useEffect(() => {
    if (mode === 'schedule-universal' && selectedUniversalTemplate && user?.stores?.[0]) {
      console.log('Debug - allItems:', allItems); // Debug log
      console.log('Debug - selectedUniversalTemplate:', selectedUniversalTemplate); // Debug log
      console.log('Debug - user store:', user.stores[0]); // Debug log
      
      if (selectedUniversalTemplate.startsWith('existing-')) {
        // Editing an existing instance
        const instanceId = selectedUniversalTemplate.replace('existing-', '');
        const existingInstance = allItems.find(item => item._id === instanceId);
        console.log('Debug - looking for instanceId:', instanceId); // Debug log
        console.log('Debug - found existingInstance:', existingInstance); // Debug log
        
        if (existingInstance) {
          console.log('Loading existing instance for editing:', existingInstance); // Debug log
          setName(existingInstance.name);
          setDescription(existingInstance.description || '');
          setTasks(existingInstance.tasks.map((task: any, index: number) => ({
            id: Date.now() + index + Math.random(),
            text: task.text,
            requiresPhoto: task.requiresPhoto
          })));
          
          if (existingInstance.schedule) {
            console.log('Loading existing schedule:', existingInstance.schedule); // Debug log
            const startTime = parseTimeString(existingInstance.schedule.startTime);
            const endTime = parseTimeString(existingInstance.schedule.endTime);
            
            setSchedule({
              type: existingInstance.schedule.type || 'daily',
              daysOfWeek: existingInstance.schedule.daysOfWeek || [],
              startTime: startTime,
              endTime: endTime,
            });
          }
        }
      } else {
        // Creating new instance from template
        const template = universalTemplates.find(t => t._id === selectedUniversalTemplate);
        console.log('Debug - looking for template with id:', selectedUniversalTemplate); // Debug log
        console.log('Debug - found template:', template); // Debug log
        console.log('Debug - checking for existing instances with universalTemplateId:', selectedUniversalTemplate); // Debug log
        const existingInstances = allItems.filter(item => {
          const utid = typeof item.universalTemplateId === 'string'
            ? item.universalTemplateId
            : (item.universalTemplateId as any)?._id;
          // When selectedStoreId is 'all', show instances from all stores
          // When selectedStoreId is specific, only show instances from that store
          const matchesStore = selectedStoreId === 'all' ? 
            user.stores!.includes(item.store!) : 
            item.store === selectedStoreId;
          return utid === selectedUniversalTemplate && matchesStore;
        });
        console.log('Debug - found existing instances:', existingInstances); // Debug log
        
        if (template) {
          console.log('Loading template for new instance:', template); // Debug log
          setName(template.name);
          setDescription(template.description || '');
          setTasks(template.tasks.map((task: any) => ({
            id: Date.now() + Math.random(),
            text: task.text,
            requiresPhoto: task.requiresPhoto
          })));
          
          // Reset to default schedule for new instance
          console.log('Using default schedule for new instance'); // Debug log
          setSchedule({ type: 'daily', daysOfWeek: [], startTime: null, endTime: null });
        }
      }
    } else if (mode === 'schedule-universal') {
      setName('');
      setDescription('');
      setTasks([{ id: Date.now(), text: '', requiresPhoto: false }]);
      setSchedule({ type: 'daily', daysOfWeek: [], startTime: null, endTime: null });
    }
  }, [selectedUniversalTemplate, mode, universalTemplates, allItems, user]);

  useEffect(() => {
    if (mode === 'update' && editingId) {
      setIsLoading(true);
      
      getChecklistTemplateById(editingId)
        .then(item => {
          console.log('Loading item for update:', item); // Debug log
          setName(item.name);
          setDescription(item.description || '');
          setTasks(item.tasks.map((t, i) => ({ id: Date.now() + i, text: t.text, requiresPhoto: t.requiresPhoto })));
          setParentTemplateId(item.parentTemplate || '');
          
          // --- התיקון נמצא כאן ---
          if (item.schedule) {
            console.log('Setting schedule:', item.schedule); // Debug log
            const startTime = parseTimeString(item.schedule.startTime);
            const endTime = parseTimeString(item.schedule.endTime);
            console.log('Parsed times:', { startTime, endTime }); // Debug log
            
            setSchedule({
              type: item.schedule.type || 'daily',
              daysOfWeek: item.schedule.daysOfWeek || [],
              startTime: startTime,
              endTime: endTime,
            });
          } else {
            console.log('No valid schedule found in item, schedule:', item.schedule); // Debug log
            // Keep existing schedule if no schedule in item
          }
          // --------------------

          setIsLoading(false);
        }).catch((err) => {
          console.error('Error loading item:', err); // Debug log
          setError('שגיאה בטעינת פרטי הפריט.');
          setIsLoading(false);
        });
    }
  }, [editingId, mode]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setTasks([{ id: Date.now(), text: '', requiresPhoto: false }]);
    setParentTemplateId('');
    setEditingId('');
    setSelectedUniversalTemplate('');
    setSchedule({ type: 'daily', daysOfWeek: [], startTime: null, endTime: null });
  };

  const handleModeChange = (event: React.MouseEvent<HTMLElement>, newMode: EditorMode | null) => {
    if (newMode !== null) {
      setMode(newMode);
      resetForm();
    }
  };
  
  const handleAddTask = () => setTasks([...tasks, { id: Date.now(), text: '', requiresPhoto: false }]);
  const handleDeleteTask = (id: number) => setTasks(tasks.filter((task) => task.id !== id));
  const handleTaskChange = (id: number, field: 'text' | 'requiresPhoto', value: string | boolean) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, [field]: value } : task)));
  };
   const handleDayChange = (dayIndex: number, isChecked: boolean) => {
    setSchedule(prev => {
      const newDays = isChecked ? [...prev.daysOfWeek, dayIndex] : prev.daysOfWeek.filter(d => d !== dayIndex);
      return { ...prev, daysOfWeek: newDays.sort() };
    });
  };
  const formatTime = (date: Date | null): string => date ? date.toTimeString().slice(0, 5) : '';

  // Check if we're editing a universal task instance (not template)
  const isEditingUniversalInstance = Boolean(mode === 'update' && editingId && 
    allItems.find(i => i._id === editingId)?.taskType === 'universal' && 
    allItems.find(i => i._id === editingId)?.isUniversalTemplate === false);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    if (!user || !user.stores || user.stores.length === 0) {
      setError("למשתמש לא משויכות חנויות.");
      setIsLoading(false);
      return;
    }

    if (mode === 'schedule-universal' && !selectedUniversalTemplate) {
      setError("יש לבחור תבנית כללית לתזמון");
      setIsLoading(false);
      return;
    }

    // Different validation for universal task instances vs regular items
    if (mode === 'schedule-universal') {
      // In the universal scheduling screen (both create and edit), only require schedule
      if (!schedule.startTime || !schedule.endTime) {
        setError("יש לספק את שעות התחלה והסיום");
        setIsLoading(false);
        return;
      }
    } else if (isEditingUniversalInstance) {
      // For universal task instances, only validate schedule
      if (!schedule.startTime || !schedule.endTime) {
        setError("יש לספק את שעות התחלה והסיום");
        setIsLoading(false);
        return;
      }
    } else {
      // For regular items, validate all fields
      if (!name || tasks.some(t => !t.text) || !schedule.startTime || !schedule.endTime) {
        setError("יש לספק את כל השדות הנדרשים, כולל שעות התחלה וסיום");
        setIsLoading(false);
        return;
      }
    }
    // הסרנו את הבדיקה לשיוך תבנית - משימות מתוזמנות עומדות בפני עצמן

    // Determine target stores based on selectedStoreId
    const targetStoreIds: string[] = selectedStoreId === 'all' ? user.stores : [selectedStoreId];
    console.log('Debug - Target stores for save operation:', targetStoreIds); // Debug log

  let templateData: any;
    
    if (mode === 'update' && editingId) {
      // For updates, preserve the existing item's structure and only update necessary fields
      const existingItem = allItems.find(i => i._id === editingId);
      
      // If this is a universal task instance (not template), managers can only update schedule
      if (existingItem?.taskType === 'universal' && existingItem?.isUniversalTemplate === false) {
        console.log('Building template data for universal task instance update'); // Debug log
        console.log('Existing item:', existingItem); // Debug log
        templateData = {
          // For universal task instances, only allow schedule updates
          schedule: {
            type: schedule.type,
            daysOfWeek: schedule.daysOfWeek,
            startTime: schedule.startTime ? formatTime(schedule.startTime) : '',
            endTime: schedule.endTime ? formatTime(schedule.endTime) : '',
          },
          // Preserve all other fields exactly as they are
          name: existingItem.name,
          description: existingItem.description,
          tasks: existingItem.tasks,
          store: existingItem.store,
          type: existingItem.type,
          taskType: existingItem.taskType,
          universalTemplateId: existingItem.universalTemplateId,
          parentTemplate: existingItem.parentTemplate,
          isUniversalTemplate: existingItem.isUniversalTemplate
        };
        console.log('Template data for universal instance:', templateData); // Debug log
      } else {
        // For regular templates and tasks, allow full updates
        templateData = {
          name,
          description,
          tasks: tasks.map(t => ({text: t.text, requiresPhoto: t.requiresPhoto})),
          schedule: {
            type: schedule.type,
            daysOfWeek: schedule.daysOfWeek,
            startTime: schedule.startTime ? formatTime(schedule.startTime) : '',
            endTime: schedule.endTime ? formatTime(schedule.endTime) : '',
          },
          // Preserve existing fields that shouldn't change during update
          store: existingItem?.store || targetStoreIds[0], // Use first target store for updates
          type: existingItem?.type,
          taskType: existingItem?.taskType,
          universalTemplateId: existingItem?.universalTemplateId,
          parentTemplate: existingItem?.parentTemplate,
          isUniversalTemplate: existingItem?.isUniversalTemplate
        };
      }
    } else {
      // For new items, use the original logic
      templateData = {
        name,
        description,
        store: targetStoreIds[0], // Will be replaced per store in the save operation
        tasks: tasks.map(t => ({text: t.text, requiresPhoto: t.requiresPhoto})),
        schedule: {
          type: schedule.type,
          daysOfWeek: schedule.daysOfWeek,
          startTime: schedule.startTime ? formatTime(schedule.startTime) : '',
          endTime: schedule.endTime ? formatTime(schedule.endTime) : '',
        },
        type: mode === 'schedule-universal' ? 'task' : mode,
        taskType: mode === 'task' ? 'store' : 
                  mode === 'schedule-universal' ? 'universal' : undefined,
        universalTemplateId: mode === 'schedule-universal' ? 
          (selectedUniversalTemplate.startsWith('existing-') ? 
            (() => {
              const inst = allItems.find(item => item._id === selectedUniversalTemplate.replace('existing-', ''));
              const utid = inst ? (typeof inst.universalTemplateId === 'string' ? inst.universalTemplateId : (inst.universalTemplateId as any)?._id) : undefined;
              return utid;
            })() :
            selectedUniversalTemplate) : undefined,
        isUniversalTemplate: mode === 'schedule-universal' ? false : undefined, // Manager creates instances, not templates
        parentTemplate: null // משימות מתוזמנות לא משויכות לתבנית
      };
    }
    
    try {
      console.log('Save operation starting:', { mode, editingId, isEditingUniversalInstance }); // Debug log
      console.log('Template data being sent:', templateData); // Debug log
      
      // Check if we should update or create
      const isEditingExistingInstance = selectedUniversalTemplate?.startsWith('existing-');
      const shouldUpdate = (mode === 'update' && editingId) || 
                          (mode === 'schedule-universal' && isEditingExistingInstance);
      
      let savedItems: any[] = [];
      let operationName = '';
      
      if (shouldUpdate) {
        // For updates, we only update the specific item (not multiple stores)
        let updateId = editingId;
        
        // If in schedule-universal mode and editing existing instance
        if (mode === 'schedule-universal' && isEditingExistingInstance) {
          updateId = selectedUniversalTemplate.replace('existing-', '');
          console.log('Updating existing universal task instance:', updateId); // Debug log
          // When editing a universal instance in this screen, send schedule-only payload
          templateData = {
            schedule: {
              type: schedule.type,
              daysOfWeek: schedule.daysOfWeek,
              startTime: schedule.startTime ? formatTime(schedule.startTime) : '',
              endTime: schedule.endTime ? formatTime(schedule.endTime) : '',
            }
          } as any;
        }
        
        if (updateId) {
          console.log('Updating existing item with ID:', updateId); // Debug log
          const updatedItem = await updateChecklistTemplate(updateId, templateData);
          console.log('Update successful:', updatedItem); // Debug log
          savedItems.push(updatedItem);
          operationName = 'עודכן';
        } else {
          console.log('Creating new item (no existing instance found)'); // Debug log
          // For creation, use the first target store
          const dataForStore = { ...templateData, store: targetStoreIds[0] };
          const newItem = await createChecklistTemplate(dataForStore);
          console.log('Creation successful:', newItem); // Debug log
          savedItems.push(newItem);
          operationName = 'נוצר';
        }
      } else {
        // For new items, create them for all target stores
        console.log('Creating new items for stores:', targetStoreIds); // Debug log
        operationName = 'נוצר';
        
        const createPromises = targetStoreIds.map(async (storeId: string) => {
          const dataForStore = { ...templateData, store: storeId };
          console.log(`Creating item for store ${storeId}:`, dataForStore); // Debug log
          return await createChecklistTemplate(dataForStore);
        });
        
        savedItems = await Promise.all(createPromises);
        console.log('All items created successfully:', savedItems); // Debug log
      }
      
      // Generate success message
      if (savedItems.length === 1) {
        setSuccess(`פריט "${savedItems[0].name}" ${operationName} בהצלחה!`);
      } else {
        setSuccess(`${savedItems.length} פריטים ${operationName === 'נוצר' ? 'נוצרו' : 'עודכנו'} בהצלחה ב-${targetStoreIds.length} חנויות!`);
      }
      
      resetForm();
      fetchAllItems();
    } catch (err: any) {
      console.error('Save operation failed:', err); // Debug log
      setError(err.toString());
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await deleteChecklistTemplate(editingId);
      setSuccess('הפריט נמחק בהצלחה!');
      setDeleteDialogOpen(false);
      resetForm();
      setEditingId('');
      setMode('template'); // Reset to template mode
      fetchAllItems();
    } catch (err: any) {
      console.error('Delete operation failed:', err);
      setError('שגיאה במחיקת הפריט: ' + err.toString());
    } finally {
      setIsDeleting(false);
    }
  };
  
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

  // Show loading spinner while checking authentication
  if (authLoading || !user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Show loading spinner for unauthorized users (redirect will happen)
  if (user.role !== 'manager') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={he}>
      <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <ToggleButtonGroup value={mode} exclusive onChange={handleModeChange}>
              <ToggleButton value="template">יצירת תבנית</ToggleButton>
              <ToggleButton value="task">יצירת משימה</ToggleButton>
              <ToggleButton value="schedule-universal">תזמון תבנית כללית</ToggleButton>
              <ToggleButton value="update">עדכון פריט קיים</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          
          <Typography variant="h5" component="h1" gutterBottom>
            {mode === 'update' ? 'עדכון פריט' : 
             mode === 'template' ? 'יצירת תבנית בסיס' : 
             mode === 'schedule-universal' ? 'תזמון תבנית כללית' :
             'יצירת משימה מתוזמנת'}
          </Typography>

          {isEditingUniversalInstance && (
            <Alert severity="info" sx={{ mb: 2 }}>
              אתה עורך משימה כללית מתוזמנת. ניתן לשנות רק את התזמון. השם, התיאור והמשימות נקבעים על ידי המנהל הראשי.
            </Alert>
          )}

          {mode === 'schedule-universal' && (
            <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
              <InputLabel>בחר תבנית כללית לתזמון</InputLabel>
              <Select 
                value={selectedUniversalTemplate} 
                label="בחר תבנית כללית לתזמון" 
                onChange={(e) => setSelectedUniversalTemplate(e.target.value)}
              >
                {universalTemplates
                  .slice()
                  .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'))
                  .flatMap((template) => {
                    // Instances for this template and store(s)
                    const instances = allItems.filter(item => {
                      const utid = typeof item.universalTemplateId === 'string'
                        ? item.universalTemplateId
                        : (item.universalTemplateId as any)?._id;
                      
                      if (selectedStoreId === 'all') {
                        // Show instances from all stores
                        return utid === template._id;
                      } else {
                        // Show instances only from selected store
                        return utid === template._id && item.store === selectedStoreId;
                      }
                    });

                    const sortedInstances = instances.slice().sort((a, b) => {
                      const at = a?.schedule?.startTime || '';
                      const bt = b?.schedule?.startTime || '';
                      return at.localeCompare(bt);
                    });

                    return [
                      <ListSubheader key={`${template._id}-hdr`} disableSticky>
                        {template.name}
                      </ListSubheader>,
                      <MenuItem key={`${template._id}-new`} value={template._id}>
                        יצירת תזמון חדש{template.description ? ` (${template.description})` : ''}
                      </MenuItem>,
                      ...(sortedInstances.length > 0
                        ? [<ListSubheader key={`${template._id}-exist-hdr`} disableSticky>תזמונים קיימים</ListSubheader>]
                        : []),
                      ...sortedInstances.map((instance) => (
                        <MenuItem key={`${template._id}-${instance._id}`} value={`existing-${instance._id}`}>
                          {instance.schedule?.startTime}-{instance.schedule?.endTime}
                        </MenuItem>
                      )),
                    ];
                  })}
              </Select>
            </FormControl>
          )}

          {mode === 'update' && (
            <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
              <InputLabel>בחר פריט לעריכה</InputLabel>
              <Select value={editingId} label="בחר פריט לעריכה" onChange={(e) => setEditingId(e.target.value)}>
                {allItems
                  .filter((item) => item.taskType !== 'universal')
                  .map((item) => (
                  <MenuItem 
                    key={item._id} 
                    value={item._id}
                  >
                    {`(${item.type === 'template' ? 'תבנית' : 'משימה'}) ${item.name}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* הסרנו את הבחירת תבנית האב - משימות מתוזמנות עומדות בפני עצמן */}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {mode !== 'schedule-universal' && (
              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  label={mode === 'template' ? "שם התבנית" : "כותרת המשימה"} 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  disabled={isLoading || isEditingUniversalInstance} 
                  helperText={isEditingUniversalInstance ? "לא ניתן לשנות שם של משימה כללית מתוזמנת" : ""}
                />
              </Grid>
            )}
            {mode === 'template' && (
              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  label="תיאור (אופציונלי)" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  disabled={isLoading || isEditingUniversalInstance} 
                  helperText={isEditingUniversalInstance ? "לא ניתן לשנות תיאור של משימה כללית מתוזמנת" : ""}
                />
              </Grid>
            )}
          </Grid>

          {mode !== 'schedule-universal' && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom>
                {mode === 'template' ? 'משימות בתבנית' : 'פירוט המשימה'}
              </Typography>

              {tasks.map((task) => (
                <Box key={task.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                  <TextField 
                    variant="standard" 
                    placeholder="משימה" 
                    value={task.text} 
                    onChange={(e) => handleTaskChange(task.id, 'text', e.target.value)} 
                    sx={{ flexGrow: 1 }} 
                    disabled={isLoading || isEditingUniversalInstance} 
                  />
                  <FormControlLabel 
                    control={
                      <Switch 
                        checked={task.requiresPhoto} 
                        onChange={(e) => handleTaskChange(task.id, 'requiresPhoto', e.target.checked)} 
                        disabled={isEditingUniversalInstance}
                      />
                    } 
                    label={<PhotoCamera />} 
                    labelPlacement="start" 
                  />
                  {tasks.length > 1 && (
                    <IconButton onClick={() => handleDeleteTask(task.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              ))}

              {(mode === 'template' || mode === 'update') && (
                <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddTask}>
                  הוסף משימה
                </Button>
              )}
            </>
          )}

          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>תזמון</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}><FormControl fullWidth><InputLabel>תדירות</InputLabel><Select value={schedule.type} label="תדירות" onChange={(e) => setSchedule({ ...schedule, type: e.target.value as 'daily' | 'weekly', daysOfWeek: [] })}><MenuItem value="daily">יומי</MenuItem><MenuItem value="weekly">שבועי</MenuItem></Select></FormControl></Grid>
            <Grid item xs={6} sm={4}><TimePicker label="שעת התחלה" value={schedule.startTime} onChange={(v) => setSchedule({ ...schedule, startTime: v })} ampm={false} /></Grid>
            <Grid item xs={6} sm={4}><TimePicker label="שעת סיום" value={schedule.endTime} onChange={(v) => setSchedule({ ...schedule, endTime: v })} ampm={false} /></Grid>
          </Grid>
          {schedule.type === 'weekly' && (<FormGroup sx={{ mt: 2, display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>{days.map((day, index) => (<FormControlLabel key={day} control={<Checkbox checked={schedule.daysOfWeek.includes(index)} onChange={(e) => handleDayChange(index, e.target.checked)} />} label={day} />))}</FormGroup>)}

          <Box sx={{ mt: 4 }}>
             {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
             {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            
            <Grid container spacing={2}>
              <Grid item xs={mode === 'update' && editingId ? 8 : 12}>
                <Button variant="contained" color="primary" size="large" onClick={handleSave} disabled={isLoading || isDeleting} fullWidth>
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : (mode === 'update' ? 'עדכן' : 'שמור')}
                </Button>
              </Grid>
              {mode === 'update' && editingId && (
                <Grid item xs={4}>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    size="large" 
                    onClick={() => setDeleteDialogOpen(true)} 
                    disabled={isLoading || isDeleting}
                    fullWidth
                  >
                    {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'מחק'}
                  </Button>
                </Grid>
              )}
            </Grid>
          </Box>

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            dir="rtl"
          >
            <DialogTitle>אישור מחיקה</DialogTitle>
            <DialogContent>
              <DialogContentText>
                האם אתה בטוח שברצונך למחוק את הפריט "{name}"? פעולה זו לא ניתנת לביטול.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
                ביטול
              </Button>
              <Button onClick={handleDelete} color="error" disabled={isDeleting}>
                {isDeleting ? <CircularProgress size={20} color="inherit" /> : 'מחק'}
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default ChecklistEditorPage;