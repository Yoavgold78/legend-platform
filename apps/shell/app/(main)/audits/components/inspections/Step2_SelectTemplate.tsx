'use client';

import React from 'react';
import { List, ListItemButton, ListItemText, Typography, CircularProgress, Alert, Box } from '@mui/material';

interface TemplateInfo {
  _id: string;
  name: string;
  description: string;
}

interface Props {
  templates: TemplateInfo[];
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  loading: boolean;
  error: string | null;
}

const Step2_SelectTemplate = ({ templates, selectedTemplateId, onTemplateChange, loading, error }: Props) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>שלב 2: בחירת תבנית ביקורת</Typography>
      {loading ? <CircularProgress /> : error ? <Alert severity="error">{error}</Alert> : (
        <List>
          {templates.map((template) => (
            <ListItemButton
              key={template._id}
              selected={selectedTemplateId === template._id}
              onClick={() => onTemplateChange(template._id)}
              sx={{ border: '1px solid #ddd', borderRadius: '8px', mb: 1 }}
            >
              <ListItemText primary={template.name} secondary={template.description} />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
};

export default Step2_SelectTemplate;