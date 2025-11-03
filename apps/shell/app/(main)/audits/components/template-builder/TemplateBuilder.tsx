// app/components/template-builder/TemplateBuilder.tsx
'use client';

import { Box, Typography, Button, TextField, Paper, AppBar, Toolbar, IconButton, Divider, Stack, CircularProgress, Snackbar, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentIcon from '@mui/icons-material/Assignment'; // אייקון חדש
import { useState, useEffect, SyntheticEvent } from 'react';
import { useRouter } from 'next/navigation';
import LivePreview from './LivePreview';
import QuestionEditor from './QuestionEditor';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableSection } from './SortableSection';
import { SortableQuestion } from './SortableQuestion';
import axios from '../../lib/axios';
import AssignStoresModal from './AssignStoresModal'; // ייבוא הקומפוננטה החדשה

const generateUniqueId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const addFrontendIds = (sections: any[]): any[] => {
    // ... (no changes in this function)
    const isValidTrigger = (trigger: any) => {
        if (!trigger) return false;
        const hasAnswer = typeof trigger.onAnswer === 'string' && trigger.onAnswer.length > 0;
        const hasFu = Array.isArray(trigger.followUpQuestions) && trigger.followUpQuestions.length > 0;
        return hasAnswer || hasFu;
    };
    return sections.map(section => ({
        ...section,
        id: generateUniqueId(),
        questions: section.questions.map((question: any) => ({
            ...question,
            id: generateUniqueId(),
            options: question.options?.map((option: any) => ({ ...option, id: generateUniqueId() })),
            conditionalTrigger: isValidTrigger(question.conditionalTrigger) ? {
                ...question.conditionalTrigger,
                followUpQuestions: question.conditionalTrigger.followUpQuestions?.map((fuQuestion: any) => ({
                    ...fuQuestion,
                    id: generateUniqueId(),
                    options: fuQuestion.options?.map((opt: any) => ({ ...opt, id: generateUniqueId() })),
                }))
            } : undefined
        }))
    }));
};

