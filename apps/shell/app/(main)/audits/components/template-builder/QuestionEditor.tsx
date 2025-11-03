'use client';

import { Box, TextField, IconButton, Stack, Typography, Button, Paper, FormControlLabel, Checkbox, Switch, Select, MenuItem, RadioGroup, Radio, Slider, Table, TableBody, TableCell, TableContainer, TableRow } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';

import QuestionEditor from './QuestionEditor'; // Supports recursion

const FlexibleQuestionEditor = ({
  question,
  isFollowUp = false,
  // Handlers
  updateQuestion,
  deleteQuestion,
  addFollowUpQuestion,
  addOption,
  updateOption,
  deleteOption,
  updateFollowUp,
  deleteFollowUp,
  addFollowUpOption,
  updateFollowUpOption,
  deleteFollowUpOption,
}: any) => {

  const handleConditionalToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      // Set a sensible default to avoid saving empty onAnswer
      let defaultAnswer = '';
      if (question.type === 'yes_no') defaultAnswer = 'כן';
      if (question.type === 'multiple_choice' && Array.isArray(question.options) && question.options.length > 0) {
        defaultAnswer = question.options[0].text || '';
      }
      updateQuestion({ conditionalTrigger: { onAnswer: defaultAnswer, followUpQuestions: [] } });
    } else {
      updateQuestion((prev: any) => {
        const { conditionalTrigger, ...rest } = prev;
        return rest;
      });
    }
  };

  const updateTrigger = (props: object) => {
    updateQuestion({ conditionalTrigger: { ...question.conditionalTrigger, ...props } });
  };
  
  const renderSliderRangeEditor = () => {
    if (question.type !== 'slider') {
        return null;
    }
    return (
        <Box sx={{ mt: 2, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1, border: '1px solid #dee2e6' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>הגדרות סליידר:</Typography>
            <Stack direction="row" spacing={3} alignItems="center">
                <TextField 
                    label="ערך מינימלי" 
                    type="number" 
                    size="small" 
                    value={question.sliderRange?.[0] ?? 1} 
                    onChange={(e) => updateQuestion({ sliderRange: [parseInt(e.target.value, 10), question.sliderRange?.[1]] })} 
                    sx={{ width: '140px' }}
                />
                <Typography variant="body2" color="text.secondary">עד</Typography>
                <TextField 
                    label="ערך מקסימלי" 
                    type="number" 
                    size="small" 
                    value={question.sliderRange?.[1] ?? 10} 
                    onChange={(e) => updateQuestion({ sliderRange: [question.sliderRange?.[0], parseInt(e.target.value, 10)] })} 
                    sx={{ width: '140px' }}
                />
            </Stack>
        </Box>
    );
  };
  
  const renderOptionsEditor = () => {
      if (question.type !== 'multiple_choice') {
          return null;
      }
      return (
          <Box sx={{ mt: 2, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1, border: '1px solid #dee2e6' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>אפשרויות תשובה:</Typography>
              <Stack spacing={2}>
                  {question.options?.map((opt: any, index: number) => (
                      <Paper key={opt.id} variant="outlined" sx={{ p: 2 }}>
                          <Stack direction="row" spacing={2} alignItems="center">
                              <TextField 
                                  label={`אפשרות ${index + 1}`} 
                                  size="small" 
                                  value={opt.text} 
                                  onChange={(e) => updateOption(opt.id, { text: e.target.value })} 
                                  fullWidth 
                              />
                              <TextField 
                                  label="משקל תשובה" 
                                  type="number" 
                                  size="small" 
                                  value={opt.scoreWeight} 
                                  onChange={(e) => updateOption(opt.id, { scoreWeight: parseFloat(e.target.value) || 0 })} 
                                  sx={{ width: '140px' }} 
                              />
                              <IconButton size="small" onClick={() => deleteOption(opt.id)} color="error">
                                  <DeleteIcon fontSize="inherit" />
                              </IconButton>
                          </Stack>
                      </Paper>
                  ))}
                  <Button 
                      size="small" 
                      startIcon={<AddIcon />} 
                      onClick={addOption}
                      variant="outlined"
                      sx={{ alignSelf: 'flex-start' }}
                  >
                      הוסף אפשרות
                  </Button>
              </Stack>
          </Box>
      );
  };

  const renderTriggerConfiguration = () => {
    const trigger = question.conditionalTrigger;
    if (!trigger) {
        return null;
    }
    
    switch (question.type) {
      case 'yes_no':
        return (<RadioGroup row value={trigger.onAnswer || 'כן'} onChange={(e) => updateTrigger({ onAnswer: e.target.value })}>
            <FormControlLabel value="כן" control={<Radio size="small" />} label="כן" />
            <FormControlLabel value="לא" control={<Radio size="small" />} label="לא" />
          </RadioGroup>);
      case 'multiple_choice':
        if (!question.options || question.options.length === 0) return <Typography variant="caption">יש להוסיף אפשרויות תשובה.</Typography>;
        
        // אם onAnswer מכיל ID במקום טקסט, נמצא את הטקסט המתאים
        let displayValue = trigger.onAnswer || '';
        const foundOption = question.options.find((opt: any) => opt.id === trigger.onAnswer);
        if (foundOption) {
          displayValue = foundOption.text;
          // עדכן את הערך לטקסט במקום ID
          updateTrigger({ onAnswer: foundOption.text });
        }
        
        return ( <Select size="small" value={displayValue} onChange={(e) => updateTrigger({ onAnswer: e.target.value })} displayEmpty>
                <MenuItem value="" disabled><em>בחר תשובה להתניה</em></MenuItem>
                {question.options?.map((opt: any) => (<MenuItem key={opt.id} value={opt.text}>{opt.text}</MenuItem>))}
            </Select>);
      default: 
        return null;
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, backgroundColor: isFollowUp ? '#f9f9f9' : 'white' }}>
      {/* שורת השאלה הראשית - פורמט טבלה */}
      <TableContainer>
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell sx={{ border: 'none', width: '50%', pr: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isFollowUp && <SubdirectoryArrowRightIcon color="action" />}
                  <TextField 
                    label="טקסט השאלה" 
                    fullWidth 
                    value={question.text} 
                    onChange={(e) => updateQuestion({ text: e.target.value })}
                    size="small"
                  />
                </Box>
              </TableCell>
              <TableCell sx={{ border: 'none', width: '40%', px: 1 }}>
                <Select
                  fullWidth
                  size="small"
                  value={question.type}
                  onChange={(e) => updateQuestion({ type: e.target.value })}
                  displayEmpty
                >
                  <MenuItem value="yes_no">כן / לא</MenuItem>
                  <MenuItem value="multiple_choice">בחירה מרובה</MenuItem>
                  <MenuItem value="slider">סליידר</MenuItem>
                  <MenuItem value="text_input">טקסט חופשי</MenuItem>
                </Select>
              </TableCell>
              <TableCell sx={{ border: 'none', width: '10%', pl: 1 }}>
                <IconButton onClick={deleteQuestion} size="small" color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* אפשרויות עבור סוגי שאלות מסוימים */}
      {renderSliderRangeEditor()}
      {renderOptionsEditor()}
      
      {/* הגדרות בסיסיות לשאלות המשך */}
      {isFollowUp && (
        <Box sx={{ mt: 1, p: 1.5, backgroundColor: '#f0f8ff', borderRadius: 1, border: '1px solid #cce7ff' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0 }}>
                 {/* משקל שאלה (מוסתר אם זה שאלת סינון או טקסט חופשי) */}
                 {question.type !== 'text_input' && !question.isFilterQuestion && (
                   <TextField 
                     label="משקל שאלה" 
                     type="number" 
                     size="small" 
                     value={question.weight ?? 1} 
                     onChange={(e) => updateQuestion({ weight: parseFloat(e.target.value) || 0 })} 
                     sx={{width: '100px'}} 
                   />
                 )}
                <FormControlLabel 
                  control={<Checkbox size="small" checked={question.allowComment} onChange={(e) => updateQuestion({ allowComment: e.target.checked })} />} 
                  label="אפשר הערה"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                />
                <FormControlLabel 
                  control={<Checkbox size="small" checked={question.allowPhoto} onChange={(e) => updateQuestion({ allowPhoto: e.target.checked })} />} 
                  label="אפשר תמונה"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                />
                {/* שאלת סינון - בדרך כלל רק לשאלות המשך שלא צריכות להיות מדורגות */}
                {question.type !== 'text_input' && (
                  <FormControlLabel 
                    control={<Checkbox size="small" checked={question.isFilterQuestion || false} onChange={(e) => updateQuestion({ isFilterQuestion: e.target.checked })} />} 
                    label="שאלת סינון (לא מדורגת)"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem', color: '#ff9800' } }}
                  />
                )}
            </Stack>
        </Box>
      )}
      
      {/* הגדרות מתקדמות מתחת לטבלה */}
      {!isFollowUp && (
        <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: '#f8f9fa', borderRadius: 1, border: '1px solid #e9ecef' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                 {/* משקל שאלה (מוסתר אם זה שאלת סינון או טקסט חופשי) */}
                 {question.type !== 'text_input' && !question.isFilterQuestion && (
                   <TextField 
                     label="משקל שאלה" 
                     type="number" 
                     size="small" 
                     value={question.weight ?? 1} 
                     onChange={(e) => updateQuestion({ weight: parseFloat(e.target.value) || 0 })} 
                     sx={{width: '100px'}} 
                   />
                 )}
                <FormControlLabel 
                  control={<Checkbox size="small" checked={question.allowComment} onChange={(e) => updateQuestion({ allowComment: e.target.checked })} />} 
                  label="אפשר הערה"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                />
                <FormControlLabel 
                  control={<Checkbox size="small" checked={question.allowPhoto} onChange={(e) => updateQuestion({ allowPhoto: e.target.checked })} />} 
                  label="אפשר תמונה"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                />
                {/* שאלת סינון - שאלה שלא משפיעה על הציון */}
                {question.type !== 'text_input' && (
                  <FormControlLabel 
                    control={<Checkbox size="small" checked={question.isFilterQuestion || false} onChange={(e) => updateQuestion({ isFilterQuestion: e.target.checked })} />} 
                    label="שאלת סינון (לא מדורגת)"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem', color: '#ff9800' } }}
                  />
                )}
                {/* לוגיקה מותנית - הועבר לאותה שורה */}
                {question.type !== 'text_input' && (
                  <FormControlLabel 
                    control={<Switch size="small" checked={Boolean(question.conditionalTrigger)} onChange={handleConditionalToggle} />} 
                    label="הפעל לוגיקה מותנית"
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                  />
                )}
            </Stack>

            {/* תוכן לוגיקה מותנית */}
            {question.type !== 'text_input' && question.conditionalTrigger && (
                <Box sx={{ pl: 1.5, mt: 1.5, backgroundColor: '#ffffff', p: 1.5, borderRadius: 1, border: '1px solid #dee2e6' }}>
                  <Typography variant="body2" sx={{ mb: 1, fontSize: '0.875rem' }}>הצג שאלות המשך כאשר התשובה היא:</Typography>
                  {renderTriggerConfiguration()}
                  <Box sx={{ pl: 1.5, mt: 1.5, borderRight: '2px solid #e0e0e0', pr: 1.5}}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontSize: '0.875rem' }}>שאלות המשך:</Typography>
                      <Stack spacing={1.5}>
                      {question.conditionalTrigger.followUpQuestions?.map((fuQuestion: any) => (
                          <QuestionEditor
                              key={fuQuestion.id} question={fuQuestion} isFollowUp={true}
                              updateQuestion={(p:any) => updateFollowUp(fuQuestion.id, p)}
                              deleteQuestion={() => deleteFollowUp(fuQuestion.id)}
                              addFollowUpQuestion={() => addFollowUpQuestion()}
                              addOption={() => addFollowUpOption(fuQuestion.id)}
                              updateOption={(oId:any, p:any) => updateFollowUpOption(fuQuestion.id, oId, p)}
                              deleteOption={(oId:any) => deleteFollowUpOption(fuQuestion.id, oId)}
                          />
                      ))}
                      </Stack>
                      <Button size="small" startIcon={<AddIcon />} onClick={() => addFollowUpQuestion()} sx={{ mt: 1.5 }}> הוסף שאלת המשך </Button>
                  </Box>
                </Box>
            )}
        </Box>
      )}
    </Paper>
  );
};

export default FlexibleQuestionEditor;