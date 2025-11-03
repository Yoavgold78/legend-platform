'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Stepper, Step, StepLabel, Button, CircularProgress, Alert, Paper, TextField, Divider,
} from '@mui/material';
import type { AxiosProgressEvent } from 'axios';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

// API Functions
import { getAllStores } from '@/lib/api/stores';
// --- שינוי: מייבאים את הפונקציה החדשה והנכונה ---
import { getTemplatesByStore, getTemplateById } from '@/lib/api/templates';
import { createInspection, previewInspection, fetchInspectionPdfBlob, generateShareLink, getPreviousAnswers } from '@/lib/api/inspections';
import { createTask, getPreviousInspectionTasks } from '@/lib/api/tasks';
import { uploadImage } from '@/lib/api/upload';
import { useSnackbar } from '@/context/SnackbarContext';
import useAuthStore from '@/store/authStore';

// Child Components
import Step1_SelectStore from '@/components/inspections/Step1_SelectStore';
import Step2_SelectTemplate from '@/components/inspections/Step2_SelectTemplate';
import Step3_AuditForm from '@/components/inspections/Step3_AuditForm';
import TaskCreateModal from '@/components/inspections/TaskCreateModal';
import UploadProgressModal from '@/components/inspections/modals/UploadProgressModal';
import ShareLinkModal from '@/components/inspections/modals/ShareLinkModal';
import PdfReadyModal from '@/components/inspections/modals/PdfReadyModal';
import BackConfirmDialog from '@/components/inspections/BackConfirmDialog';
import GeneralTasksSection from '@/components/inspections/GeneralTasksSection';
import PreviewReport from '@/components/inspections/PreviewReport';

import type { Store, TemplateInfo, Answer, PhotoFile, FullTemplate, Task } from '@/types/inspection';

const steps = ['בחירת חנות', 'בחירת תבנית', 'ביצוע ביקורת', 'סיכום', 'תצוגה מקדימה'];

interface AuditFormRef {
  validate: () => boolean;
}

const IN_PROGRESS_INSPECTION_KEY = 'inProgressInspection';

