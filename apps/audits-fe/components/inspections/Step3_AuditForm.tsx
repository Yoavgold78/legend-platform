'use client';

import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert,
  TextField, Slider, ButtonGroup, Dialog, DialogTitle, DialogContent, DialogActions, Paper,
  IconButton, Chip, Stack, Tooltip, Modal
} from '@mui/material';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloseIcon from '@mui/icons-material/Close';
import AddTaskIcon from '@mui/icons-material/AddTask';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import imageCompression from 'browser-image-compression';

import CustomImageEditor from './CustomImageEditor';
import TaskCreateModal from './TaskCreateModal';
import InAppCamera from './InAppCamera';

import type { Answer, PhotoFile, Question, Section, FullTemplate, Task } from '@/types/inspection';


interface Props {
  fullTemplate: FullTemplate | null;
  loading: boolean;
  error: string | null;
  answers: Answer[];
  setAnswers: React.Dispatch<React.SetStateAction<Answer[]>>;
  photoFiles: { [key: string]: PhotoFile[] };
  setPhotoFiles: React.Dispatch<React.SetStateAction<{ [key: string]: PhotoFile[] }>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  previousTasksByQuestion?: Record<string, any[]>; 
  previousAnswers?: Answer[]; 
}

const sectionColors = ['#673ab7', '#009688', '#E91E63', '#FF9800', '#2196F3', '#4CAF50'];

const getColorForAnswer = (value: any, question: Question): string => {
  const greenPastel = '#d4edda';
  const redPastel = '#f8d7da';
  try {
    if (question.type === 'yes_no') {
      if (value === 'yes' || value === 'כן') return greenPastel;
      if (value === 'no' || value === 'לא') return redPastel;
    }
    if (question.type === 'slider' && typeof value === 'number') {
      const [min, max] = question.sliderRange || [0, 10];
      if (max - min === 0) return greenPastel;
      const percentage = ((value - min) / (max - min));
      const hue = percentage * 120;
      return `hsl(${hue}, 70%, 88%)`;
    }
    if (question.type === 'multiple_choice' && question.options && question.options.length > 0) {
      const selectedOptionIndex = question.options.findIndex(opt => opt.text === value);
      if (selectedOptionIndex === -1) return '';
      const allOptionsHaveWeight = question.options.every(opt => typeof opt.weight === 'number');
      if (allOptionsHaveWeight) {
        const weights = question.options.map(opt => opt.weight!);
        const maxWeight = Math.max(...weights);
        const minWeight = Math.min(...weights);
        const selectedWeight = question.options[selectedOptionIndex].weight!;
        if (maxWeight - minWeight === 0) return redPastel;
        const percentage = ((selectedWeight - minWeight) / (maxWeight - minWeight));
        const hue = (1 - percentage) * 120;
        return `hsl(${hue}, 70%, 88%)`;
      } else {
        if (question.options.length <= 1) return redPastel;
        const percentage = selectedOptionIndex / (question.options.length - 1);
        const hue = (1 - percentage) * 120;
        return `hsl(${hue}, 70%, 88%)`;
      }
    }
  } catch (e) { console.error("Color calculation error:", e); return ''; }
  return '';
};

const isAnswerNegative = (question: Question, answer?: Answer): boolean => {
  if (!answer || answer.value === null || answer.value === undefined) return false;
  switch (question.type) {
    case 'yes_no':
      return answer.value === 'לא';
    case 'multiple_choice':
      const selectedOption = question.options?.find(opt => opt.text === answer.value);
      return selectedOption?.scoreWeight !== undefined && selectedOption.scoreWeight <= 0;
    case 'slider':
      return typeof answer.value === 'number' && answer.value < 3;
    default:
      return false;
  }
};

