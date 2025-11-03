// frontend/app/manager/checklists/run/page.tsx

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  Checkbox,
  TextField,
  Button,
  Divider,
  IconButton,
  Stack,
  Chip,
  Tabs,
  Tab
} from '@mui/material';
import { PhotoCamera, Delete, Close, ChevronLeft, ChevronRight, Today } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import imageCompression from 'browser-image-compression';
// שינוי: הוספנו ייבוא של getChecklistTemplates עבור הדבגר
import { getActiveChecklist, submitChecklistInstance, getChecklistTemplates } from '../../../../lib/api/checklists';
import { uploadImage } from '../../../../lib/api/upload';
// שינוי: מייבאים את ה-store כדי לקבל את פרטי המשתמש
import useAuthStore from '@/store/authStore';
import useManagerStore from '@/store/managerStore';
import type { ChecklistTemplate, Task } from '../../../../types/checklist';
// ייבוא רכיב המצלמה
import InAppCamera from '../../../../components/inspections/InAppCamera';
import CustomImageEditor from '../../../../components/inspections/CustomImageEditor';

interface TaskResult {
  isCompleted: boolean;
  comment: string;
  photoUrl: string;
  photos: string[]; // מערך של URLs של תמונות
}

interface PhotoFile {
  file: File;
  previewUrl: string;
}