const NewInspectionPage = () => {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuthStore();
  const [activeStep, setActiveStep] = useState(0);

  const auditFormRef = useRef<AuditFormRef>(null);

  const [selectedStore, setSelectedStore] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [fullTemplate, setFullTemplate] = useState<FullTemplate | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [previousAnswers, setPreviousAnswers] = useState<Answer[]>([]);
  const [photoFiles, setPhotoFiles] = useState<{ [key: string]: PhotoFile[] }>({});
  const [summaryText, setSummaryText] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);

  const [isGeneralTaskModalOpen, setIsGeneralTaskModalOpen] = useState(false);

  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingFullTemplate, setLoadingFullTemplate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ finalScore: number; sectionScores: { sectionName: string; score: number }[] } | null>(null);
  const [previousInspection, setPreviousInspection] = useState<any | null>(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareLinkLoading, setShareLinkLoading] = useState(false);

  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [lastInspectionId, setLastInspectionId] = useState<string | null>(null);

  const [hasRestored, setHasRestored] = useState(false);
  const [previousTasksByQuestion, setPreviousTasksByQuestion] = useState<Record<string, any[]>>({});

  const [isBackConfirmOpen, setIsBackConfirmOpen] = useState(false);
  const hasPushedBackTrapRef = useRef(false);

  useEffect(() => {
    try {
      const savedStateJSON = localStorage.getItem(IN_PROGRESS_INSPECTION_KEY);
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        if (savedState.selectedStore || savedState.answers?.length > 0) {
          setActiveStep(savedState.activeStep || 0);
          setSelectedStore(savedState.selectedStore || '');
          setSelectedTemplateId(savedState.selectedTemplateId || '');
          setAnswers(savedState.answers || []);
          setTasks(savedState.tasks || []);
          setSummaryText(savedState.summaryText || '');
          setHasRestored(true);
          showSnackbar('שוחזרה ביקורת שהייתה בתהליך', 'info');
        }
      }
    } catch (e) {
      console.error("Failed to load saved inspection:", e);
      localStorage.removeItem(IN_PROGRESS_INSPECTION_KEY);
    }
  }, []);

  useEffect(() => {
    if (activeStep > 0 || answers.length > 0 || tasks.length > 0) {
      const stateToSave = { activeStep, selectedStore, selectedTemplateId, answers, tasks, summaryText };
      localStorage.setItem(IN_PROGRESS_INSPECTION_KEY, JSON.stringify(stateToSave));
    }
  }, [activeStep, selectedStore, selectedTemplateId, answers, tasks, summaryText]);

  useEffect(() => {
    const isInspectionInProgress = activeStep === 2;
    if (!isInspectionInProgress) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'האם אתה בטוח שברצונך לצאת? הנתונים נשמרו, אך תצא מתהליך הביקורת.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeStep]);

  useEffect(() => {
    if (activeStep === 2 && !hasPushedBackTrapRef.current) {
      try {
        history.pushState({ trap: 'inspection-step-2' }, '', location.href);
        hasPushedBackTrapRef.current = true;
      } catch (_) {}
    }
    if (activeStep !== 2) {
      hasPushedBackTrapRef.current = false;
    }
  }, [activeStep]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (activeStep === 2) {
        history.pushState(null, '', location.href);
        setIsBackConfirmOpen(true);
        return;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeStep, router]);

  const handleResetInspection = () => {
    localStorage.removeItem(IN_PROGRESS_INSPECTION_KEY);
    setActiveStep(0);
    setSelectedStore('');
    setSelectedTemplateId('');
    setFullTemplate(null);
    setAnswers([]);
    setPhotoFiles({});
    setSummaryText('');
    setTasks([]);
    setHasRestored(false);
    showSnackbar('הביקורת אופסה, ניתן להתחיל מחדש', 'success');
  };

  const clearSavedInspection = () => {
    localStorage.removeItem(IN_PROGRESS_INSPECTION_KEY);
  };

  useEffect(() => {
    const fetchStoresFunc = async () => {
      try {
        setLoadingStores(true);
        setError(null);
        const storesData = await getAllStores() as Store[];
        setStores(storesData);
      } catch (err) { setError('שגיאה בטעינת החנויות.'); }
      finally { setLoadingStores(false); }
    };
    fetchStoresFunc();
  }, []);

  useEffect(() => {
    if (hasRestored && selectedStore && templates.length === 0) {
      const fetchTemplatesForRestoredState = async () => {
        setLoadingTemplates(true);
        try {
          const templatesData = await getTemplatesByStore(selectedStore) as TemplateInfo[];
          setTemplates(templatesData);
        } catch (err) {
          setError('שגיאה בשחזור רשימת התבניות.');
        } finally {
          setLoadingTemplates(false);
        }
      };
      fetchTemplatesForRestoredState();
    }
  }, [hasRestored, selectedStore, templates.length]);

  useEffect(() => {
    if (hasRestored && selectedTemplateId && !fullTemplate) {
       const fetchFullTemplateForRestoredState = async () => {
        setLoadingFullTemplate(true);
        try {
          const templateData = await getTemplateById(selectedTemplateId) as FullTemplate;
          setFullTemplate(templateData);
        } catch (err) {
          setError('שגיאה בשחזור השאלון.');
        } finally {
          setLoadingFullTemplate(false);
        }
      };
      fetchFullTemplateForRestoredState();
    }
  }, [hasRestored, selectedTemplateId, fullTemplate]);

  useEffect(() => {
    const shouldFetch = hasRestored && activeStep === 2 && selectedStore && selectedTemplateId;
    if (!shouldFetch) return;
    (async () => {
      try {
        const nowIso = new Date().toISOString();
        const prevTasks = await getPreviousInspectionTasks({ storeId: selectedStore, templateId: selectedTemplateId, before: nowIso });
        const map: Record<string, any[]> = {};
        (prevTasks || []).forEach((t: any) => {
          if (!t.questionId) return;
          if (!map[t.questionId]) map[t.questionId] = [];
          map[t.questionId].push(t);
        });
        setPreviousTasksByQuestion(map);
      } catch (_) {
        setPreviousTasksByQuestion({});
      }
    })();
  }, [hasRestored, activeStep, selectedStore, selectedTemplateId]);

  const proceedToStep3 = async (templateId: string) => {
    try {
      setLoadingFullTemplate(true);
      const templateData = await getTemplateById(templateId) as FullTemplate;
      setFullTemplate(templateData);
      
      const nowIso = new Date().toISOString();
      
      // Fetch previous tasks and previous answers in parallel for efficiency
      const [prevTasks, prevAnswers] = await Promise.all([
        getPreviousInspectionTasks({ storeId: selectedStore, templateId: templateId, before: nowIso }),
        getPreviousAnswers({ storeId: selectedStore, templateId: templateId }) // +++ ADDED
      ]);

      // Process previous tasks
      const map: Record<string, any[]> = {};
      (prevTasks || []).forEach((t: any) => {
        if (!t.questionId) return;
        if (!map[t.questionId]) map[t.questionId] = [];
        map[t.questionId].push(t);
      });
      setPreviousTasksByQuestion(map);
      
      // +++ ADDED: Set previous answers state
      setPreviousAnswers(prevAnswers || []);
      
      setActiveStep(2);
    } catch (err) {
      setError('שגיאה בטעינת השאלון והנתונים הקודמים.');
    } finally {
      setLoadingFullTemplate(false);
    }
  };

  const handleNext = async () => {
    setError(null);
    if (activeStep === 0) {
      setLoadingTemplates(true);
      try {
        const templatesData = await getTemplatesByStore(selectedStore) as TemplateInfo[];
        setTemplates(templatesData);
        if (templatesData.length === 1) {
          setSelectedTemplateId(templatesData[0]._id);
          await proceedToStep3(templatesData[0]._id);
        } else {
          setActiveStep(1);
        }
      } catch (err) {
        setError('שגיאה בטעינת התבניות.');
      } finally {
        setLoadingTemplates(false);
      }
    } else if (activeStep === 1) {
      await proceedToStep3(selectedTemplateId);
    } else if (activeStep === 2) {
      if (auditFormRef.current?.validate()) {
        setActiveStep(3);
      } else {
        showSnackbar('יש לענות על כל השאלות המסומנות באדום.', 'error');
      }
    } else if (activeStep === 3) {
      try {
        setIsSubmitting(true);
        const data = await previewInspection({ templateId: selectedTemplateId, answers });
        setPreview(data);
        setActiveStep(4);
      } catch (err) {
        setError('שגיאה ביצירת התצוגה המקדימה.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (activeStep === 2) {
      setIsBackConfirmOpen(true);
      return;
    }
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    } else {
      router.back();
    }
  };

  const handleConfirmBack = () => {
    setIsBackConfirmOpen(false);
    if (activeStep === 2) {
      setActiveStep(1);
      return;
    }
    router.back();
  };
  
  const handleSaveWithProgress = async (): Promise<string | null> => {
    setIsSubmitting(true);
    setIsUploading(true);
    setError(null);
  
    try {
      const allFilesToUpload = Object.values(photoFiles).flat();
      const totalFiles = allFilesToUpload.length;
      let uploadedCount = 0;
      const uploadedUrlsMap: { [questionId: string]: string[] } = {};
  
      setUploadStatus(totalFiles > 0 ? `מתחיל העלאה של ${totalFiles} תמונות...` : 'מעבד נתונים...');
      setUploadProgress(0);
  
      if (totalFiles > 0) {
        for (const questionId in photoFiles) {
          const files = photoFiles[questionId];
          if (files && files.length > 0) {
            uploadedUrlsMap[questionId] = [];
            for (const photoFile of files) {
              uploadedCount++;
              setUploadStatus(`מעלה תמונה ${uploadedCount} מתוך ${totalFiles}...`);
              
              const url = await uploadImage(photoFile.file, (progressEvent: AxiosProgressEvent) => {
                if (progressEvent.total) {
                  const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                  const overallProgress = (((uploadedCount - 1) / totalFiles) * 100) + (percentCompleted / totalFiles);
                  setUploadProgress(overallProgress);
                }
              });
              uploadedUrlsMap[questionId].push(url);
            }
          }
        }
      }
  
      setUploadStatus('שומר את נתוני הביקורת...');
      setUploadProgress(100);
  
      let finalAnswers: Answer[] = JSON.parse(JSON.stringify(answers));
      for(const questionId in uploadedUrlsMap) {
          let answer = finalAnswers.find(a => a.questionId === questionId);
          if (answer) {
            answer.photos = [...(answer.photos || []), ...uploadedUrlsMap[questionId]];
          } else {
            finalAnswers.push({ questionId, value: null, photos: uploadedUrlsMap[questionId] });
          }
      }
      
      const inspectionData = { storeId: selectedStore, templateId: selectedTemplateId, answers: finalAnswers, summaryText };
      const newInspection = await createInspection(inspectionData);
      
      if (tasks.length > 0) {
        setUploadStatus(`יוצר ${tasks.length} משימות...`);
        const taskCreationPromises = tasks.map(task => {
          const taskPayload = {
            inspectionId: newInspection._id,
            storeId: selectedStore,
            description: task.description,
            dueDate: task.dueDate,
            priority: task.priority,
            originatingQuestionText: task.originatingQuestionText || '',
            questionId: task.questionId || undefined,
          };
          return createTask(taskPayload);
        });
        
        try {
          await Promise.all(taskCreationPromises);
        } catch (taskError) {
          console.error("Failed to create one or more tasks:", taskError);
          showSnackbar('הביקורת נשמרה, אך הייתה שגיאה ביצירת חלק מהמשימות.', 'warning');
        }
      }

      setIsUploading(false);
      setLastInspectionId(newInspection._id); 
      clearSavedInspection(); 
      return newInspection._id;
  
    } catch (err) {
      setError('שגיאה קריטית בתהליך השמירה. אנא נסה שנית.');
      console.error(err);
      setIsSubmitting(false);
      setIsUploading(false);
      return null;
    }
  };

  const handleSubmit = async () => {
    const newInspectionId = await handleSaveWithProgress();
    if (newInspectionId) {
      showSnackbar('הביקורת נשמרה בהצלחה!', 'success');
      router.push(`/inspection`);
    }
  };
  
  const handleSubmitAndShare = async () => {
    const newInspectionId = await handleSaveWithProgress();
    if (!newInspectionId) return;

    setPdfModalOpen(true);
    setPdfLoading(true);

    try {
      const blob = await fetchInspectionPdfBlob(newInspectionId);
      setPdfBlob(blob);
    } catch (err) {
      console.error("PDF generation error:", err);
      showSnackbar('שגיאה ביצירת קובץ ה-PDF.', 'error');
      setPdfModalOpen(false);
      router.push(`/inspection`);
    } finally {
      setPdfLoading(false);
    }
  };
  
  const handleSharePdfFromModal = async () => {
    if (!pdfBlob) return;
    const storeName = stores.find(s => s._id === selectedStore)?.name || 'החנות';
    const pdfFile = new File([pdfBlob], `inspection-${storeName}.pdf`, { type: 'application/pdf' });

    try {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `דוח ביקורת PDF - ${storeName}`,
          text: `מצורף דוח ביקורת בפורמט PDF עבור ${storeName}.`,
          files: [pdfFile],
        });
        showSnackbar('הדוח שותף!', 'success');
      } else {
        handleDownloadPdfFromModal();
      }
      setPdfModalOpen(false);
      router.push(`/inspection`);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        showSnackbar('אירעה שגיאה בזמן השיתוף', 'error');
      }
    }
  };

  const handleDownloadPdfFromModal = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection-${lastInspectionId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showSnackbar('הקובץ הורד למכשיר!', 'success');
    setPdfModalOpen(false);
    router.push(`/inspection`);
  };

  const handleSubmitAndShareLink = async () => {
    const newInspectionId = await handleSaveWithProgress();
    if (!newInspectionId) return;

    setShareModalOpen(true);
    setShareLinkLoading(true);

    try {
      const response = await generateShareLink(newInspectionId);
      const shareToken = response.token;
      const url = `${window.location.origin}/share/${shareToken}`;
      setShareLink(url);
    } catch (err) {
      console.error("Share link generation error:", err);
      showSnackbar('שגיאה ביצירת הקישור. ניתן לשתף את הדוח מדף התוצאות.', 'error');
      setShareModalOpen(false);
      router.push(`/inspection`);
    } finally {
      setShareLinkLoading(false);
    }
  };

  const handleShareFromModal = async () => {
    const storeName = stores.find(s => s._id === selectedStore)?.name || 'החנות';
    try {
      if (navigator.share) {
        await navigator.share({
          title: `דוח ביקורת - ${storeName}`,
          text: `קישור לדוח ביקורת עבור ${storeName}`,
          url: shareLink,
        });
        showSnackbar('הקישור שותף!', 'success');
      } else {
        await navigator.clipboard.writeText(shareLink);
        showSnackbar('הקישור הועתק!', 'success');
      }
      setShareModalOpen(false);
      router.push(`/inspection`);
    } catch (err) {
       if ((err as Error).name !== 'AbortError') {
         showSnackbar('אירעה שגיאה בזמן השיתוף', 'error');
       }
    }
  };
  
  const handleCopyFromModal = async () => {
    await navigator.clipboard.writeText(shareLink);
    showSnackbar('הקישור הועתק!', 'success');
  };

  const handleCreateGeneralTask = (taskData: { description: string; dueDate: string; priority: 'Normal' | 'High' }) => {
    const newGeneralTask = {
      ...taskData,
      inspectionId: '',
      _id: `general_${Date.now()}`
    };
    // @ts-ignore
    setTasks(prev => [...prev, newGeneralTask]);
    setIsGeneralTaskModalOpen(false);
  };
  
  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => (task._id || task.questionId) !== taskId));
  };
  
  return (
    <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 } }}>
      <TaskCreateModal 
        open={isGeneralTaskModalOpen}
        onClose={() => setIsGeneralTaskModalOpen(false)}
        onSubmit={handleCreateGeneralTask}
      />
      <UploadProgressModal open={isUploading} status={uploadStatus} progress={uploadProgress} />
      <ShareLinkModal
        open={shareModalOpen}
        loading={shareLinkLoading}
        shareLink={shareLink}
        onShare={handleShareFromModal}
        onCopy={handleCopyFromModal}
        onClose={() => { setShareModalOpen(false); router.push('/inspection'); }}
      />
      <PdfReadyModal
        open={pdfModalOpen}
        loading={pdfLoading}
        onSharePdf={handleSharePdfFromModal}
        onDownloadPdf={handleDownloadPdfFromModal}
        onClose={() => { setPdfModalOpen(false); router.push('/inspection'); }}
      />
      <BackConfirmDialog
        open={isBackConfirmOpen}
        onCancel={() => setIsBackConfirmOpen(false)}
        onConfirm={handleConfirmBack}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="600">
          יצירת ביקורת חדשה
        </Typography>
        {hasRestored && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<RestartAltIcon />}
            onClick={handleResetInspection}
            size="small"
          >
            התחל ביקורת חדשה
          </Button>
        )}
      </Box>

      <Stepper activeStep={activeStep} sx={{ my: 4, flexWrap: 'wrap' }}>
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Box sx={{ minHeight: 350, p: 1 }}>
        {activeStep === 0 && <Step1_SelectStore stores={stores} selectedStore={selectedStore} onStoreChange={setSelectedStore} loading={loadingStores} error={error} />}
        {activeStep === 1 && <Step2_SelectTemplate templates={templates} selectedTemplateId={selectedTemplateId} onTemplateChange={setSelectedTemplateId} loading={loadingTemplates} error={error} />}
        {activeStep === 2 && <Step3_AuditForm 
                                ref={auditFormRef} 
                                fullTemplate={fullTemplate} 
                                loading={loadingFullTemplate || loadingTemplates}
                                error={error} 
                                answers={answers} 
                                setAnswers={setAnswers}
                                photoFiles={photoFiles}
                                setPhotoFiles={setPhotoFiles}
                                tasks={tasks}
                                setTasks={setTasks}
                                previousTasksByQuestion={previousTasksByQuestion}
                                previousAnswers={previousAnswers}
                              />}
        {activeStep === 3 && (
          <Box>
             <Typography variant="h5" gutterBottom>סיכום</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>טקסט חופשי שלא משפיע על הניקוד. השדה יישמר כחלק מהבקרה.</Typography>
            <TextField label="סיכום חופשי" placeholder="כתוב כאן סיכום חופשי..." fullWidth multiline minRows={6} value={summaryText} onChange={(e) => setSummaryText(e.target.value)} />
            <Divider sx={{ my: 4 }} />
            <GeneralTasksSection
              tasks={tasks}
              onDeleteTask={handleDeleteTask}
              onOpenCreate={() => setIsGeneralTaskModalOpen(true)}
            />
          </Box>
        )}
        
        {activeStep === 4 && preview && fullTemplate && (
          <PreviewReport
            preview={preview}
            fullTemplate={fullTemplate}
            stores={stores}
            selectedStore={selectedStore}
            userName={user?.fullName}
            answers={answers}
            photoFiles={photoFiles as any}
            summaryText={summaryText}
            previousInspection={previousInspection}
          />
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button variant="text" onClick={handleBack} disabled={isSubmitting}>{activeStep === 0 ? 'ביטול' : 'הקודם'}</Button>
        {activeStep < 4 ? (
          <Button variant="contained" onClick={handleNext} disabled={(activeStep === 0 && !selectedStore) || (activeStep === 1 && !selectedTemplateId) || isSubmitting || loadingTemplates || loadingFullTemplate}>
             {(isSubmitting || loadingTemplates || loadingFullTemplate) ? <CircularProgress size={24} color="inherit"/> : 'הבא'}
          </Button>
        ) : (
          <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end'}}>
            <Button variant="outlined" onClick={() => setActiveStep(3)} disabled={isSubmitting}>חזרה לעריכה</Button>
            {isSubmitting && <CircularProgress size={24} />}
            <Button variant="contained" color="primary" onClick={handleSubmit} disabled={isSubmitting}>שמור</Button>
            <Button variant="contained" color="secondary" onClick={handleSubmitAndShareLink} disabled={isSubmitting}>שמור ושתף קישור</Button>
            <Button variant="contained" color="success" onClick={handleSubmitAndShare} disabled={isSubmitting}>שמור והפק PDF</Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default NewInspectionPage;