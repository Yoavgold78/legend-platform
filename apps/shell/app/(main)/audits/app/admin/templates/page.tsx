'use client';

import { Box, Typography, Button, Stack, CircularProgress, List, ListItem, ListItemText, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StorefrontIcon from '@mui/icons-material/Storefront'; // אייקון חדש
import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import AssignStoresModal from '../../../components/template-builder/AssignStoresModal';

const TemplatesAdminPage = () => {
  const [templates, setTemplates] = useState<any[]>([]); // הגדרת טיפוס מפורש
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useUser();
  const router = useRouter();

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<any | null>(null);

  // State חדש לחלון שיוך החנויות
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  // Helper function to make authenticated API calls (no changes here)
  const makeAuthenticatedRequest = async (method: string, url: string, data: any = null) => {
    try {
      const tokenResponse = await fetch('/api/auth/token');
      const { accessToken } = await tokenResponse.json();
      const tokenHeader = accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`;
      const config = {
        headers: { 
          'Authorization': tokenHeader,
          'Content-Type': 'application/json'
        }
      };

      if (method === 'GET') {
        return await axios.get(url, config);
      } else if (method === 'POST') {
        return await axios.post(url, data, config);
      } else if (method === 'PUT') {
        return await axios.put(url, data, config);
      } else if (method === 'DELETE') {
        return await axios.delete(url, config);
      }
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };
  
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest('GET', '/templates');
      if (response) {
        const templatesData = Array.isArray(response.data) ? response.data : response.data.data || [];
        setTemplates(templatesData);
      }
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      setError(err.message || 'שגיאה בטעינת התבניות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);
  
  const handleCreateNew = () => {
    router.push('/admin/templates/new');
  };

  const handleEditTemplate = (id: string) => {
    router.push(`/admin/templates/edit/${id}`);
  };

  // פונקציה חדשה לפתיחת חלון השיוך
  const handleOpenAssignModal = (template: any) => {
    setSelectedTemplate(template);
    setAssignModalOpen(true);
  };
  
  // פונקציה לסגירת החלון ורענון הנתונים
  const handleAssignSuccess = () => {
    setAssignModalOpen(false);
    setSelectedTemplate(null);
    fetchTemplates(); // רענון הרשימה כדי להציג שינויים אם היו
  };

  const handleDeleteTemplate = (template: any) => {
    setTemplateToDelete(template);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setTemplateToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await makeAuthenticatedRequest('DELETE', `/templates/${templateToDelete._id}`);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
    } finally {
      handleCloseDeleteDialog();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='h4' component='h1' sx={{ fontWeight: '600' }}>
          ניהול תבניות בקרה
        </Typography>
        <Button
          variant='contained'
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
          sx={{ backgroundColor: '#4285F4', color: 'white', '&:hover': { backgroundColor: '#3c79e6' } }}
        >
          צור תבנית חדשה
        </Button>
      </Box>

      <Box>
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Typography color='error'>Error: {error}</Typography>
        ) : (
          <List>
            {templates.map((template: any) => (
              <ListItem key={template._id} sx={{ borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <ListItemText primary={template.name} secondary={template.description} />
                <Stack direction='row' spacing={1}>
                  {/* הכפתור החדש כאן */}
                  <IconButton edge='end' aria-label='assign-stores' onClick={() => handleOpenAssignModal(template)} title="שייך חנויות">
                    <StorefrontIcon />
                  </IconButton>
                  <IconButton edge='end' aria-label='edit' onClick={() => handleEditTemplate(template._id)} title="ערוך תבנית">
                    <EditIcon />
                  </IconButton>
                  <IconButton edge='end' aria-label='delete' onClick={() => handleDeleteTemplate(template)} title="מחק תבנית">
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* דיאלוג מחיקה (ללא שינוי) */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>אישור מחיקת תבנית</DialogTitle>
        <DialogContent>
          <DialogContentText>
            האם אתה בטוח שברצונך למחוק את התבנית "{templateToDelete?.name}"? לא ניתן לשחזר פעולה זו.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>ביטול</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            מחק
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* חלון שיוך החנויות החדש */}
      {selectedTemplate && (
          <AssignStoresModal
            open={assignModalOpen}
            onClose={() => {
                setAssignModalOpen(false);
                setSelectedTemplate(null);
            }}
            onSaveSuccess={handleAssignSuccess}
            templateId={selectedTemplate?._id}
            templateName={selectedTemplate?.name}
            initialSelectedIds={selectedTemplate?.associatedStores || []}
          />
      )}
    </Box>
  );
};

export default TemplatesAdminPage;