'use client';
import { Paper, Typography, Box, Stack, Divider, RadioGroup, FormControlLabel, Radio, Slider, TextField, Button } from '@mui/material';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';

const sectionColors = [
  '#673ab7', // Deep Purple
  '#009688', // Teal
  '#E91E63', // Pink
  '#FF9800', // Orange
  '#2196F3', // Blue
  '#4CAF50', // Green
];

const getColorForScale = (value: number, maxValue: number) => {
  if (maxValue <= 1) return '#f5f5f5';
  const percentage = value / (maxValue - 1);
  const hue = percentage * 120; 
  return `hsl(${hue}, 70%, 88%)`;
};

const RenderPreviewQuestion = ({ question }: { question: any }) => {
    
    const questionActions = (
        <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: 'flex-end' }}>
            {question.allowComment && (
                <Button size="small" startIcon={<NoteAddOutlinedIcon />} sx={{color: 'text.secondary'}}>
                    הוסף הערה
                </Button>
            )}
            {question.allowPhoto && (
                <Button size="small" startIcon={<AddPhotoAlternateOutlinedIcon />} sx={{color: 'text.secondary'}}>
                    הוסף תמונה
                </Button>
            )}
        </Stack>
    );

    return (
        <Paper variant="outlined" sx={{ mb: 2, p: 2, borderRadius: 2 }}>
            {/* אינדיקציה לשאלת סינון */}
            {question.isFilterQuestion && (
                <Box sx={{ 
                    backgroundColor: '#fff3e0', 
                    border: '1px solid #ff9800',
                    borderRadius: 1,
                    p: 1,
                    mb: 1
                }}>
                    <Typography variant="caption" sx={{ color: '#f57c00', fontWeight: 600, fontSize: '0.75rem' }}>
                        🔍 שאלת סינון - לא נכנסת לציון הכללי
                    </Typography>
                </Box>
            )}
            
            <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>{question.text || "שאלה ללא טקסט"}</Typography>
            
            {question.type === 'yes_no' && (
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button variant="contained" sx={{flex: 1, backgroundColor: 'hsl(120, 70%, 88%)', '&:hover': {backgroundColor: 'hsl(120, 70%, 80%)'}, color: '#2e7d32'}}>כן</Button>
                    <Button variant="outlined" sx={{flex: 1, color: 'text.primary', borderColor: '#ddd'}}>לא</Button>
                </Stack>
            )}

            {question.type === 'multiple_choice' && (
                 <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                    {question.options?.map((opt: any, index: number) => (
                        <Button 
                            key={opt.id} 
                            variant={index === Math.floor(question.options.length / 2) ? "contained" : "outlined"}
                            sx={{
                                flex: 1,
                                minWidth: '80px',
                                backgroundColor: index === Math.floor(question.options.length / 2) ? getColorForScale(index, question.options.length) : 'transparent',
                                color: 'text.primary',
                                borderColor: '#ddd',
                                '&:hover': {
                                    backgroundColor: getColorForScale(index, question.options.length),
                                    borderColor: '#bbb'
                                }
                            }}
                        >
                            {opt.text || `אפשרות ${index+1}`}
                        </Button>
                    ))}
                </Stack>
            )}

            {question.type === 'slider' && (
                <Box sx={{px: 1, pt: 3}}>
                  <Slider 
                    disabled 
                    // --- FIX: Changed 'defaultValue' to 'value' to make it a controlled component ---
                    value={question.sliderRange?.[0] + (question.sliderRange?.[1] - question.sliderRange?.[0]) / 2} 
                    min={question.sliderRange?.[0]} 
                    max={question.sliderRange?.[1]}
                    valueLabelDisplay="on"
                    marks={[{value: question.sliderRange?.[0], label: question.sliderRange?.[0]}, {value: question.sliderRange?.[1], label: question.sliderRange?.[1]}]}
                  />
                </Box>
            )}
            
            {question.type === 'text_input' && (
                <TextField label="תשובה פתוחה" fullWidth disabled variant="outlined" size="small" sx={{mt: 1}}/>
            )}

            {questionActions}
        </Paper>
    );
};

const RenderPreviewSection = ({ section, index }: { section: any, index: number }) => {
    const totalWeight = section.questions.reduce((sum: number, q: any) => {
        return q.type !== 'text_input' ? sum + (q.weight || 0) : sum;
    }, 0);
    
    const headerColor = sectionColors[index % sectionColors.length];

    return (
        <Paper elevation={0} sx={{ p: 0, borderRadius: 3, overflow: 'hidden', border: '1px solid #e0e0e0'}}>
            <Box sx={{ p: 2, backgroundColor: headerColor, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{section.title || "מקטע ללא כותרת"}</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>0 / {totalWeight} (0%)</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
                 {section.questions && section.questions.map((question: any) => (
                    <RenderPreviewQuestion key={question.id} question={question} />
                 ))}
            </Box>
        </Paper>
    );
}

const LivePreview = ({ sections, templateName }: { sections: any[], templateName: string }) => {
  return (
    <Paper sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' }}>
      <Box sx={{
        width: '280px',
        height: '500px', // גובה קבוע לטלפון
        backgroundColor: '#f8fafc',
        borderRadius: '35px',
        border: '8px solid black',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        p: 1.5,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* כותרת קבועה */}
        <Box sx={{ 
          py: 1.5, 
          backgroundColor: 'white', 
          mx: -1.5, 
          mt: -1.5, 
          px: 1.5, 
          borderTopLeftRadius: '27px', 
          borderTopRightRadius: '27px',
          flexShrink: 0 // לא יתכווץ
        }}>
          <Typography variant="h6" align="center" sx={{fontWeight: 600, fontSize: '1rem'}}>
            {templateName || "שם הבקרה"}
          </Typography>
        </Box>
        
        {/* תוכן עם גלילה */}
        <Box sx={{ 
          flexGrow: 1, 
          overflowY: 'auto', 
          mt: 1.5,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#f1f1f1',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#c1c1c1',
            borderRadius: '3px',
            '&:hover': {
              backgroundColor: '#a8a8a8',
            }
          }
        }}>
          <Stack spacing={1.5} sx={{p: 0.5}}>
            {sections && sections.length > 0 ? sections.map((section, index) => (
              <RenderPreviewSection key={section.id} section={section} index={index} />
            )) : (
              <Typography color="text.secondary" align="center" sx={{mt: 4, p: 2}}>
                התצוגה המקדימה של הבקרה תופיע כאן...
              </Typography>
            )}
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
};

export default LivePreview;