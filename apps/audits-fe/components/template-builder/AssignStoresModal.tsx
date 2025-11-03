// frontend/components/template-builder/AssignStoresModal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
    List, ListItem, ListItemButton, ListItemText, Checkbox, CircularProgress,
    TextField, Typography, FormGroup, FormControlLabel, Snackbar, Alert
} from '@mui/material';
import axios from '../../lib/axios';

interface Store {
    _id: string;
    name: string;
    address?: string;
}

interface AssignStoresModalProps {
    open: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    templateId: string | null;
    templateName: string;
    initialSelectedIds: string[];
}

export default function AssignStoresModal({ open, onClose, onSaveSuccess, templateId, templateName, initialSelectedIds }: AssignStoresModalProps) {
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set(initialSelectedIds));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        const fetchStores = async () => {
            if (!open) return;
            setLoading(true);
            try {
                const response = await axios.get('/stores');
                setStores(response.data.data || []);
            } catch (error) {
                console.error("Failed to fetch stores", error);
                setSnackbar({ open: true, message: 'טעינת רשימת החנויות נכשלה', severity: 'error' });
            } finally {
                setLoading(false);
            }
        };

        fetchStores();
    }, [open]);
    
    useEffect(() => {
        setSelectedStoreIds(new Set(initialSelectedIds));
    }, [initialSelectedIds]);


    const handleToggle = (storeId: string) => {
        const newSelection = new Set(selectedStoreIds);
        if (newSelection.has(storeId)) {
            newSelection.delete(storeId);
        } else {
            newSelection.add(storeId);
        }
        setSelectedStoreIds(newSelection);
    };

    const filteredStores = useMemo(() => {
        if (!searchTerm) return stores;
        return stores.filter(store => store.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [stores, searchTerm]);

    const handleSelectAll = () => {
        if (selectedStoreIds.size === stores.length) {
            setSelectedStoreIds(new Set()); // Deselect all
        } else {
            setSelectedStoreIds(new Set(stores.map(s => s._id))); // Select all
        }
    };

    const handleSave = async () => {
        if (!templateId) {
            setSnackbar({ open: true, message: 'מזהה תבנית לא קיים', severity: 'error' });
            return;
        }
        if (selectedStoreIds.size === 0) {
            setSnackbar({ open: true, message: 'יש לשייך את התבנית לפחות לחנות אחת', severity: 'warning' });
            return;
        }

        setSaving(true);
        try {
            const payload = { associatedStores: Array.from(selectedStoreIds) };
            await axios.put(`/templates/${templateId}`, payload);
            setSnackbar({ open: true, message: 'שיוך החנויות עודכן בהצלחה!', severity: 'success' });
            setTimeout(() => {
                onSaveSuccess();
            }, 1000);
        } catch (error) {
            console.error("Failed to save associations", error);
            setSnackbar({ open: true, message: 'שמירת השיוכים נכשלה', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };
    
    const handleSnackbarClose = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle>
                    שייך חנויות לתבנית: "{templateName}"
                </DialogTitle>
                <DialogContent dividers>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                    ) : (
                        <Box>
                            <TextField
                                fullWidth
                                variant="outlined"
                                size="small"
                                placeholder="חפש חנות..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={stores.length > 0 && selectedStoreIds.size === stores.length}
                                            indeterminate={selectedStoreIds.size > 0 && selectedStoreIds.size < stores.length}
                                            onChange={handleSelectAll}
                                        />
                                    }
                                    label="בחר הכל / בטל הכל"
                                />
                            </FormGroup>
                            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                                {filteredStores.map(store => {
                                    const labelId = `checkbox-list-label-${store._id}`;
                                    return (
                                        <ListItem key={store._id} disablePadding>
                                            <ListItemButton role={undefined} onClick={() => handleToggle(store._id)} dense>
                                                <Checkbox
                                                    edge="start"
                                                    checked={selectedStoreIds.has(store._id)}
                                                    tabIndex={-1}
                                                    disableRipple
                                                    inputProps={{ 'aria-labelledby': labelId }}
                                                />
                                                <ListItemText id={labelId} primary={store.name} secondary={store.address} />
                                            </ListItemButton>
                                        </ListItem>
                                    );
                                })}
                            </List>
                             {filteredStores.length === 0 && <Typography sx={{textAlign: 'center', mt: 2}}>לא נמצאו חנויות</Typography>}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} color="secondary" disabled={saving}>
                        ביטול
                    </Button>
                    <Button onClick={handleSave} variant="contained" disabled={loading || saving}>
                        {saving ? <CircularProgress size={24} /> : 'שמור שיוכים'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
            </Snackbar>
        </>
    );
}