'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generateShareLink, getInspectionById, getInspectionsFiltered } from '@/lib/api/inspections';
import { Box, Typography, Paper, CircularProgress, Alert, Divider, Grid, Table, TableBody, TableCell, TableHead, TableRow, Chip, Button, Stack, Modal, IconButton, Snackbar, TableContainer } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Define the complex types for the inspection data
interface FollowUpQuestion { _id: string; text: string; type?: 'yes_no' | 'slider' | 'multiple_choice' | 'text_input'; }
interface Question {
  _id: string;
  text: string;
  type?: 'yes_no' | 'slider' | 'multiple_choice' | 'text_input';
  sliderRange?: [number, number];
  conditionalTrigger?: {
    followUpQuestions?: FollowUpQuestion[];
  }
}
interface Answer { questionId: string; value: any; comment?: string; photos?: string[]; }
interface Section { _id: string; title: string; questions: Question[]; }
interface FullTemplate { name: string; sections?: Section[]; }
interface InspectionData {
  _id: string;
  storeId: { _id?: string; name?: string };
  inspectorId: { fullName?: string };
  templateId: FullTemplate;
  answers: Answer[];
  finalScore: number;
  sectionScores: { sectionName: string; score: number }[];
  summaryText?: string;
  createdAt: string;
}

// Style for the image modal
const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 2,
  outline: 'none',
  maxWidth: '90vw',
  maxHeight: '90vh',
};

const InspectionResultPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousInspection, setPreviousInspection] = useState<InspectionData | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      const fetchInspection = async () => {
        try {
          setLoading(true);
          const data = await getInspectionById(id);
          setInspection(data);

          const storeId = data.storeId?._id;
          if (storeId) {
             const list = await getInspectionsFiltered({
              storeId: storeId,
              endDate: data.createdAt,
            });
            const candidates = list.filter((i: any) => i._id !== data._id);
            candidates.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setPreviousInspection(candidates[0] || null);
          }
        } catch (err) {
          setError('שגיאה בטעינת נתוני הביקורת.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchInspection();
    } else {
      setLoading(false);
      setError("ID של ביקורת לא תקין.");
    }
  }, [id]);

  const handleGeneratePdf = async () => { /* This function remains unchanged */ 
    const element = printRef.current;
    if (!element || !inspection) return;
    setIsGeneratingPdf(true);
    try {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const ratio = canvas.width / canvas.height;
        const imgHeight = pdfWidth / ratio;
        let position = 0;
        let heightLeft = imgHeight;
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
        while (heightLeft > 0) {
            position -= pdf.internal.pageSize.getHeight();
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
        }
        const storeName = inspection.storeId?.name || 'דוח';
        const date = new Date(inspection.createdAt).toLocaleDateString('he-IL').replace(/\//g, '.');
        pdf.save(`${storeName} - ${date}.pdf`);
    } catch (error) {
        console.error("שגיאה ביצירת ה-PDF:", error);
        setError("אירעה שגיאה בעת יצירת קובץ ה-PDF.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };
  
  const handleShare = async () => { /* This function remains unchanged */ 
      if (!id) return;
      setIsSharing(true);
      try {
          const response = await generateShareLink(id);
          const shareToken = response.token;
          const shareUrl = `${window.location.origin}/share/${shareToken}`;
          await navigator.clipboard.writeText(shareUrl);
          setSnackbarOpen(true);
      } catch (err) {
          console.error('Failed to generate share link', err);
          setError('שגיאה ביצירת קישור שיתוף');
      } finally {
          setIsSharing(false);
      }
  };

  const handleOpenImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setModalOpen(true);
  };

  const handleCloseModal = () => setModalOpen(false);
  const handleBack = () => router.push('/inspection');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!inspection) return <Alert severity="info">לא נמצאה ביקורת.</Alert>;

  const getAnswerForQuestion = (questionId: string) => inspection.answers.find((a: Answer) => a.questionId === questionId);
  const greenPastel = '#d4edda';
  const redPastel = '#f8d7da';
  
  // --- START: MODIFIED FUNCTION ---
  const renderComparativeFindings = () => {
    if (!previousInspection) return null;

    const currentSections = inspection.sectionScores;
    const previousSections = previousInspection.sectionScores;
    const sectionRows = currentSections.map((cur) => {
      const prev = previousSections.find((p) => p.sectionName === cur.sectionName);
      const diff = prev ? (cur.score - prev.score) : null;
      return { name: cur.sectionName, current: cur.score, previous: prev ? prev.score : null, diff };
    });

    const getNormalizedScore = (question: Question, answer: Answer): number | null => {
        if (!question || !answer) return null;
    
        if (question.type === 'yes_no') {
            const valueStr = String(answer.value).toLowerCase();
            if (valueStr === 'yes' || valueStr === 'כן') return 1;
            if (valueStr === 'no' || valueStr === 'לא') return 0;
            return null;
        }
    
        if (question.type === 'slider' && Array.isArray(question.sliderRange)) {
            const [min, max] = question.sliderRange;
            const value = typeof answer.value === 'number' ? answer.value : parseFloat(answer.value);
            if (!isNaN(value) && max > min) {
                return (value - min) / (max - min);
            }
            return null;
        }
        return null;
    };
    
    type CriticalQuestion = { text: string; current: number; previous: number; percentChange: number };
    const criticalBySection: Record<string, CriticalQuestion[]> = {};

    inspection.templateId?.sections?.forEach((currentSection) => {
      currentSection.questions.forEach((currentQuestion) => {
        const currentAnswer = inspection.answers.find((a) => a.questionId === currentQuestion._id);

        let previousAnswer: Answer | null = null;
        let previousQuestionFound: Question | null = null;

        const previousSection = previousInspection.templateId?.sections?.find((sec) => sec.title === currentSection.title);
        if (previousSection) {
          previousQuestionFound = previousSection.questions.find((pq) => pq.text === currentQuestion.text) || null;
          if (previousQuestionFound) {
            previousAnswer = previousInspection.answers.find((pa) => pa.questionId === previousQuestionFound?._id) || null;
          }
        }

        if (currentAnswer && previousAnswer && previousQuestionFound) {
          const currentScore = getNormalizedScore(currentQuestion, currentAnswer);
          const previousScore = getNormalizedScore(previousQuestionFound, previousAnswer);

          if (currentScore !== null && previousScore !== null) {
            let percentChange: number;
            if (previousScore === 0) {
              percentChange = currentScore > 0 ? 100 : 0; // כל עליה מאפס נחשבת 100%
            } else {
              percentChange = ((currentScore - previousScore) / previousScore) * 100;
            }

            if (Math.abs(percentChange) >= 20) { // סף 20%
              const entry: CriticalQuestion = {
                text: currentQuestion.text,
                current: currentScore * 100,
                previous: previousScore * 100,
                percentChange,
              };
              if (!criticalBySection[currentSection.title]) criticalBySection[currentSection.title] = [];
              criticalBySection[currentSection.title].push(entry);
            }
          }
        }
      });
    });

    return (
      <Box>
        <Typography variant="h5" gutterBottom>עיקרי הממצאים (השוואה לדוח קודם)</Typography>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 500 }}>
            <TableHead><TableRow><TableCell><b>מקטע</b></TableCell><TableCell align="right"><b>ציון קודם</b></TableCell><TableCell align="right"><b>ציון נוכחי</b></TableCell><TableCell align="right"><b>שינוי</b></TableCell></TableRow></TableHead>
            <TableBody>
              {sectionRows.map((r) => (
                <React.Fragment key={r.name}>
                  <TableRow>
                    <TableCell><b>{r.name}</b></TableCell>
                    <TableCell align="right">{r.previous !== null ? r.previous.toFixed(0) : '—'}</TableCell>
                    <TableCell align="right">{r.current.toFixed(0)}</TableCell>
                    <TableCell align="right">{r.diff !== null ? (<Chip label={`${r.diff > 0 ? '+' : ''}${r.diff.toFixed(0)}`} sx={{ bgcolor: r.diff > 0 ? greenPastel : r.diff < 0 ? redPastel : undefined, color: '#000' }} />) : ('—')}</TableCell>
                  </TableRow>

                  {(criticalBySection[r.name]?.length ?? 0) > 0 && (
                    <>
                      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                        <TableCell colSpan={4} sx={{ pt: 0.5, pb: 0.5, color: 'text.secondary', fontSize: 13 }}>
                          שאלות קריטיות (מעל 20% שינוי)
                        </TableCell>
                      </TableRow>
                      {criticalBySection[r.name].map((q) => (
                        <TableRow key={`${r.name}-${q.text}`} sx={{ bgcolor: 'transparent' }}>
                          <TableCell sx={{ color: 'text.secondary' }}>• {q.text}</TableCell>
                          <TableCell align="right">{q.previous.toFixed(0)}</TableCell>
                          <TableCell align="right">{q.current.toFixed(0)}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${q.percentChange > 0 ? '+' : ''}${q.percentChange.toFixed(0)}%`}
                              sx={{ bgcolor: q.percentChange > 0 ? greenPastel : q.percentChange < 0 ? redPastel : undefined, color: '#000' }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
          </TableContainer>
        </Paper>
      </Box>
    );
  };
  // --- END: MODIFIED FUNCTION ---

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 1, md: 2 } }}>
        <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: 'space-between' }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>חזור</Button>
            <Stack direction="row" spacing={1}>
                <Button variant="contained" startIcon={<ShareIcon />} onClick={handleShare} disabled={isSharing}>{isSharing ? 'יוצר קישור...' : 'שתף'}</Button>
                <Button variant="contained" color="success" startIcon={<PictureAsPdfIcon />} onClick={handleGeneratePdf} disabled={isGeneratingPdf}>{isGeneratingPdf ? 'מכין PDF...' : 'הורד כ-PDF'}</Button>
            </Stack>
        </Stack>

        <Paper ref={printRef} sx={{ p: { xs: 2, md: 4 }, direction: 'rtl' }}>
            <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="h4" gutterBottom>דוח סיכום ביקורת - {inspection.storeId?.name || 'סניף לא זמין'}</Typography>
                <Grid container>
                  <Grid item xs={6}><Typography><strong>שם הבקר:</strong> {inspection.inspectorId?.fullName || '—'}</Typography></Grid>
                  <Grid item xs={6}><Typography><strong>תאריך:</strong> {new Date(inspection.createdAt).toLocaleDateString('he-IL')}</Typography></Grid>
                  <Grid item xs={6}><Typography><strong>שם התבנית:</strong> {inspection.templateId?.name || 'תבנית לא זמינה'}</Typography></Grid>
                  <Grid item xs={6}><Typography><strong>שעה:</strong> {new Date(inspection.createdAt).toLocaleTimeString('he-IL')}</Typography></Grid>
                </Grid>
            </Box>
            {renderComparativeFindings()}
            <Divider sx={{ my: 3 }} />
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom>סיכום ציונים</Typography>
                <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                    <Box sx={{ textAlign: 'center' }}><Typography variant="h3" color="primary">{Number(inspection.finalScore ?? 0).toFixed(0)}</Typography><Typography variant="h6">ציון סופי</Typography></Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>{inspection.sectionScores.map(s => (<Typography key={s.sectionName}><strong>{s.sectionName}:</strong> {Number(s.score ?? 0).toFixed(0)}</Typography>))}</Box>
                </Paper>
            </Box>
            <Box>
                <Typography variant="h5" gutterBottom>פירוט מלא</Typography>
                {inspection.templateId?.sections?.length ? inspection.templateId.sections.map(section => (
                    <Box key={section._id} sx={{ mb: 3 }}>
                        <Box sx={{ p: 1, backgroundColor: 'primary.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" sx={{ color: 'white' }}>מקטע: {section.title}</Typography>
                            {(() => {
                                const secScoreObj = inspection.sectionScores.find(s => s.sectionName === section.title);
                                const secScore = secScoreObj ? Math.round(secScoreObj.score) : null;
                                if (secScore !== null) {
                                    return (
                                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>{secScore}</Typography>
                                    );
                                }
                                return null;
                            })()}
                        </Box>
                        
                        {section.questions.map(question => {
                            const mainAnswer = getAnswerForQuestion(question._id);
                            if (!mainAnswer) return null;

                            const isNegative = (question.type === 'yes_no') && (String(mainAnswer.value).toLowerCase() === 'no' || String(mainAnswer.value).toLowerCase() === 'לא');
                            
                            return (
                                <React.Fragment key={question._id}>
                                    <Paper variant="outlined" sx={{ p: 2, my: 1, backgroundColor: isNegative ? redPastel : undefined }}>
                                        <Typography><strong>שאלה:</strong> {question.text}</Typography>
                                        <Typography sx={{ mt: 1 }}><strong>תשובה:</strong> {mainAnswer ? (String(mainAnswer.value) === 'yes' ? 'כן' : String(mainAnswer.value) === 'no' ? 'לא' : String(mainAnswer.value)) : 'לא נענה'}</Typography>
                                        {mainAnswer?.comment && <Typography variant="body2" sx={{ mt: 1, p:1, bgcolor: '#fff9c4', borderRadius: 1 }}><strong>הערה:</strong> {mainAnswer.comment}</Typography>}
                                        {mainAnswer?.photos && mainAnswer.photos.length > 0 && (
                                            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                                {mainAnswer.photos.map((photoUrl) => (<img key={photoUrl} src={photoUrl} alt="תמונה מהביקורת" height="100" style={{ border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleOpenImage(photoUrl)}/>))}
                                            </Box>
                                        )}
                                    </Paper>

                                    {question.conditionalTrigger?.followUpQuestions?.map((followUpQ, index) => {
                                        const followUpId = `${question._id}_followup_${index}`;
                                        const followUpAnswer = getAnswerForQuestion(followUpId);
                                        if (!followUpAnswer) return null;
                                        const isFollowUpNegative = (followUpQ.type === 'yes_no') && (String(followUpAnswer.value).toLowerCase() === 'no' || String(followUpAnswer.value).toLowerCase() === 'לא');
                                        return (
                                            <Paper key={followUpId} variant="outlined" sx={{ p: 2, my: 1, ml: 4, borderLeft: '3px solid', borderColor: 'primary.main', backgroundColor: isFollowUpNegative ? redPastel : undefined }}>
                                                <Typography><strong>שאלת המשך:</strong> {followUpQ.text}</Typography>
                                                <Typography sx={{ mt: 1 }}><strong>תשובה:</strong> {String(followUpAnswer.value)}</Typography>
                                                {followUpAnswer?.comment && <Typography variant="body2" sx={{ mt: 1, p:1, bgcolor: '#fff9c4', borderRadius: 1 }}><strong>הערה:</strong> {followUpAnswer.comment}</Typography>}
                                                {followUpAnswer?.photos && followUpAnswer.photos.length > 0 && (
                                                    <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                                        {followUpAnswer.photos.map((photoUrl) => (<img key={photoUrl} src={photoUrl} alt="תמונה מהביקורת" height="100" style={{ border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleOpenImage(photoUrl)}/>))}
                                                    </Box>
                                                )}
                                            </Paper>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </Box>
                )) : null}
            </Box>
            {inspection.summaryText && <><Divider sx={{ my: 3 }} /><Box><Typography variant="h5" gutterBottom>סיכום הדוח</Typography><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{inspection.summaryText}</Typography></Box></>}
        </Paper>

        <Modal open={modalOpen} onClose={handleCloseModal}>
          <Box sx={modalStyle}><IconButton onClick={handleCloseModal} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}><CloseIcon /></IconButton><img src={selectedImage} alt="תצוגה מוגדלת" style={{ width: '100%', height: 'auto', maxHeight: 'calc(90vh - 40px)', objectFit: 'contain' }} /></Box>
        </Modal>

        <Snackbar
            open={snackbarOpen}
            autoHideDuration={4000}
            onClose={() => setSnackbarOpen(false)}
            message="הקישור הועתק!"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
    </Box>
  );
};

export default InspectionResultPage;