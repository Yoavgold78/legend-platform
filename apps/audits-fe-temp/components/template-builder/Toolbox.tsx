import { Paper, Typography, List, ListItemButton, ListItemText } from '@mui/material';

const Toolbox = () => {
  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        סוגי שאלות
      </Typography>
      <List>
        <ListItemButton sx={{ border: '1px dashed grey', mb: 1, borderRadius: 1 }}>
          <ListItemText primary="שאלה (כן/לא)" />
        </ListItemButton>
        <ListItemButton sx={{ border: '1px dashed grey', mb: 1, borderRadius: 1 }}>
          <ListItemText primary="בחירה מרובה" />
        </ListItemButton>
        <ListItemButton sx={{ border: '1px dashed grey', mb: 1, borderRadius: 1 }}>
          <ListItemText primary="סליידר" />
        </ListItemButton>
        <ListItemButton sx={{ border: '1px dashed grey', mb: 1, borderRadius: 1 }}>
          <ListItemText primary="שדה טקסט" />
        </ListItemButton>
      </List>
    </Paper>
  );
};

export default Toolbox;