export default function TemplateBuilder({ templateId: initialTemplateId }: { templateId?: string }) {
    const router = useRouter();
    const [templateId, setTemplateId] = useState<string | null>(initialTemplateId || null);
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');
    const [sections, setSections] = useState<any[]>([]);
    const [associatedStores, setAssociatedStores] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(!!initialTemplateId);
    const [activeId, setActiveId] = useState<string | null>(null);

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false); // State חדש לחלון

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        const fetchTemplateForEdit = async () => {
            if (!templateId) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const response = await axios.get(`/templates/${templateId}`);
                const templateData = response.data.data;
                setTemplateName(templateData.name);
                setTemplateDescription(templateData.description);
                setSections(addFrontendIds(templateData.sections));
                setAssociatedStores(templateData.associatedStores || []); // טעינת החנויות המשויכות
            } catch (error) {
                console.error("Failed to fetch template for editing", error);
                setSnackbar({ open: true, message: "טעינת התבנית לעריכה נכשלה", severity: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchTemplateForEdit();
    }, [templateId]);

    const handleSnackbarClose = (event?: SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') return;
        setSnackbar({ ...snackbar, open: false });
    };

    // ... (no changes in component logic functions: addSection, updateSection, etc.)
    const addSection = () => setSections(prev => [...prev, { id: generateUniqueId(), title: '', weight: 1, questions: [] }]);
    const updateSection = (id: string, props: object) => setSections(prev => prev.map(s => s.id === id ? { ...s, ...props } : s));
    const deleteSection = (id: string) => setSections(prev => prev.filter(s => s.id !== id));
    const updateQuestion = (sectionId: string, questionId: string, propsOrFn: object | ((prev: any) => any)) => {
        setSections(prev => prev.map(s => {
            if (s.id !== sectionId) return s;
            return { ...s, questions: s.questions.map((q: any) => {
                if (q.id !== questionId) return q;
                const updatedQuestion = typeof propsOrFn === 'function' ? propsOrFn(q) : { ...q, ...propsOrFn };
                
                if (updatedQuestion.type === 'multiple_choice' && !updatedQuestion.options) {
                    updatedQuestion.options = [{ id: generateUniqueId(), text: '', scoreWeight: 1 }];
                }
                if (updatedQuestion.type === 'slider' && !updatedQuestion.sliderRange) {
                    updatedQuestion.sliderRange = [1, 10];
                }
                
                return updatedQuestion;
            })};
        }));
    };
    const addQuestion = (sectionId: string, type: string = 'yes_no') => {
      const newQuestion: any = { id: generateUniqueId(), type, text: '', weight: 1, allowComment: true, allowPhoto: true };
      if (type === 'multiple_choice') newQuestion.options = [{ id: generateUniqueId(), text: '', scoreWeight: 1 }];
      if (type === 'slider') newQuestion.sliderRange = [1, 10];
      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, questions: [...s.questions, newQuestion] } : s));
    };
    const deleteMainQuestion = (sectionId: string, questionId: string) => setSections(prev => prev.map(s => s.id === sectionId ? {...s, questions: s.questions.filter((q:any) => q.id !== questionId)} : s));
    const addOption = (sectionId: string, questionId: string) => updateQuestion(sectionId, questionId, (q:any) => ({ ...q, options: [...(q.options || []), { id: generateUniqueId(), text: '', scoreWeight: 1 }] }));
    const updateOption = (sectionId: string, questionId: string, optionId: string, props: object) => updateQuestion(sectionId, questionId, (q:any) => ({ ...q, options: (q.options || []).map((opt:any) => opt.id === optionId ? { ...opt, ...props } : opt)}));
    const deleteOption = (sectionId: string, questionId: string, optionId: string) => updateQuestion(sectionId, questionId, (q:any) => ({ ...q, options: (q.options || []).filter((opt:any) => opt.id !== optionId)}));
    const updateFollowUpQuestion = (sectionId: string, triggerId: string, followUpId: string, propsOrFn: object | ((prev: any) => any)) => updateQuestion(sectionId, triggerId, (q:any) => ({ 
        ...q, 
        conditionalTrigger: { 
            ...q.conditionalTrigger, 
            followUpQuestions: (q.conditionalTrigger.followUpQuestions || []).map((fu:any) => {
                if (fu.id !== followUpId) return fu;
                const updatedFollowUp = typeof propsOrFn === 'function' ? propsOrFn(fu) : { ...fu, ...propsOrFn };
                
                if (updatedFollowUp.type === 'multiple_choice' && !updatedFollowUp.options) {
                    updatedFollowUp.options = [{ id: generateUniqueId(), text: '', scoreWeight: 1 }];
                }
                if (updatedFollowUp.type === 'slider' && !updatedFollowUp.sliderRange) {
                    updatedFollowUp.sliderRange = [1, 10];
                }
                
                return updatedFollowUp;
            })
        }
    }));
    const deleteFollowUpQuestion = (sectionId: string, triggerId: string, followUpId: string) => updateQuestion(sectionId, triggerId, (q:any) => ({ ...q, conditionalTrigger: { ...q.conditionalTrigger, followUpQuestions: (q.conditionalTrigger.followUpQuestions || []).filter((fu: any) => fu.id !== followUpId)}}));
    const addFollowUpQuestion = (sectionId: string, triggerId: string, type: string = 'yes_no') => {
      const newFollowUp: any = { id: generateUniqueId(), type, text: '', weight: 1, allowComment: true, allowPhoto: true };
      if (type === 'multiple_choice') newFollowUp.options = [{ id: generateUniqueId(), text: '', scoreWeight: 1 }];
      if (type === 'slider') newFollowUp.sliderRange = [1, 10];
      updateQuestion(sectionId, triggerId, (q: any) => ({ ...q, conditionalTrigger: { ...q.conditionalTrigger, followUpQuestions: [...(q.conditionalTrigger.followUpQuestions || []), newFollowUp] }}));
    };
    const addFollowUpOption = (sectionId: string, triggerId: string, followUpId: string) => updateFollowUpQuestion(sectionId, triggerId, followUpId, (fu: any) => ({ ...fu, options: [...(fu.options || []), { id: generateUniqueId(), text: '', scoreWeight: 1 }] }));
    const updateFollowUpOption = (sectionId: string, triggerId: string, followUpId: string, optionId: string, props: object) => updateFollowUpQuestion(sectionId, triggerId, followUpId, (fu: any) => ({...fu, options: (fu.options || []).map((opt: any) => opt.id === optionId ? { ...opt, ...props } : opt)}));
    const deleteFollowUpOption = (sectionId: string, triggerId: string, followUpId: string, optionId: string) => updateFollowUpQuestion(sectionId, triggerId, followUpId, (fu: any) => ({...fu, options: (fu.options || []).filter((opt: any) => opt.id !== optionId)}));
    

    const handleDragEnd = (event: DragEndEvent) => {
        // ... (no changes in this function)
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;
        if (active.id === over.id) return;

        const activeId = String(active.id);
        const overId = String(over.id);
        
        const activeType = sections.some(s => s.id === activeId) ? 'section' : 'question';
        
        if (activeType === 'section') {
            const oldIndex = sections.findIndex(s => s.id === activeId);
            const newIndex = sections.findIndex(s => s.id === overId);
            
            if (oldIndex !== -1 && newIndex !== -1) {
                setSections(arrayMove(sections, oldIndex, newIndex));
            }
        } else {
            let activeSectionId = '';
            let activeQuestionIndex = -1;
            
            for (const section of sections) {
                const questionIndex = section.questions.findIndex((q: any) => q.id === activeId);
                if (questionIndex !== -1) {
                    activeSectionId = section.id;
                    activeQuestionIndex = questionIndex;
                    break;
                }
            }
            
            let overSectionId = '';
            let overQuestionIndex = -1;
            
            for (const section of sections) {
                const questionIndex = section.questions.findIndex((q: any) => q.id === overId);
                if (questionIndex !== -1) {
                    overSectionId = section.id;
                    overQuestionIndex = questionIndex;
                    break;
                }
            }
            
            if (activeSectionId && overSectionId && activeQuestionIndex !== -1 && overQuestionIndex !== -1) {
                if (activeSectionId === overSectionId) {
                    setSections(prev => prev.map(section => {
                        if (section.id === activeSectionId) {
                            const newQuestions = arrayMove(section.questions, activeQuestionIndex, overQuestionIndex);
                            return { ...section, questions: newQuestions };
                        }
                        return section;
                    }));
                } else {
                    setSections(prev => {
                        const activeSection = prev.find(s => s.id === activeSectionId);
                        const overSection = prev.find(s => s.id === overSectionId);
                        
                        if (!activeSection || !overSection) return prev;
                        
                        const activeQuestion = activeSection.questions[activeQuestionIndex];
                        
                        return prev.map(section => {
                            if (section.id === activeSectionId) {
                                return {
                                    ...section,
                                    questions: section.questions.filter((_: any, index: number) => index !== activeQuestionIndex)
                                };
                            } else if (section.id === overSectionId) {
                                const newQuestions = [...section.questions];
                                newQuestions.splice(overQuestionIndex, 0, activeQuestion);
                                return { ...section, questions: newQuestions };
                            }
                            return section;
                        });
                    });
                }
            }
        }
    };
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

    const handleSave = async () => {
        setIsSaving(true);
        const cleanSections = (sections: any[]) => {
            return sections.map(section => {
                const { id, ...cleanSection } = section;
                return {
                    ...cleanSection,
                    questions: section.questions.map((question: any) => {
                        const { id, ...cleanQuestion } = question;
                        if (cleanQuestion.conditionalTrigger) {
                            let onAnswer = cleanQuestion.conditionalTrigger.onAnswer;
                            if (onAnswer && question.options) {
                                const foundById = question.options.find((opt: any) => opt.id === onAnswer);
                                if (foundById) onAnswer = foundById.text;
                            }
                            if (!onAnswer || onAnswer.trim() === '') {
                                if (question.type === 'yes_no') onAnswer = 'כן';
                                else if (question.type === 'multiple_choice' && question.options?.length) onAnswer = question.options[0].text;
                            }

                            cleanQuestion.conditionalTrigger = {
                                onAnswer,
                                followUpQuestions: (cleanQuestion.conditionalTrigger.followUpQuestions || []).map((fuQuestion: any) => {
                                    const { id, ...cleanFollowUp } = fuQuestion;
                                    if (cleanFollowUp.options) {
                                        cleanFollowUp.options = cleanFollowUp.options.map((opt: any) => {
                                            const { id, ...cleanOpt } = opt;
                                            return cleanOpt;
                                        });
                                    }
                                    return cleanFollowUp;
                                })
                            };
                        }
                        if (cleanQuestion.options) {
                            cleanQuestion.options = cleanQuestion.options.map((opt: any) => {
                                const { id, ...cleanOpt } = opt;
                                return cleanOpt;
                            });
                        }
                        return cleanQuestion;
                    })
                };
            });
        };
        
        const cleanPayload = {
            name: templateName,
            description: templateDescription,
            sections: cleanSections(sections),
        };
        
        try {
            let savedTemplateData;
            if (templateId) {
                const response = await axios.put(`/templates/${templateId}`, cleanPayload);
                savedTemplateData = response.data.data;
                setSnackbar({ open: true, message: 'התבנית עודכנה, כעת שייך חנויות', severity: 'success' });
            } else {
                const response = await axios.post('/templates', cleanPayload);
                savedTemplateData = response.data.data;
                 // עדכון ה-templateId כדי שהחלון הקופץ ידע לאיזו תבנית לשייך
                setTemplateId(savedTemplateData._id); 
                setAssociatedStores(savedTemplateData.associatedStores || []);
                setSnackbar({ open: true, message: 'התבנית נוצרה, כעת שייך חנויות', severity: 'success' });
            }
            // פתיחת החלון הקופץ לאחר שמירה מוצלחת
            setIsAssignModalOpen(true);
        } catch (error: any) {
            const defaultError = templateId ? 'עדכון התבנית נכשל' : 'יצירת התבנית נכשלה';
            setSnackbar({ open: true, message: error.response?.data?.message || defaultError, severity: 'error' });
        } finally {
            setIsSaving(false);
        }
    };
    
    // פונקציה שתקרא כשהשיוך בחלון הקופץ יצליח
    const handleAssociationSuccess = () => {
        setIsAssignModalOpen(false);
        router.push('/admin/templates');
    }

    if (isLoading) {
        return <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box>;
    }

    return (
        <>
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100vh', 
                backgroundColor: '#f0f2f5',
                margin: '-24px',
                width: 'calc(100vw - 240px)'
            }}>
                <AppBar position="static" color="default" sx={{ backgroundColor: 'white', boxShadow: 'none', borderBottom: '1px solid #e0e0e0' }}>
                    <Toolbar sx={{ maxWidth: 'none', px: 3 }}>
                        <Typography variant="h6" sx={{ flexGrow: 1 }}>{templateId ? "עריכת תבנית" : "בניית תבנית חדשה"}</Typography>
                        {/* כפתור חדש לניהול שיוכים שיופיע רק בעריכה */}
                        {templateId && (
                            <Button
                                variant="outlined"
                                startIcon={<AssignmentIcon />}
                                onClick={() => setIsAssignModalOpen(true)}
                                sx={{ mr: 2 }}
                            >
                                ניהול שיוך חנויות
                            </Button>
                        )}
                        <Button variant="contained" onClick={handleSave} disabled={isSaving || !templateName} sx={{ backgroundColor: '#4285F4', mr: 2 }}>
                            {isSaving ? <CircularProgress size={24} color="inherit" /> : (templateId ? "שמור והמשך" : "שמור והמשך")}
                        </Button>
                        <IconButton edge="end" color="inherit" onClick={() => router.push('/admin/templates')}><ArrowBackIcon /></IconButton>
                    </Toolbar>
                </AppBar>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={({active}) => setActiveId(active.id as string)}>
                    <Box sx={{ display: 'flex', flexGrow: 1, p: 2, gap: 2, maxWidth: 'none', overflow: 'hidden' }}>
                        <Box sx={{ width: '75%' }}>
                            <Paper sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
                                <Typography variant="h5" gutterBottom>פרטי התבנית</Typography>
                                <TextField label="שם התבנית" value={templateName} onChange={(e) => setTemplateName(e.target.value)} fullWidth sx={{ mb: 1.5 }} required />
                                <TextField label="תיאור התבנית" value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} fullWidth multiline rows={3} />
                                <Divider sx={{ my: 2 }} />
                                <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                    <Stack spacing={2}>
                                        {sections.map((section, index) => (
                                            <SortableSection key={section.id} id={section.id} type="section">
                                                <Paper 
                                                    elevation={3} 
                                                    sx={{ 
                                                        p: 0, 
                                                        width: '100%', 
                                                        borderRadius: 2,
                                                        overflow: 'hidden',
                                                        border: '1px solid #e0e0e0'
                                                    }}
                                                >
                                                    <Box sx={{ 
                                                        display: 'flex', 
                                                        justifyContent: 'space-between', 
                                                        alignItems: 'center', 
                                                        p: 2,
                                                        backgroundColor: '#f8f9fa',
                                                        borderBottom: '1px solid #e0e0e0'
                                                    }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
                                                            <Typography 
                                                                variant="h6" 
                                                                sx={{ 
                                                                    color: '#6c757d', 
                                                                    fontWeight: 700,
                                                                    minWidth: '80px'
                                                                }}
                                                            >
                                                                מקטע {index + 1}
                                                            </Typography>
                                                            <TextField 
                                                                label="כותרת המקטע" 
                                                                variant="standard" 
                                                                value={section.title} 
                                                                onChange={(e) => updateSection(section.id, { title: e.target.value })} 
                                                                sx={{ 
                                                                    flexGrow: 1, 
                                                                    '.MuiInput-input': { fontSize: '1.25rem', fontWeight: '600' } 
                                                                }} 
                                                            />
                                                        </Box>
                                                        <TextField 
                                                            label="משקל" 
                                                            type="number" 
                                                            size="small" 
                                                            value={section.weight} 
                                                            onChange={(e) => updateSection(section.id, { weight: parseFloat(e.target.value) || 1 })} 
                                                            sx={{ width: '100px', mx: 2 }} 
                                                        />
                                                        <IconButton onClick={() => deleteSection(section.id)} color="error">
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Box>
                                                    
                                                    <Box sx={{ p: 2 }}>
                                                        <SortableContext items={section.questions.map((q: any) => q.id)} strategy={verticalListSortingStrategy}>
                                                            <Stack spacing={2}>
                                                                {section.questions.map((question: any) => (
                                                                    <SortableQuestion key={question.id} id={question.id} type="question" sectionId={section.id}>
                                                                        <QuestionEditor
                                                                            question={question}
                                                                            updateQuestion={(p: any) => updateQuestion(section.id, question.id, p)}
                                                                            deleteQuestion={() => deleteMainQuestion(section.id, question.id)}
                                                                            addOption={() => addOption(section.id, question.id)}
                                                                            updateOption={(oId: any, p: any) => updateOption(section.id, question.id, oId, p)}
                                                                            deleteOption={(oId: any) => deleteOption(section.id, question.id, oId)}
                                                                            addFollowUpQuestion={() => addFollowUpQuestion(section.id, question.id)}
                                                                            updateFollowUp={(fuId: any, p: any) => updateFollowUpQuestion(section.id, question.id, fuId, p)}
                                                                            deleteFollowUp={(fuId: any) => deleteFollowUpQuestion(section.id, question.id, fuId)}
                                                                            addFollowUpOption={(fuId: any) => addFollowUpOption(section.id, question.id, fuId)}
                                                                            updateFollowUpOption={(fuId: any, oId: any, p: any) => updateFollowUpOption(section.id, question.id, fuId, oId, p)}
                                                                            deleteFollowUpOption={(fuId: any, oId: any) => deleteFollowUpOption(section.id, question.id, fuId, oId)}
                                                                        />
                                                                    </SortableQuestion>
                                                                ))}
                                                            </Stack>
                                                        </SortableContext>
                                                        
                                                        <Button 
                                                            size="medium" 
                                                            startIcon={<AddIcon />} 
                                                            sx={{ 
                                                                mt: 2, 
                                                                backgroundColor: '#e3f2fd', 
                                                                color: '#1976d2',
                                                                '&:hover': { backgroundColor: '#bbdefb' }
                                                            }} 
                                                            onClick={() => addQuestion(section.id)}
                                                        >
                                                            הוסף שאלה
                                                        </Button>
                                                    </Box>
                                                </Paper>
                                            </SortableSection>
                                        ))}
                                    </Stack>
                                </SortableContext>
                                <Button 
                                    variant="outlined" 
                                    startIcon={<AddIcon />} 
                                    onClick={addSection} 
                                    sx={{ 
                                        mt: 2, 
                                        p: 2,
                                        fontSize: '1.1rem',
                                        borderStyle: 'dashed',
                                        borderWidth: 2,
                                        backgroundColor: '#fafafa',
                                        '&:hover': { 
                                            backgroundColor: '#f0f0f0',
                                            borderStyle: 'dashed'
                                        }
                                    }}
                                    size="large"
                                    fullWidth
                                >
                                    הוסף מקטע חדש
                                </Button>
                            </Paper>
                        </Box>
                        <Box sx={{ width: '25%' }}>
                            <LivePreview sections={sections} templateName={templateName} />
                        </Box>
                    </Box>
                </DndContext>
                <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
                </Snackbar>
            </Box>
            {/* הרנדור של החלון הקופץ */}
            <AssignStoresModal 
                open={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                onSaveSuccess={handleAssociationSuccess}
                templateId={templateId}
                templateName={templateName}
                initialSelectedIds={associatedStores}
            />
        </>
    );
}