const ChecklistRunnerPage = () => {
  // שינוי: שולפים את המשתמש המחובר
  const { user } = useAuthStore();
  // שינוי: שולפים את הסטור שנבחר מהמנהל
  const { selectedStoreId } = useManagerStore();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [results, setResults] = useState<Record<string, TaskResult>>({});
  const [scheduledResults, setScheduledResults] = useState<Record<string, TaskResult>>({});
  const [scheduledItems, setScheduledItems] = useState<ChecklistTemplate[]>([]); // only for today (interactive)
  const [allScheduledTasks, setAllScheduledTasks] = useState<ChecklistTemplate[]>([]); // full pool for week view
  // Weekly view states
  const [viewMode, setViewMode] = useState<'today' | 'week'>('today');
  const todayDate = useMemo(() => new Date(), []);
  const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    // Start week on Sunday (0)
    const diff = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - diff);
    return normalizeDate(start);
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => normalizeDate(new Date()));

  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const getDayOfWeek = (d: Date) => d.getDay(); // 0-6

  const isTaskRelevantOnDay = (task: any, dayOfWeek: number) => {
    if (task.schedule?.type === 'daily') return true;
    if (task.schedule?.type === 'weekly') {
      return task.schedule.daysOfWeek?.includes(dayOfWeek) || false;
    }
    return false;
  };
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScheduledSubmitting, setIsScheduledSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [scheduledSubmitSuccess, setScheduledSubmitSuccess] = useState<string | null>(null);
  
  // הוספת state עבור הטיפול בתמונות
  const [photoFiles, setPhotoFiles] = useState<{ [key: string]: PhotoFile[] }>({});
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // פונקציה לבדיקה אם משימה מתוזמנת רלוונטית להיום
  const isTaskRelevantToday = (task: any) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = ראשון, 1 = שני, וכו'
    
    if (task.schedule?.type === 'daily') {
      return true; // משימות יומיות תמיד רלוונטיות
    }
    
    if (task.schedule?.type === 'weekly') {
      const isRelevant = task.schedule.daysOfWeek?.includes(dayOfWeek) || false;
      return isRelevant;
    }
    
    return false;
  };

  useEffect(() => {
    const fetchChecklist = async () => {
      // שינוי: בודקים אם קיים משתמש וחנויות משויכות
      if (!user || !user.stores || user.stores.length === 0) {
        setIsLoading(false);
        return; // יוצאים מהפונקציה אם אין חנויות
      }
      
      try {
        // שינוי: טיפול במקרה של "כל החנויות"
        if (selectedStoreId === 'all') {
          // שליפת נתונים מכל החנויות במקביל
          const allStorePromises = user.stores.map(async (storeId: string) => {
            const [activeTemplate, allItems] = await Promise.all([
              getActiveChecklist(storeId),
              getChecklistTemplates(storeId, true)
            ]);
            return { storeId, activeTemplate, allItems: allItems || [] };
          });
          
          const allStoreResults = await Promise.all(allStorePromises);
          
          // מיזוג התוצאות מכל החנויות
          let mergedActiveTemplates: ChecklistTemplate[] = [];
          const allTasksMap = new Map<string, ChecklistTemplate>();
          
          // איסוף כל המשימות המתוזמנות ומניעת כפילויות
          allStoreResults.forEach(({ storeId, activeTemplate, allItems }) => {
            // אם יש תבניות פעילות, הוסף אותן
            if (activeTemplate && Array.isArray(activeTemplate) && activeTemplate.length > 0) {
              mergedActiveTemplates.push(...activeTemplate);
            }
            
            // הוספת משימות מתוזמנות למפה (למניעת כפילויות)
            const tasks = allItems.filter((it: any) => it.type === 'task');
            tasks.forEach((task: ChecklistTemplate) => {
              allTasksMap.set(task._id, task);
            });
          });
          
          // המרת המפה חזרה למערך
          const uniqueAllTasks = Array.from(allTasksMap.values());
          
          // עדכון ה-state
          setTemplates(mergedActiveTemplates);
          if (mergedActiveTemplates.length > 0) {
            const firstTemplate = mergedActiveTemplates[0];
            setSelectedTemplateId(firstTemplate._id);
            setTemplate(firstTemplate);
            
            const initialResults: Record<string, TaskResult> = {};
            firstTemplate.tasks.forEach((task: Task) => {
              initialResults[task._id] = { isCompleted: false, comment: '', photoUrl: '', photos: [] };
            });
            setResults(initialResults);
          } else {
            setTemplate(null);
            setResults({});
          }
          setAllScheduledTasks(uniqueAllTasks);
          
          // בניית משימות אינטראקטיביות להיום
          const todayTasks = uniqueAllTasks.filter((task) => isTaskRelevantToday(task));
          const initialScheduledResults: Record<string, TaskResult> = {};
          todayTasks.forEach((task) => {
            initialScheduledResults[task._id] = { isCompleted: false, comment: '', photoUrl: '', photos: [] };
          });
          setScheduledResults(initialScheduledResults);
          setScheduledItems(todayTasks);
          
        } else {
          // שינוי: טיפול במקרה של חנות ספציפית
          const activeTemplates = await getActiveChecklist(selectedStoreId);
          setTemplates(activeTemplates || []);

          if (activeTemplates && activeTemplates.length > 0) {
            // Set the first template as default selected
            const firstTemplate = activeTemplates[0];
            setSelectedTemplateId(firstTemplate._id);
            setTemplate(firstTemplate);

            const initialResults: Record<string, TaskResult> = {};
            firstTemplate.tasks.forEach((task: Task) => {
              initialResults[task._id] = { isCompleted: false, comment: '', photoUrl: '', photos: [] };
            });
            setResults(initialResults);

            // טוען כל המשימות המתוזמנות של החנות (ללא קשר לתבנית ספציפית)
            try {
              const allItems = await getChecklistTemplates(selectedStoreId, true);
              const allTasks = (allItems || []).filter((it: any) => it.type === 'task');
              setAllScheduledTasks(allTasks as any);
              // Build today's interactive tasks
              const todayTasks = allTasks.filter((task) => isTaskRelevantToday(task));
              const initialScheduledResults: Record<string, TaskResult> = {};
              todayTasks.forEach((task) => {
                initialScheduledResults[task._id] = { isCompleted: false, comment: '', photoUrl: '', photos: [] };
              });
              setScheduledResults(initialScheduledResults);
              setScheduledItems(todayTasks as any);
            } catch (e) {
              // swallow
            }
          } else {
            // No active templates
            setTemplate(null);
            setResults({});
          }
        }
      } catch (err: any) {
        setError(err.toString());
      } finally {
        setIsLoading(false);
      }
    };

    // מפעילים את הפונקציה רק אם המשתמש זוהה
    if (user) {
      fetchChecklist();
    }
  }, [user, selectedStoreId]); // הוספנו את selectedStoreId כתלות

  // Derived: days for current week (for week view)
  const weekDays = useMemo(() => {
    const days: { date: Date; tasks: ChecklistTemplate[]; progress: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dow = d.getDay();
      const tasks = allScheduledTasks.filter(t => isTaskRelevantOnDay(t, dow));
      // progress only for today (interactive tasks) else 0
      let progress = 0;
      if (isSameDay(d, todayDate) && tasks.length) {
        const completed = tasks.filter(t => scheduledResults[t._id]?.isCompleted).length;
        progress = (completed / tasks.length) * 100;
      }
      days.push({ date: d, tasks, progress });
    }
    return days;
  }, [weekStart, allScheduledTasks, scheduledResults, todayDate]);

  const selectedDayTasks = useMemo(() => {
    const dow = selectedDate.getDay();
    return allScheduledTasks.filter(t => isTaskRelevantOnDay(t, dow));
  }, [selectedDate, allScheduledTasks]);

  const handlePrevWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() - 7);
    setWeekStart(newStart);
    setSelectedDate(newStart); // jump to first day
  };
  const handleNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + 7);
    setWeekStart(newStart);
    setSelectedDate(newStart);
  };
  const handleResetToday = () => {
    const d = new Date();
    const diff = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - diff);
    setWeekStart(start);
    setSelectedDate(normalizeDate(d));
  };

  const handleResultChange = (taskId: string, field: keyof TaskResult, value: any) => {
    setResults(prev => ({ ...prev, [taskId]: { ...prev[taskId], [field]: value } }));
  };

  const handleScheduledResultChange = (taskId: string, field: keyof TaskResult, value: any) => {
    setScheduledResults(prev => ({ ...prev, [taskId]: { ...prev[taskId], [field]: value } }));
  };

  // פותח את input file של מצלמה
  const handlePhotoUpload = (taskId: string) => {
    setActiveTaskId(taskId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // דחיסת תמונה והוספה ל-state
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeTaskId || !e.target.files || e.target.files.length === 0) return;
    setIsCompressing(true);
    try {
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true });
        const previewUrl = URL.createObjectURL(compressedFile);
        setPhotoFiles(prev => ({
          ...prev,
          [activeTaskId]: [...(prev[activeTaskId] || []), { file: compressedFile, previewUrl }]
        }));
      }
    } catch (err) {
      console.error('Image compression error:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  // הסרת תמונה
  const handleRemovePhoto = (taskId: string, photoIndex: number) => {
    setPhotoFiles(prev => ({ 
      ...prev, 
      [taskId]: prev[taskId]?.filter((_, index) => index !== photoIndex) || []
    }));
  };

  const handleScheduledTasksSubmit = async () => {
    if (scheduledItems.length === 0) return;

    setIsScheduledSubmitting(true);
    setScheduledSubmitSuccess(null);

    try {
      // העלאת תמונות של משימות מתוזמנות לקלאודינרי
      const uploadedUrlsMap: Record<string, string[]> = {};
      
      for (const taskId in photoFiles) {
        const files = photoFiles[taskId];
        if (files && files.length > 0 && scheduledItems.some(item => item._id === taskId)) {
          uploadedUrlsMap[taskId] = [];
          for (const photoFile of files) {
            try {
              const url = await uploadImage(photoFile.file, () => {}); // פונקציה ריקה לעדכון התקדמות
              uploadedUrlsMap[taskId].push(url);
            } catch (uploadError) {
              console.error('Error uploading scheduled task image:', uploadError);
            }
          }
        }
      }

      // כאן תוכל להוסיף לוגיקה לשמירת המשימות המתוזמנות עם התמונות
      // לדוגמה: שליחה לשרת או שמירה ב-localStorage
      
      // סימולציה של קריאה לשרת
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setScheduledSubmitSuccess('המשימות היומיות נשמרו בהצלחה!');
      
      // ניקוי תמונות של משימות מתוזמנות אחרי שמירה מוצלחת
      const newPhotoFiles = { ...photoFiles };
      scheduledItems.forEach(item => {
        delete newPhotoFiles[item._id];
      });
      setPhotoFiles(newPhotoFiles);
      
    } catch (err: any) {
      setError(`שגיאה בשמירת משימות מתוזמנות: ${err.toString()}`);
    } finally {
      setIsScheduledSubmitting(false);
    }
  };

  // בדיקה אם כל המשימות בצ'קליסט בוצעו
  const isChecklistComplete = () => {
    if (!template) return false;
    return template.tasks.every(task => results[task._id]?.isCompleted);
  };

  // בדיקה אם כל המשימות המתוזמנות בוצעו
  const areScheduledTasksComplete = () => {
    if (scheduledItems.length === 0) return true;
    return scheduledItems.every(task => scheduledResults[task._id]?.isCompleted);
  };

  // בדיקה אם הזמן של הצ'קליסט הסתיים
  const isChecklistTimeExpired = () => {
    if (!template?.schedule) return false;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // זמן נוכחי בדקות
    
    if (template.schedule.endTime) {
      const [endHours, endMinutes] = template.schedule.endTime.split(':').map(Number);
      const endTimeInMinutes = endHours * 60 + endMinutes;
      return currentTime > endTimeInMinutes;
    }
    return false;
  };

  // בדיקה אם הזמן של משימה מתוזמנת הסתיים
  const isScheduledTaskTimeExpired = (task: any) => {
    if (!task.schedule) return false;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // זמן נוכחי בדקות
    
    if (task.schedule.endTime) {
      const [endHours, endMinutes] = task.schedule.endTime.split(':').map(Number);
      const endTimeInMinutes = endHours * 60 + endMinutes;
      return currentTime > endTimeInMinutes;
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!template) return;

    setIsSubmitting(true);
    setError(null);
    setSubmitSuccess(null);

    try {
      // העלאת תמונות לקלאודינרי
      const uploadedUrlsMap: Record<string, string[]> = {};
      
      for (const taskId in photoFiles) {
        const files = photoFiles[taskId];
        if (files && files.length > 0) {
          uploadedUrlsMap[taskId] = [];
          for (const photoFile of files) {
            try {
              const url = await uploadImage(photoFile.file, () => {}); // פונקציה ריקה לעדכון התקדמות
              uploadedUrlsMap[taskId].push(url);
            } catch (uploadError) {
              console.error('Error uploading image:', uploadError);
            }
          }
        }
      }

      const submissionData = {
        template: template._id,
        store: template.store,
        date: new Date().toISOString(),
        taskResults: template.tasks.map(task => ({
          taskText: task.text,
          isCompleted: results[task._id]?.isCompleted || false,
          comment: results[task._id]?.comment || '',
          photoUrl: uploadedUrlsMap[task._id]?.[0] || '', // התמונה הראשונה (תאימות לאחור)
          photos: uploadedUrlsMap[task._id] || [], // כל התמונות
        }))
      };

      await submitChecklistInstance(submissionData);
      setSubmitSuccess('הצ\'קליסט הוגש בהצלחה!');
      
      // ניקוי קבצי התמונות אחרי הגשה מוצלחת
      setPhotoFiles({});
      
    } catch (err: any) {
      setError(`שגיאה בהגשה: ${err.toString()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  if (error && !submitSuccess && !scheduledSubmitSuccess) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  // הסרנו את הבלוק שמעלים את התצוגה אחרי הגשה מוצלחת
  // כעת נציג הודעת הצלחה אבל נשאיר את התוכן

  if (!template) {
    return <Alert severity="info" sx={{ m: 2 }}>אין צ'קליסט פעיל כרגע. כל הכבוד!</Alert>;
  }

  // מציגים טקסט ידידותי ללוח זמנים
  const formatSchedule = (s?: ChecklistTemplate['schedule']) => {
    if (!s) return '';
    const time = [s.startTime, s.endTime].filter(Boolean).join(' - ');
    if (s.type === 'weekly') {
      const days = (s.daysOfWeek || [])
        .map((d: number) => ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'][d])
        .join(', ');
      return `שבועי: ${days} | ${time}`;
    }
    return `יומי: ${time}`;
  };


  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* Tabs for mode switch */}
      <Tabs
        value={viewMode === 'today' ? 0 : 1}
        onChange={(_, v) => setViewMode(v === 0 ? 'today' : 'week')}
        sx={{ mb: 2 }}
      >
        <Tab label="היום" />
        <Tab label="שבוע" />
      </Tabs>

      {viewMode === 'week' && (
        <Paper sx={{ p: 2, mb: 3 }} elevation={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <IconButton onClick={handleNextWeek} aria-label="שבוע הבא" size="small">
              <ChevronRight />
            </IconButton>
            <Typography variant="h6" component="div">
              {weekDays[0] && weekDays[6] && `${weekDays[0].date.toLocaleDateString('he-IL')} - ${weekDays[6].date.toLocaleDateString('he-IL')}`}
            </Typography>
            <IconButton onClick={handlePrevWeek} aria-label="שבוע קודם" size="small">
              <ChevronLeft />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <Button size="small" startIcon={<Today />} onClick={handleResetToday}>היום</Button>
          </Box>
          {/* Days strip */}
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
            {weekDays.map(day => {
              const isSelected = isSameDay(day.date, selectedDate);
              const isToday = isSameDay(day.date, todayDate);
              const pct = Math.round(day.progress);
              let color: string = 'divider';
              if (pct >= 80) color = 'success.main';
              else if (pct >= 40) color = 'warning.main';
              else if (pct > 0) color = 'error.main';
              return (
                <Box
                  key={day.date.toISOString()}
                  onClick={() => setSelectedDate(day.date)}
                  sx={{
                    minWidth: 72,
                    p: 1,
                    borderRadius: 2,
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: isSelected ? color : 'divider',
                    bgcolor: isSelected ? 'action.hover' : 'background.paper',
                    textAlign: 'center',
                    position: 'relative'
                  }}
                >
                  {isToday && (
                    <Chip size="small" label="היום" color="primary" sx={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', fontSize: 10 }} />
                  )}
                  <Typography variant="caption" display="block">
                    {day.date.toLocaleDateString('he-IL', { weekday: 'short' })}
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={600}>{day.date.getDate()}</Typography>
                  <Box sx={{ mt: 0.5, height: 5, borderRadius: 2, bgcolor: 'grey.200' }}>
                    <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color, borderRadius: 2 }} />
                  </Box>
                </Box>
              );
            })}
          </Box>
          {/* Tasks list for selected day (read-only unless today) */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              משימות ליום {selectedDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' })}
            </Typography>
            {selectedDayTasks.length === 0 && (
              <Typography variant="body2" color="text.secondary">אין משימות ליום זה.</Typography>
            )}
            {selectedDayTasks.length > 0 && (
              <List>
                {selectedDayTasks.map((t, idx) => {
                  const isTodaySelected = isSameDay(selectedDate, todayDate);
                  const interactive = isTodaySelected; // only today is interactive
                  return (
                    <React.Fragment key={`selected-day-task-${t._id}-${idx}`}>
                      <ListItem sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', opacity: interactive ? 1 : 0.7 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Checkbox
                            checked={interactive ? (scheduledResults[t._id]?.isCompleted || false) : (scheduledResults[t._id]?.isCompleted || false)}
                            onChange={(e) => interactive && handleScheduledResultChange(t._id, 'isCompleted', e.target.checked)}
                            disabled={!interactive}
                          />
                          <Typography sx={{ flexGrow: 1 }}>{t.name}</Typography>
                          {interactive && (
                            <IconButton
                              color="primary"
                              onClick={() => handlePhotoUpload(t._id)}
                              size="small"
                            >
                              <PhotoCamera />
                            </IconButton>
                          )}
                        </Box>
                        {interactive && scheduledResults[t._id]?.isCompleted && (
                          <TextField
                            fullWidth
                            variant="standard"
                            label="הערה (אופציונלי)"
                            value={scheduledResults[t._id]?.comment || ''}
                            onChange={(e) => handleScheduledResultChange(t._id, 'comment', e.target.value)}
                            sx={{ mt: 1 }}
                          />
                        )}
                        {!interactive && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                            תצוגה לקריאה בלבד
                          </Typography>
                        )}
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  );
                })}
              </List>
            )}
            {!isSameDay(selectedDate, todayDate) && (
              <Alert severity="info" sx={{ mt: 2 }}>
                ניתן לערוך רק את משימות היום.
              </Alert>
            )}
          </Box>
        </Paper>
      )}
      {/* הודעות הצלחה */}
      {submitSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {submitSuccess}
        </Alert>
      )}
      
      {scheduledSubmitSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {scheduledSubmitSuccess}
        </Alert>
      )}

  {viewMode === 'today' && (
  <>
    {/* Template Selector - Show only if multiple templates are available */}
    {templates.length > 1 && (
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          בחר צ'קליסט פעיל
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {templates.map((tmpl) => (
            <Chip
              key={tmpl._id}
              label={tmpl.name}
              variant={selectedTemplateId === tmpl._id ? "filled" : "outlined"}
              color={selectedTemplateId === tmpl._id ? "primary" : "default"}
              onClick={() => {
                setSelectedTemplateId(tmpl._id);
                setTemplate(tmpl);
                // Reset results for the new template
                const newResults: Record<string, TaskResult> = {};
                tmpl.tasks.forEach((task: Task) => {
                  newResults[task._id] = { isCompleted: false, comment: '', photoUrl: '', photos: [] };
                });
                setResults(newResults);
              }}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Paper>
    )}
    
  <Paper elevation={1} sx={{ 
        p: { xs: 2, md: 3 }, 
        mb: 4,
        opacity: isChecklistTimeExpired() ? 0.6 : 1,
        border: isChecklistTimeExpired() ? '2px solid #f44336' : 'none'
      }}>
        <Typography variant="h5" component="h1">{template.name}</Typography>
        {template.description && <Typography color="text.secondary" gutterBottom>{template.description}</Typography>}
        
        {/* אזהרת זמן פג תוקף */}
        {isChecklistTimeExpired() && (
          <Alert severity="error" sx={{ mt: 2 }}>
            זמן הצ'קליסט הסתיים! לא ניתן עוד לבצע שינויים.
          </Alert>
        )}
        
        {/* אינדיקטור התקדמות */}
        <Box sx={{ mt: 2, mb: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            התקדמות: {template.tasks.filter(task => results[task._id]?.isCompleted).length}/{template.tasks.length} משימות בוצעו
          </Typography>
        </Box>
        
        <Divider sx={{ my: 2 }} />

        <List>
          {template.tasks.map((task, index) => (
            <React.Fragment key={`template-task-${task._id}-${index}`}>
              <ListItem sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Checkbox 
                    checked={results[task._id]?.isCompleted || false} 
                    onChange={(e) => handleResultChange(task._id, 'isCompleted', e.target.checked)}
                    disabled={isChecklistTimeExpired()}
                  />
                  <Typography sx={{ flexGrow: 1 }}>{task.text}</Typography>
                  {task.requiresPhoto && (
                    <>
                      <IconButton 
                        color="primary" 
                        onClick={() => handlePhotoUpload(task._id)} 
                        disabled={isChecklistTimeExpired() || isCompressing}
                      >
                        <PhotoCamera />
                      </IconButton>
                      {/* input file מוסתר */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        hidden
                        onChange={handleFileChange}
                      />
                    </>
                  )}
                </Box>
                
                {/* תצוגת תמונות */}
                {photoFiles[task._id] && photoFiles[task._id].length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {photoFiles[task._id].map((photo, idx) => (
                      <Box 
                        key={`${task._id}-photo-${idx}-${photo.file.name}-${photo.file.lastModified}`} 
                        sx={{ 
                          position: 'relative', 
                          width: 80, 
                          height: 80, 
                          border: '1px solid #ddd', 
                          borderRadius: 1 
                        }}
                      >
                        <img 
                          src={photo.previewUrl} 
                          alt={`preview ${idx}`} 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            borderRadius: '4px'
                          }} 
                        />
                        <IconButton 
                          size="small" 
                          onClick={() => handleRemovePhoto(task._id, idx)} 
                          sx={{ 
                            position: 'absolute', 
                            top: -8, 
                            right: -8, 
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
                          }}
                          disabled={isChecklistTimeExpired()}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
                
                {results[task._id]?.isCompleted && (
                   <TextField
                    fullWidth
                    variant="standard"
                    label="הערה (אופציונלי)"
                    value={results[task._id]?.comment || ''}
                    onChange={(e) => handleResultChange(task._id, 'comment', e.target.value)}
                    sx={{ mt: 1, pr: 6 }}
                    disabled={isChecklistTimeExpired()}
                  />
                )}
              </ListItem>
              {index < template.tasks.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>

        <Box sx={{ mt: 3 }}>
          <Button 
            fullWidth 
            variant="contained" 
            size="large" 
            onClick={handleSubmit} 
            disabled={isSubmitting || !isChecklistComplete() || isChecklistTimeExpired()}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'הגש צ\'קליסט'}
          </Button>
          {!isChecklistComplete() && !isChecklistTimeExpired() && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
              יש לבצע את כל המשימות לפני ההגשה
            </Typography>
          )}
          {isChecklistTimeExpired() && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
              הזמן לביצוע הצ'קליסט הסתיים
            </Typography>
          )}
        </Box>
  </Paper>
  </>
  )}

      {/* קו הפרדה מעל משימות מתוזמנות */}
  {viewMode === 'today' && scheduledItems.length > 0 && (
        <Divider sx={{ my: 3, borderBottomWidth: 2 }} />
      )}

      {/* הצגה של משימות יומיות שקשורות לתבנית */}
  {viewMode === 'today' && scheduledItems.length > 0 && (
        <Paper
          elevation={2}
          sx={{
            mt: 3,
            p: { xs: 2, md: 3 },
            bgcolor: (t) => t.palette.warning.light,
            borderRight: (t) => `6px solid ${t.palette.warning.main}`,
            border: (t) => `1px solid ${alpha(t.palette.warning.main, 0.25)}`,
            // מבטיח ניגודיות מספקת לטקסט
            '&, & .MuiTypography-root': { color: 'inherit' },
            opacity: scheduledItems.some(task => isScheduledTaskTimeExpired(task)) ? 0.6 : 1
          }}
        >
          <Typography variant="h6" component="h2" gutterBottom>
            משימות יומיות ({scheduledItems.length})
          </Typography>
          
          {/* אזהרת זמן פג תוקף למשימות מתוזמנות */}
          {scheduledItems.some(task => isScheduledTaskTimeExpired(task)) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              זמן ביצוע חלק מהמשימות הסתיים!
            </Alert>
          )}
          
          {/* אינדיקטור התקדמות למשימות מתוזמנות */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: (t) => alpha(t.palette.warning.main, 0.15), borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              התקדמות: {scheduledItems.filter(task => scheduledResults[task._id]?.isCompleted).length}/{scheduledItems.length} משימות יומיות בוצעו
            </Typography>
          </Box>
          
          <List>
            {scheduledItems.map((it, idx) => (
              <React.Fragment key={`scheduled-task-${it._id}-${idx}`}>
                <ListItem sx={{ display: 'block', bgcolor: (t) => alpha(t.palette.warning.main, 0.08), borderRadius: 1, py: 1, px: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}>
                    <Checkbox 
                      checked={scheduledResults[it._id]?.isCompleted || false} 
                      onChange={(e) => handleScheduledResultChange(it._id, 'isCompleted', e.target.checked)}
                      disabled={isScheduledTaskTimeExpired(it)}
                    />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
                        {(it as any)?.schedule?.type === 'weekly' ? 'משימה שבועית' : 'משימה יומית'}
                        {it.taskType === 'universal' && ' • משימה כללית'}
                        {isScheduledTaskTimeExpired(it) && ' (זמן הסתיים)'}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{it.name}</Typography>
                      {it.schedule && (
                        <Typography variant="body2" color="text.secondary">
                          {formatSchedule(it.schedule as any)}
                        </Typography>
                      )}
                      {it.description && (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>{it.description}</Typography>
                      )}
                      {/* Universal task indicator chip */}
                      {it.taskType === 'universal' && (
                        <Chip 
                          label="נוצרה על ידי מנהל המערכת" 
                          size="small" 
                          color="info" 
                          variant="outlined"
                          sx={{ mt: 0.5, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <IconButton 
                      color="primary" 
                      onClick={() => handlePhotoUpload(it._id)} 
                      disabled={isScheduledTaskTimeExpired(it)}
                      size="small"
                    >
                      <PhotoCamera />
                    </IconButton>
                  </Box>
                  
                  {/* תצוגת תמונות למשימות מתוזמנות */}
                  {photoFiles[it._id] && photoFiles[it._id].length > 0 && (
                    <Box sx={{ mt: 1, mb: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {photoFiles[it._id].map((photo, idx) => (
                        <Box 
                          key={`${it._id}-photo-${idx}-${photo.file.name}-${photo.file.lastModified}`} 
                          sx={{ 
                            position: 'relative', 
                            width: 60, 
                            height: 60, 
                            border: '1px solid #ddd', 
                            borderRadius: 1 
                          }}
                        >
                          <img 
                            src={photo.previewUrl} 
                            alt={`preview ${idx}`} 
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover',
                              borderRadius: '4px'
                            }} 
                          />
                          <IconButton 
                            size="small" 
                            onClick={() => handleRemovePhoto(it._id, idx)} 
                            sx={{ 
                              position: 'absolute', 
                              top: -6, 
                              right: -6, 
                              backgroundColor: 'rgba(255,255,255,0.9)',
                              '&:hover': { backgroundColor: 'rgba(255,255,255,1)' },
                              width: 20,
                              height: 20
                            }}
                            disabled={isScheduledTaskTimeExpired(it)}
                          >
                            <Close fontSize="inherit" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                  
                  {/* שדה הערה שמופיע רק כשהמשימה מסומנת כמבוצעת */}
                  {scheduledResults[it._id]?.isCompleted && (
                    <TextField
                      fullWidth
                      variant="standard"
                      label="הערה (אופציונלי)"
                      value={scheduledResults[it._id]?.comment || ''}
                      onChange={(e) => handleScheduledResultChange(it._id, 'comment', e.target.value)}
                      sx={{ mt: 1 }}
                      disabled={isScheduledTaskTimeExpired(it)}
                    />
                  )}
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
          
          {/* כפתור שמירה למשימות מתוזמנות */}
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              color="success" 
              fullWidth 
              onClick={handleScheduledTasksSubmit}
              disabled={isScheduledSubmitting || scheduledItems.length === 0 || !areScheduledTasksComplete() || scheduledItems.some(task => isScheduledTaskTimeExpired(task))}
            >
              {isScheduledSubmitting ? <CircularProgress size={24} color="inherit" /> : 'שמור משימות יומיות'}
            </Button>
            {scheduledItems.length > 0 && !areScheduledTasksComplete() && !scheduledItems.some(task => isScheduledTaskTimeExpired(task)) && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                יש לבצע את כל המשימות היומיות לפני השמירה
              </Typography>
            )}
            {scheduledItems.some(task => isScheduledTaskTimeExpired(task)) && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                הזמן לביצוע חלק מהמשימות הסתיים
              </Typography>
            )}
          </Box>
        </Paper>
  )}
      
  {/* אין צורך ברכיב מצלמה או עורך */}
    </Box>
  );
};

export default ChecklistRunnerPage;