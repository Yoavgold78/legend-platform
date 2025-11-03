'use client';

import React from 'react';
import { Box, Typography, Paper, Grid, Divider, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import type { Store, FullTemplate, Answer } from '@/types/inspection';

interface Props {
  preview: { finalScore: number; sectionScores: { sectionName: string; score: number }[] };
  fullTemplate: FullTemplate;
  stores: Store[];
  selectedStore: string;
  userName?: string;
  answers: Answer[];
  photoFiles: { [key: string]: { previewUrl: string }[] };
  summaryText: string;
  previousInspection: any | null;
  redPastel?: string;
}

export default function PreviewReport({
  preview,
  fullTemplate,
  stores,
  selectedStore,
  userName,
  answers,
  photoFiles,
  summaryText,
  previousInspection,
  redPastel = '#f8d7da',
}: Props) {
  const getAnswerForQuestion = (questionId: string) => answers.find((a) => a.questionId === questionId);
  return (
    <Paper sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="h4" gutterBottom>
          דוח סיכום ביקורת - {stores.find(s => s._id === selectedStore)?.name || 'חנות'}
        </Typography>
        <Grid container>
          <Grid item xs={6}><Typography><strong>שם הבקר:</strong> {userName}</Typography></Grid>
          <Grid item xs={6}><Typography><strong>תאריך:</strong> {new Date().toLocaleDateString('he-IL')}</Typography></Grid>
          <Grid item xs={6}><Typography><strong>שם התבנית:</strong> {fullTemplate.name}</Typography></Grid>
          <Grid item xs={6}><Typography><strong>שעה:</strong> {new Date().toLocaleTimeString('he-IL')}</Typography></Grid>
        </Grid>
      </Box>

      {previousInspection && (
        <Box>
          <Typography variant="h5" gutterBottom>עיקרי הממצאים (השוואה לדוח קודם)</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ p: 2, mb: 2 }}>
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
                {preview.sectionScores.map((cur) => {
                  const prev = previousInspection.sectionScores.find((p: any) => p.sectionName === cur.sectionName);
                  const diff = prev ? (cur.score - prev.score) : null;
                  return (
                    <TableRow key={cur.sectionName}>
                      <TableCell>{cur.sectionName}</TableCell>
                      <TableCell align="right">{prev ? prev.score.toFixed(0) : '—'}</TableCell>
                      <TableCell align="right">{cur.score.toFixed(0)}</TableCell>
                      <TableCell align="right">
                        {diff !== null ? (
                          <Chip label={`${diff > 0 ? '+' : ''}${diff.toFixed(0)}`} sx={{ bgcolor: diff > 0 ? '#d4edda' : diff < 0 ? '#f8d7da' : undefined, color: '#000' }} />
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>סיכום ציונים</Typography>
        <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-around', alignItems: 'center', gap: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" color="primary">{Number(preview.finalScore ?? 0).toFixed(0)}</Typography>
            <Typography variant="h6">ציון סופי</Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box>
            {preview.sectionScores.map(s => (
              <Typography key={s.sectionName}><strong>{s.sectionName}:</strong> {Number(s.score ?? 0).toFixed(0)}</Typography>
            ))}
          </Box>
        </Paper>
      </Box>

      <Box>
        <Typography variant="h5" gutterBottom>פירוט מלא</Typography>
        {fullTemplate.sections.map(section => (
          <Box key={section._id} sx={{ mb: 3 }}>
            <Box sx={{ p: 1, backgroundColor: 'primary.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ color: 'white' }}>מקטע: {section.title}</Typography>
              {(() => {
                const secScoreObj = preview.sectionScores.find(s => s.sectionName === section.title);
                const secScore = secScoreObj ? Math.round(secScoreObj.score) : null;
                return secScore !== null ? <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>{secScore}</Typography> : null;
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
                    <Typography sx={{ mt: 1 }}>
                      <strong>תשובה:</strong> {mainAnswer ? (String(mainAnswer.value) === 'yes' ? 'כן' : String(mainAnswer.value) === 'no' ? 'לא' : String(mainAnswer.value)) : 'לא נענה'}
                    </Typography>
                    {mainAnswer?.comment && (
                      <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: '#fff9c4', borderRadius: 1 }}>
                        <strong>הערה:</strong> {mainAnswer.comment}
                      </Typography>
                    )}
                    {(photoFiles[question._id] || []).length > 0 && (
                      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {photoFiles[question._id].map((photo, idx) => (
                          <img key={idx} src={photo.previewUrl} alt={`preview ${idx}`} height="100" style={{ border: '1px solid #ddd', borderRadius: 4 }} />
                        ))}
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
                        {followUpAnswer?.comment && (
                          <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: '#fff9c4', borderRadius: 1 }}>
                            <strong>הערה:</strong> {followUpAnswer.comment}
                          </Typography>
                        )}
                        {(photoFiles[followUpId] || []).length > 0 && (
                          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {photoFiles[followUpId].map((photo, idx) => (
                              <img key={idx} src={photo.previewUrl} alt={`preview ${idx}`} height="100" style={{ border: '1px solid #ddd', borderRadius: 4 }} />
                            ))}
                          </Box>
                        )}
                      </Paper>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </Box>
        ))}
      </Box>

      {summaryText && (
        <>
          <Divider sx={{ my: 3 }} />
          <Box>
            <Typography variant="h5" gutterBottom>סיכום הדוח</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{summaryText}</Typography>
          </Box>
        </>
      )}
    </Paper>
  );
}
