'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSharedInspectionByToken } from '@/lib/api/inspections';
import { Box, Typography, Paper, CircularProgress, Alert, Divider, Grid, Modal, IconButton, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Define the complex types for the inspection data
interface FollowUpQuestion { _id: string; text: string; type?: 'yes_no' | 'slider' | 'multiple_choice' | 'text_input'; }
interface Question {
  _id: string;
  text: string;
  type?: 'yes_no' | 'slider' | 'multiple_choice' | 'text_input';
  conditionalTrigger?: {
    followUpQuestions?: FollowUpQuestion[];
  }
}
interface Answer { questionId: string; value: any; comment?: string; photos?: string[]; }
interface Section { _id: string; title: string; questions: Question[]; }
interface FullTemplate { name: string; sections?: Section[]; }
interface InspectionData {
  _id: string;
  storeId: { name?: string };
  inspectorId: { fullName?: string };
  templateId: FullTemplate;
  answers: Answer[];
  finalScore: number;
  sectionScores: { sectionName: string; score: number }[];
  summaryText?: string;
  createdAt: string;
}

// Style for the Image Modal
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


// The Main Page Component
const SharedInspectionPage = () => {
  const params = useParams();
  const token = params?.token as string;
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [previousInspection, setPreviousInspection] = useState<InspectionData | null>(null); // State for previous inspection
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    if (token) {
      const fetchSharedInspection = async () => {
        try {
          setLoading(true);
          const response = await getSharedInspectionByToken(token);
          // The backend now returns an object with 'current' and 'previous'
          setInspection(response.data.current);
          setPreviousInspection(response.data.previous);
          setError(null);
        } catch (err: any) {
          setError(err.response?.data?.error || 'שגיאה בטעינת הדוח. ייתכן שהקישור אינו תקין או שפג תוקפו.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchSharedInspection();
    } else {
      setLoading(false);
      setError("לא זוהה מפתח שיתוף.");
    }
  }, [token]);

  const handleOpenImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setModalOpen(true);
  };
  const handleCloseModal = () => setModalOpen(false);
  const getAnswerForQuestion = (questionId: string) => inspection?.answers.find((a: Answer) => a.questionId === questionId);
  
  // --- START: New function to render comparison, copied from the private page ---
  const renderComparativeFindings = () => {
    if (!previousInspection || !inspection) return null;
    
    const greenPastel = '#d4edda';
    const redPastel = '#f8d7da';
    
    const currentSections = inspection.sectionScores;
    const previousSections = previousInspection.sectionScores;
    const sectionRows = currentSections.map((cur) => {
      const prev = previousSections.find((p) => p.sectionName === cur.sectionName);
      const diff = prev ? (cur.score - prev.score) : null;
      return { name: cur.sectionName, current: cur.score, previous: prev ? prev.score : null, diff };
    });
    
    return (
      <Box>
        <Typography variant="h5" gutterBottom>עיקרי הממצאים (השוואה לדוח קודם)</Typography>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>מקטע</TableCell>
                    <TableCell align="right">ציון קודם</TableCell>
                    <TableCell align="right">ציון נוכחי</TableCell>
                    <TableCell align="right">שינוי</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
              {sectionRows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell align="right">{r.previous !== null ? r.previous.toFixed(0) : '—'}</TableCell>
                  <TableCell align="right">{r.current.toFixed(0)}</TableCell>
                  <TableCell align="right">{r.diff !== null ? (<Chip label={`${r.diff > 0 ? '+' : ''}${r.diff.toFixed(0)}`} sx={{ bgcolor: r.diff > 0 ? greenPastel : r.diff < 0 ? redPastel : undefined, color: '#000' }} />) : ('—')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    );
  };
  // --- END: New function to render comparison ---
  
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert></Box>;
  if (!inspection) return <Box sx={{ p: 4 }}><Alert severity="info">לא נמצא דוח ביקורת.</Alert></Box>;

  const redPastel = '#f8d7da';

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 2, md: 4 }, bgcolor: '#f9f9f9', minHeight: '100vh' }}>
        <Paper sx={{ p: { xs: 2, md: 4 }, direction: 'rtl' }}>
            <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="h4" gutterBottom>דוח סיכום ביקורת - {inspection.storeId?.name || 'סניף לא זמין'}</Typography>
                <Grid container>
                  <Grid item xs={6}><Typography><strong>שם הבקר:</strong> {inspection.inspectorId?.fullName || '—'}</Typography></Grid>
                  <Grid item xs={6}><Typography><strong>תאריך:</strong> {new Date(inspection.createdAt).toLocaleDateString('he-IL')}</Typography></Grid>
                  <Grid item xs={6}><Typography><strong>שם התבנית:</strong> {inspection.templateId?.name || 'תבנית לא זמינה'}</Typography></Grid>
                  <Grid item xs={6}><Typography><strong>שעה:</strong> {new Date(inspection.createdAt).toLocaleTimeString('he-IL')}</Typography></Grid>
                </Grid>
            </Box>

            {/* Calling the new render function here */}
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
    </Box>
  );
};

export default SharedInspectionPage;