const Step3_AuditForm = forwardRef((props: Props, ref) => {
  const { 
    fullTemplate, loading, error, answers, setAnswers, photoFiles, 
    setPhotoFiles, tasks = [], setTasks, previousTasksByQuestion = {},
    previousAnswers = [] 
  } = props;
  
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [commentModal, setCommentModal] = useState({ open: false, questionId: '' });
  const [currentComment, setCurrentComment] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  
  const [editorState, setEditorState] = useState<{ open: boolean; image: string | null }>({ open: false, image: null });
  const [highlightedQuestions, setHighlightedQuestions] = useState<Set<string>>(new Set());
  
  const [taskModal, setTaskModal] = useState({ open: false, questionId: '', questionText: '' });
  const [taskHistoryDialog, setTaskHistoryDialog] = useState<{ open: boolean; items: any[] }>({ open: false, items: [] });

  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [answerHistoryDialog, setAnswerHistoryDialog] = useState<{ open: boolean; question: Question | null; answer: Answer | null }>({ open: false, question: null, answer: null });
  const [imageViewer, setImageViewer] = useState<{ open: boolean, url: string }>({ open: false, url: '' });

  const allQuestions = useMemo(() => fullTemplate?.sections.flatMap(s => s.questions) || [], [fullTemplate]);

  const visibleQuestions = useMemo(() => {
    let result: Question[] = [];
    const fixedQuestions = allQuestions.map(question => {
      if (question.type === 'yes_no' && question.conditionalTrigger && (!question.conditionalTrigger.onAnswer || question.conditionalTrigger.onAnswer.trim() === '')) {
        return { ...question, conditionalTrigger: { ...question.conditionalTrigger, onAnswer: 'כן' } } as Question;
      }
      if (question.conditionalTrigger?.onAnswer && question.type === 'multiple_choice' && question.options) {
        const onAnswer = question.conditionalTrigger.onAnswer;
        const foundOption = question.options.find((opt: any) => opt._id === onAnswer);
        if (foundOption) return { ...question, conditionalTrigger: { ...question.conditionalTrigger, onAnswer: foundOption.text } };
      }
      return question;
    });
    for (let i = 0; i < fixedQuestions.length; i++) {
      const question = fixedQuestions[i];
      result.push(question);
      const answer = answers.find(a => a.questionId === question._id);
      if (question.conditionalTrigger?.followUpQuestions?.length && question.conditionalTrigger.onAnswer) {
        const triggerAnswer = question.conditionalTrigger.onAnswer;
        const userAnswer = answer?.value;
        let shouldShowFollowUp = (question.type === 'yes_no' || question.type === 'multiple_choice') && userAnswer === triggerAnswer;
        if (shouldShowFollowUp) {
          const followUpQuestions = question.conditionalTrigger.followUpQuestions.map((followUp, index) => ({
            ...followUp, _id: `${question._id}_followup_${index}`, allowComment: true, allowPhoto: true, parentQuestionId: question._id, weight: 1,
            options: followUp.type === 'multiple_choice' ? followUp.options || [] : [],
            sliderRange: followUp.type === 'slider' ? followUp.sliderRange || [1, 10] : undefined,
            conditionalTrigger: { onAnswer: '', followUpQuestions: [] }
          }));
          result.push(...followUpQuestions as Question[]);
        }
      }
    }
    return result;
  }, [allQuestions, answers]);

  useImperativeHandle(ref, () => ({
    validate: () => {
      const unanswered = new Set<string>();
      visibleQuestions.forEach(question => {
        const answer = answers.find(a => a.questionId === question._id);
        let isAnswered = false;
        if (answer && answer.value !== null && answer.value !== undefined) {
           if (typeof answer.value === 'string') isAnswered = answer.value.trim() !== '';
           else isAnswered = true;
        }
        if (!isAnswered) unanswered.add(question._id);
      });
      setHighlightedQuestions(unanswered);
      if (unanswered.size > 0) {
        const firstUnansweredId = unanswered.values().next().value;
        const element = document.getElementById(`question-${firstUnansweredId}`);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return unanswered.size === 0;
    }
  }));

  const updateAnswer = (questionId: string, value?: any, otherProps: Partial<Omit<Answer, 'questionId' | 'value'>> = {}) => {
    setHighlightedQuestions(prev => {
        if (prev.has(questionId)) {
            const newSet = new Set(prev);
            newSet.delete(questionId);
            return newSet;
        }
        return prev;
    });
    setAnswers(prevAnswers => {
      let updatedAnswers = [...prevAnswers];
      const question = allQuestions.find(q => q._id === questionId);
      const hasFollowUps = question?.conditionalTrigger?.followUpQuestions?.length;
      if (hasFollowUps && question?.conditionalTrigger?.onAnswer) {
        const triggerAnswer = question.conditionalTrigger.onAnswer;
        let shouldShowFollowUps = (question.type === 'yes_no' || question.type === 'multiple_choice') && value === triggerAnswer;
        if (!shouldShowFollowUps) updatedAnswers = updatedAnswers.filter(answer => !answer.questionId.startsWith(`${questionId}_followup_`));
      }
      const existingAnswerIndex = updatedAnswers.findIndex(a => a.questionId === questionId);
      if (existingAnswerIndex > -1) {
        updatedAnswers[existingAnswerIndex] = { ...prevAnswers[existingAnswerIndex], value: value !== undefined ? value : prevAnswers[existingAnswerIndex].value, ...otherProps };
      } else {
        updatedAnswers.push({ questionId, value, ...otherProps });
      }
      return updatedAnswers;
    });
  };

  const handleOpenCommentModal = (questionId: string) => {
    const existingAnswer = answers.find(a => a.questionId === questionId);
    setCurrentComment(existingAnswer?.comment || '');
    setCommentModal({ open: true, questionId });
  };

  const handleSaveComment = () => {
    updateAnswer(commentModal.questionId, undefined, { comment: currentComment });
    setCommentModal({ open: false, questionId: '' });
    setCurrentComment('');
  };

  const handlePhotoClick = (questionId: string) => {
    setActiveQuestionId(questionId);
    setIsCameraOpen(true);
  };

  const handleCaptureFromInAppCamera = (file: File) => {
    if (!file || !activeQuestionId) return;
    const previewUrl = URL.createObjectURL(file);
    setEditorState({ open: true, image: previewUrl });
  };
  
  const handleSaveFromEditor = async (editedFile: File) => {
    if (!activeQuestionId) return;
    setIsCompressing(true);
    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true, fileType: 'image/jpeg' };
      const compressedFile = await imageCompression(editedFile, options);
      const newPhotoFile: PhotoFile = { file: compressedFile, previewUrl: URL.createObjectURL(compressedFile) };
      setPhotoFiles(prev => ({ ...prev, [activeQuestionId]: [...(prev[activeQuestionId] || []), newPhotoFile] }));
    } catch(e) {
      console.error("Error compressing file:", e);
    } finally {
      setIsCompressing(false);
      setEditorState({ open: false, image: null });
    }
  };

  const handleRemovePhoto = (questionId: string, photoIndex: number) => {
    setPhotoFiles(prev => ({ ...prev, [questionId]: prev[questionId].filter((_, index) => index !== photoIndex) }));
  };

  const handleOpenTaskModal = (questionId: string, questionText: string) => {
    setTaskModal({ open: true, questionId, questionText });
  };
  
  const handleCreateTask = (taskData: { description: string; dueDate: string; priority: 'Normal' | 'High' }) => {
    const newTask = {
      tempId: `task_${Date.now()}`, 
      questionId: taskModal.questionId,
      originatingQuestionText: taskModal.questionText,
      ...taskData,
    };
    // @ts-ignore
    setTasks(prev => [...prev, newTask]);
    setTaskModal({ open: false, questionId: '', questionText: '' });
  };

  const handleRemoveTask = (tempIdToRemove: string) => {
    setTasks(prev => prev.filter(task => (task as any).tempId !== tempIdToRemove));
  };


  const renderQuestionInput = (question: Question) => {
    const currentAnswer = answers.find(a => a.questionId === question._id);
    const getButtonSx = (value: any) => ({
        backgroundColor: currentAnswer?.value === value ? getColorForAnswer(value, question) : undefined,
        borderColor: currentAnswer?.value === value ? 'primary.main' : undefined,
        borderWidth: currentAnswer?.value === value ? '2px' : '1px',
        '&:hover': { backgroundColor: currentAnswer?.value === value ? getColorForAnswer(value, question) : '#f5f5f5' }
    });
    switch (question.type) {
        case 'yes_no': return <ButtonGroup fullWidth size="large"><Button sx={getButtonSx('כן')} onClick={() => updateAnswer(question._id, 'כן')}>כן</Button><Button sx={getButtonSx('לא')} onClick={() => updateAnswer(question._id, 'לא')}>לא</Button></ButtonGroup>;
        case 'multiple_choice': return <ButtonGroup fullWidth size="large" variant="outlined">{question.options?.map(opt => (<Button key={opt.text} sx={getButtonSx(opt.text)} onClick={() => updateAnswer(question._id, opt.text)}>{opt.text}</Button>))}</ButtonGroup>;
        case 'slider': const [min, max] = question.sliderRange || [0, 10]; const sliderColor = getColorForAnswer(currentAnswer?.value, question) || 'primary'; return <Box sx={{ px: 2, pt: 2 }}><Slider sx={{ color: sliderColor }} value={typeof currentAnswer?.value === 'number' ? currentAnswer.value : min} onChange={(_, value) => updateAnswer(question._id, value)} valueLabelDisplay="auto" step={1} marks min={min} max={max} /></Box>;
        case 'text_input': return <TextField label="תשובה פתוחה" fullWidth variant="outlined" value={currentAnswer?.value || ''} onChange={(e) => updateAnswer(question._id, e.target.value)} inputProps={{ dir: 'rtl', style: { textAlign: 'start' } }} />;
        default: return null;
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!fullTemplate) return <Alert severity="warning">התבנית לא נטענה.</Alert>;

  return (
    <Box>
      <InAppCamera
        open={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCaptureFromInAppCamera}
      />
      
      {isCompressing && (<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, p: 2, mb: 2, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 2 }}><CircularProgress size={24} /><Typography>מכווץ תמונה...</Typography></Box>)}
      
      {fullTemplate?.sections?.map((section, index) => (
          <Paper key={section._id} elevation={0} sx={{ mb: 3, borderRadius: 3, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
            <Box sx={{ p: 2, backgroundColor: sectionColors[index % sectionColors.length], color: 'white' }}><Typography variant="h6" sx={{ fontWeight: 600 }}>{section.title}</Typography></Box>
            <Box sx={{ p: 2 }}>
              {visibleQuestions.filter(vq => section.questions.some(sq => sq._id === (vq.parentQuestionId || vq._id))).map(question => {
                const currentAnswer = answers.find(a => a.questionId === question._id);
                const isNegative = isAnswerNegative(question, currentAnswer);
                const tasksForThisQuestion = tasks.filter(t => t.questionId === question._id);
                const prevAnswer = previousAnswers.find(pa => pa.questionId === question._id);
                
                return (
                <Paper key={question._id} id={`question-${question._id}`} variant="outlined" sx={{ mb: 2, p: 2, borderRadius: 2, ml: ('parentQuestionId' in question && question.parentQuestionId) ? 4 : 0, borderLeft: ('parentQuestionId' in question && question.parentQuestionId) ? '3px solid #ddd' : 'none', borderColor: highlightedQuestions.has(question._id) ? '#d32f2f' : undefined, borderWidth: highlightedQuestions.has(question._id) ? '2px' : undefined, transition: 'border-color 0.3s ease-in-out' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500, flexGrow: 1 }}>
                      {('parentQuestionId' in question && question.parentQuestionId) ? 'שאלת המשך: ' : ''}{question.text}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {prevAnswer && (
                        <Tooltip title="הצג תשובה מבקרה קודמת" arrow>
                          {/* +++ FIXED: Using regular img tag instead of Next.js Image +++ */}
                          <IconButton size="small" onClick={() => setAnswerHistoryDialog({ open: true, question, answer: prevAnswer })}>
                              <img src="/history_icon.png" alt="היסטוריה" width={24} height={24} style={{ borderRadius: '50%' }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {previousTasksByQuestion[question._id]?.length ? (
                        <Tooltip title={`נמצאו ${previousTasksByQuestion[question._id].length} משימות קודמות לשאלה זו`} arrow>
                          <IconButton color="warning" size="small" onClick={() => setTaskHistoryDialog({ open: true, items: previousTasksByQuestion[question._id] })}>
                            <WarningAmberOutlinedIcon />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </Box>
                  </Box>
                  {renderQuestionInput(question)}
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {(photoFiles[question._id] || []).map((photo, idx) => (<Box key={idx} sx={{ position: 'relative', width: 80, height: 80, border: '1px solid #ddd', borderRadius: 1 }}><img src={photo.previewUrl} alt={`preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /><IconButton size="small" onClick={() => handleRemovePhoto(question._id, idx)} sx={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.7)' }}><CloseIcon fontSize="small" /></IconButton></Box>))}
                  </Box>
                  
                  {tasksForThisQuestion.length > 0 && (
                    <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #eee' }}>
                       <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>משימות שנוצרו:</Typography>
                       <Stack spacing={1}>
                          {tasksForThisQuestion.map((task, idx) => (
                              <Chip
                                  key={(task as any).tempId || idx}
                                  label={task.description}
                                  onDelete={() => handleRemoveTask((task as any).tempId)}
                                  deleteIcon={<DeleteIcon />}
                                  variant="outlined"
                                  sx={{ 
                                    height: 'auto', 
                                    '& .MuiChip-label': { 
                                      display: 'block', 
                                      whiteSpace: 'normal', 
                                      padding: '8px 0'
                                    } 
                                  }}
                              />
                          ))}
                       </Stack>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mt: 2, borderTop: '1px solid #eee', pt: 1 }}>
                    <Button 
                      size="small" 
                      startIcon={<AddTaskIcon />} 
                      onClick={() => handleOpenTaskModal(question._id, question.text)}
                      variant={isNegative ? "contained" : "text"}
                      color={isNegative ? "warning" : "primary"}
                    >
                      הוסף משימה {tasksForThisQuestion.length > 0 ? `(${tasksForThisQuestion.length})` : ''}
                    </Button>
                    {question.allowComment && <Button size="small" startIcon={<NoteAddOutlinedIcon />} onClick={() => handleOpenCommentModal(question._id)}>הערה</Button>}
                    {question.allowPhoto && <Button size="small" startIcon={<AddPhotoAlternateOutlinedIcon />} onClick={() => handlePhotoClick(question._id)}>הוסף תמונה</Button>}
                  </Box>
                </Paper>
              )})}
            </Box>
          </Paper>
        )
      )}
      
      <CustomImageEditor
        open={editorState.open}
        imageUrl={editorState.image}
        onClose={() => setEditorState({ open: false, image: null })}
        onSave={handleSaveFromEditor}
      />

      <Dialog open={commentModal.open} onClose={() => setCommentModal({ ...commentModal, open: false })} fullWidth>
        <DialogTitle>הוספת הערה</DialogTitle>
        <DialogContent><TextField autoFocus margin="dense" label="הערה" type="text" fullWidth multiline rows={4} value={currentComment} onChange={(e) => setCurrentComment(e.target.value)} inputProps={{ dir: 'rtl', style: { textAlign: 'start' } }}/></DialogContent>
        <DialogActions><Button onClick={() => setCommentModal({ ...commentModal, open: false })}>ביטול</Button><Button onClick={handleSaveComment}>שמירה</Button></DialogActions>
      </Dialog>
      
      <TaskCreateModal 
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false, questionId: '', questionText: '' })}
        onSubmit={handleCreateTask}
        questionText={taskModal.questionText}
      />
      
      <Dialog open={taskHistoryDialog.open} onClose={() => setTaskHistoryDialog({ open: false, items: [] })} fullWidth>
        <DialogTitle>היסטוריית משימות לשאלה זו</DialogTitle>
        <DialogContent dividers>
          {taskHistoryDialog.items.length === 0 ? (
            <Typography variant="body2">לא נמצאו משימות קודמות.</Typography>
          ) : (
            <Stack spacing={2}>
              {taskHistoryDialog.items.map((t: any, idx: number) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{t.description}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    סטטוס: {t.status || 'לא ידוע'} | תאריך: {t.completedAt ? new Date(t.completedAt).toLocaleString() : (t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-')}
                  </Typography>
                  {Array.isArray(t.proofImageUrls) && t.proofImageUrls.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, overflowX: 'auto' }}>
                      {t.proofImageUrls.map((url: string, i: number) => (
                        <img key={i} src={url} alt={`proof-${i}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
                      ))}
                    </Box>
                  )}
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskHistoryDialog({ open: false, items: [] })}>סגור</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={answerHistoryDialog.open} 
        onClose={() => setAnswerHistoryDialog({ open: false, question: null, answer: null })}
        fullWidth
        maxWidth="xs"
      >
        {/* +++ MODIFIED: This is the fix for the h6 in h2 error +++ */}
        <DialogTitle>
           היסטוריית תשובה
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" gutterBottom>
              {answerHistoryDialog.question?.text}
          </Typography>
          {answerHistoryDialog.answer ? (
            <Stack spacing={2} sx={{pt: 1}}>
              <Box>
                <Typography variant="overline" color="text.secondary">תשובה קודמת</Typography>
                <Typography>
                  {String(answerHistoryDialog.answer.value) === 'yes' ? 'כן' : String(answerHistoryDialog.answer.value) === 'no' ? 'לא' : String(answerHistoryDialog.answer.value)}
                </Typography>
              </Box>
              {answerHistoryDialog.answer.comment && (
                <Box>
                  <Typography variant="overline" color="text.secondary">הערה</Typography>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>{answerHistoryDialog.answer.comment}</Typography>
                </Box>
              )}
              {answerHistoryDialog.answer.photos && answerHistoryDialog.answer.photos.length > 0 && (
                <Box>
                  <Typography variant="overline" display="block" color="text.secondary" mb={0.5}>תמונות</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {answerHistoryDialog.answer.photos.map((url, i) => (
                      <Box
                        key={i}
                        component="img"
                        src={url}
                        alt={`history-proof-${i}`}
                        onClick={() => setImageViewer({ open: true, url })}
                        sx={{
                          width: 80, height: 80, objectFit: 'cover', borderRadius: 1,
                          border: '1px solid #ddd', cursor: 'pointer',
                          '&:hover': { boxShadow: 3 }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Stack>
          ) : (
            <Typography>לא נמצא מידע.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnswerHistoryDialog({ open: false, question: null, answer: null })}>סגור</Button>
        </DialogActions>
      </Dialog>

      <Modal
        open={imageViewer.open}
        onClose={() => setImageViewer({ open: false, url: '' })}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Paper sx={{ p: 1, maxWidth: '90vw', maxHeight: '90vh', outline: 'none' }}>
           <IconButton onClick={() => setImageViewer({ open: false, url: '' })} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, backgroundColor: 'rgba(255,255,255,0.7)' }}><CloseIcon /></IconButton>
          <img src={imageViewer.url} alt="enlarged view" style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '88vh' }} />
        </Paper>
      </Modal>
    </Box>
  );
});

Step3_AuditForm.displayName = 'Step3_AuditForm';

export default Step3_AuditForm;