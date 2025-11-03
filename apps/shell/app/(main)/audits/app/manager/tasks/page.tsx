'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Grid,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Stack,
    ImageList,
    ImageListItem,
    LinearProgress,
    Snackbar
} from '@mui/material';
import { getManagerTasks } from '../../../lib/api/tasks';
import { Task } from '../../../types/inspection'; 
import useManagerStore from '../../../store/managerStore';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CollectionsIcon from '@mui/icons-material/Collections';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { uploadImage } from '../../../lib/api/upload';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import axios from '../../../lib/axios';


export default function ManagerTasksPage() {
    // Get selectedStoreId from global manager store
    const { selectedStoreId } = useManagerStore();
    
    // We now use the imported Task type
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [activeTask, setActiveTask] = useState<any | null>(null);
    const [localProofPreviews, setLocalProofPreviews] = useState<string[]>([]);
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [snack, setSnack] = useState<{open: boolean; message: string; severity: 'success'|'error'|'info'}>({open:false,message:'',severity:'info'});
    const [viewOpen, setViewOpen] = useState(false);
    const [viewTask, setViewTask] = useState<any | null>(null);

    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    // Hidden file inputs for camera and gallery
    const cameraInputRef = useRef<HTMLInputElement | null>(null);
    const galleryInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                setLoading(true);
                // Pass selectedStoreId to the API call to filter tasks by store
                const fetchedTasks: any[] = await getManagerTasks(selectedStoreId);
                setTasks(fetchedTasks);
                setError(null);
            } catch (err) {
                setError('לא ניתן היה לטעון את המשימות. נסה שוב מאוחר יותר.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [selectedStoreId]); // Re-fetch when selectedStoreId changes

    // We use the imported Task type here as well
    const getTaskCardStyle = (task: any) => {
        const isOverdue = new Date(task.dueDate) < new Date();
        
        if (task.status === 'Completed') {
            return { backgroundColor: '#e8f5e9', border: '1px solid #2e7d32' }; // Green tint when completed
        }
        if (isOverdue) {
            return { backgroundColor: '#ffebee', border: '1px solid #c62828' };
        }
        if (task.priority === 'High') {
            return { backgroundColor: '#fffde7', border: '1px solid #f9a825' };
        }
        return { backgroundColor: 'white' };
    };

    // Sorting: open tasks first by dueDate asc, then priority (High before Normal), then completed tasks by completedAt desc
    const sortedTasks = useMemo(() => {
        const prioRank = (p: string) => (p === 'High' ? 0 : 1);
        const copy = [...(tasks as any[])];
        return copy.sort((a, b) => {
            const aCompleted = a.status === 'Completed';
            const bCompleted = b.status === 'Completed';
            if (aCompleted && !bCompleted) return 1; // completed goes last
            if (!aCompleted && bCompleted) return -1;
            if (!aCompleted && !bCompleted) {
                const ad = new Date(a.dueDate).getTime();
                const bd = new Date(b.dueDate).getTime();
                if (ad !== bd) return ad - bd; // earlier first
                return prioRank(a.priority) - prioRank(b.priority);
            }
            // both completed -> most recently completed first
            const ac = a.completedAt ? new Date(a.completedAt).getTime() : 0;
            const bc = b.completedAt ? new Date(b.completedAt).getTime() : 0;
            return bc - ac;
        });
    }, [tasks]);

    const openViewDialog = (task: any) => {
        setViewTask(task);
        setViewOpen(true);
    };
    const closeViewDialog = () => {
        setViewOpen(false);
        setViewTask(null);
    };

    const handleOpenDialog = (task: any) => {
        setActiveTask(task);
        setLocalProofPreviews((task.proofImageUrls && Array.isArray(task.proofImageUrls)) ? task.proofImageUrls : []);
        setUploadedUrls([]);
        setUploadProgress(0);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setActiveTask(null);
        setLocalProofPreviews([]);
        setUploadedUrls([]);
        setUploadProgress(0);
    };

    const onFilesSelected = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        // Helper: client-side compression to reduce size before upload
        const compressImage = async (file: File, opts?: { maxWidth?: number; maxHeight?: number; quality?: number; mimeType?: string }): Promise<File> => {
            const maxWidth = opts?.maxWidth ?? 1280;
            const maxHeight = opts?.maxHeight ?? 1280;
            const quality = opts?.quality ?? 0.72;
            const mimeType = opts?.mimeType ?? 'image/jpeg';
            try {
                const imageBitmap = await (window.createImageBitmap ? window.createImageBitmap(file) : new Promise<ImageBitmap>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        // @ts-ignore
                        const bmp = window.createImageBitmap ? null : undefined;
                        // Fallback path without createImageBitmap: draw via canvas directly below
                        resolve((img as unknown) as ImageBitmap);
                    };
                    img.onerror = reject;
                    img.src = URL.createObjectURL(file);
                }));

                // Dimensions
                // @ts-ignore - for fallback when imageBitmap is actually HTMLImageElement
                const iw = imageBitmap.width || imageBitmap.naturalWidth;
                // @ts-ignore
                const ih = imageBitmap.height || imageBitmap.naturalHeight;
                let tw = iw;
                let th = ih;
                if (iw > maxWidth || ih > maxHeight) {
                    const ratio = Math.min(maxWidth / iw, maxHeight / ih);
                    tw = Math.round(iw * ratio);
                    th = Math.round(ih * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = tw;
                canvas.height = th;
                const ctx = canvas.getContext('2d');
                if (!ctx) return file;

                // Draw
                // @ts-ignore
                const drawSource = (imageBitmap as any).close ? imageBitmap : undefined;
                if (drawSource) {
                    // Proper ImageBitmap
                    ctx.drawImage(imageBitmap as unknown as CanvasImageSource, 0, 0, tw, th);
                    // @ts-ignore
                    imageBitmap.close && imageBitmap.close();
                } else {
                    // Fallback if we resolved to an HTMLImageElement in older browsers
                    const imgEl = new Image();
                    imgEl.src = URL.createObjectURL(file);
                    await new Promise((res, rej) => { imgEl.onload = () => res(null); imgEl.onerror = rej; });
                    ctx.drawImage(imgEl, 0, 0, tw, th);
                }

                const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
                if (!blob) return file;
                const name = file.name.replace(/\.[^.]+$/, '.jpg');
                return new File([blob], name, { type: mimeType, lastModified: Date.now() });
            } catch (_e) {
                // If compression fails, fallback to original file
                return file;
            }
        };

        // Compress first, then show previews of compressed results, then upload
        try {
            setUploading(true);
            const compressedFiles: File[] = [];
            for (const f of Array.from(files)) {
                const cf = await compressImage(f);
                compressedFiles.push(cf);
            }

            // Previews for compressed images
            const previews: string[] = compressedFiles.map(f => URL.createObjectURL(f));
            setLocalProofPreviews(prev => [...prev, ...previews]);

            const urls: string[] = [];
            let uploadedCount = 0;
            for (const file of compressedFiles) {
                const url = await uploadImage(file, (e: ProgressEvent) => {
                    if (e.total) {
                        // Progress per-file; approximate overall progress
                        const fileRatio = (uploadedCount + e.loaded / e.total) / compressedFiles.length;
                        setUploadProgress(Math.round(fileRatio * 100));
                    }
                });
                urls.push(url);
                uploadedCount += 1;
                setUploadProgress(Math.round((uploadedCount / compressedFiles.length) * 100));
            }
            setUploadedUrls(prev => [...prev, ...urls]);
            setSnack({ open: true, message: 'התמונות הועלו בהצלחה', severity: 'success' });
        } catch (err: any) {
            console.error(err);
            setSnack({ open: true, message: 'העלאת התמונות נכשלה', severity: 'error' });
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const canComplete = useMemo(() => {
        return uploadedUrls.length > 0; // Require at least one uploaded image
    }, [uploadedUrls.length]);

    const markTaskCompleted = async () => {
        if (!activeTask) return;
        if (!canComplete) return;
        try {
            // Minimal backend call. If endpoint isn't present yet, this will 404 and we'll handle gracefully.
            await axios.put(`/tasks/${activeTask._id}/complete`, {
                proofImageUrls: uploadedUrls,
            });

            // Update UI optimistically
            setTasks(prev => prev.map((t: any) => t._id === activeTask._id ? { ...t, status: 'Completed', proofImageUrls: uploadedUrls, completedAt: new Date().toISOString() } : t));
            setSnack({ open: true, message: 'המשימה סומנה כהושלמה', severity: 'success' });
            handleCloseDialog();
        } catch (err: any) {
            // If backend route doesn't exist yet, keep local state and inform user
            console.error(err);
            const msg = err?.response?.status === 404
                ? 'נדרש עדכון לשרת כדי להשלים את הסימון. נבצע לאחר אישורך.'
                : 'פעולת הסימון נכשלה.';
            setSnack({ open: true, message: msg, severity: 'error' });
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                משימות פתוחות
            </Typography>

            {tasks.length === 0 ? (
                <Typography sx={{ textAlign: 'right', mt: 2 }}>
                    אין משימות פתוחות כרגע. כל הכבוד!
                </Typography>
            ) : (
                <>
                <Grid container spacing={2}>
                    {sortedTasks.map((task: any) => { // Using 'any' here for now to match backend response flexibility
                        const isOverdue = new Date(task.dueDate) < new Date();
                        return (
                            <Grid item xs={12} sm={6} md={4} key={task._id}>
                                <Card sx={getTaskCardStyle(task)}>
                                    <CardContent>
                                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
                                            חנות: {task.storeId.name}
                                        </Typography>
                                        <Typography variant="h6" component="div" sx={{ textAlign: 'right', my: 1 }}>
                                            {task.description}
                                        </Typography>
                                        {task.originatingQuestionText && (
                                             <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'right' }}>
                                               מקור: "{task.originatingQuestionText}"
                                             </Typography>
                                        )}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                                            <Chip 
                                                icon={task.priority === 'High' ? <PriorityHighIcon /> : undefined}
                                                label={task.priority === 'High' ? 'דחיפות גבוהה' : 'דחיפות רגילה'}
                                                color={task.priority === 'High' ? 'warning' : 'default'}
                                                size="small"
                                            />
                                            <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    color: isOverdue ? 'error.main' : 'text.secondary',
                                                    fontWeight: isOverdue ? 'bold' : 'normal'
                                                }}
                                            >
                                                <EventBusyIcon sx={{ ml: 0.5, fontSize: '1rem' }} />
                                                תאריך יעד: {new Date(task.dueDate).toLocaleDateString('he-IL')}
                                            </Typography>
                                        </Box>

                                        {/* Completed metadata */}
                                        {task.status === 'Completed' && (
                                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right', mt: 1 }}>
                                                הושלמה בתאריך: {task.completedAt ? new Date(task.completedAt).toLocaleDateString('he-IL') : '-'}
                                            </Typography>
                                        )}

                                        {/* Action - Mobile first: single primary button */}
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                                            {task.status === 'Completed' ? (
                                                <Button
                                                    fullWidth
                                                    variant="contained"
                                                    onClick={() => openViewDialog(task)}
                                                >
                                                    צפייה
                                                </Button>
                                            ) : (
                                                <Button
                                                    fullWidth
                                                    color="success"
                                                    variant="contained"
                                                    startIcon={<CheckCircleIcon />}
                                                    onClick={() => handleOpenDialog(task)}
                                                >
                                                    סמן כהושלמה
                                                </Button>
                                            )}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )
                    })}
                </Grid>

                {/* Complete Task Dialog */}
                <Dialog open={dialogOpen} onClose={handleCloseDialog} fullScreen={fullScreen} fullWidth maxWidth="sm">
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        הוספת הוכחות ותמונות
                        <IconButton onClick={handleCloseDialog}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" sx={{ textAlign: 'right', mb: 2 }}>
                            יש להוסיף לפחות תמונה אחת מהגלריה או המצלמה כדי לסמן משימה כהושלמה.
                        </Typography>

                        {/* Buttons to trigger camera or gallery */}
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                            <Button fullWidth variant="contained" startIcon={<PhotoCameraIcon />} onClick={() => cameraInputRef.current?.click()}>
                                מצלמה
                            </Button>
                            <Button fullWidth variant="outlined" startIcon={<CollectionsIcon />} onClick={() => galleryInputRef.current?.click()}>
                                גלריה
                            </Button>
                        </Stack>

                        {/* Hidden inputs */}
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            hidden
                            onChange={(e) => onFilesSelected(e.target.files)}
                        />
                        <input
                            ref={galleryInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={(e) => onFilesSelected(e.target.files)}
                        />

                        {uploading && (
                            <Box sx={{ my: 1 }}>
                                <LinearProgress variant="determinate" value={uploadProgress} />
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}>{uploadProgress}%</Typography>
                            </Box>
                        )}

                        {/* Preview thumbnails */}
                        {localProofPreviews.length > 0 && (
                            <ImageList cols={fullScreen ? 3 : 4} gap={8} sx={{ mt: 1 }}>
                                {localProofPreviews.map((src, idx) => (
                                    <ImageListItem key={src + idx}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={src} alt={`proof-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                                    </ImageListItem>
                                ))}
                            </ImageList>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={handleCloseDialog}>בטל</Button>
                        <Button
                            onClick={markTaskCompleted}
                            startIcon={<CheckCircleIcon />}
                            disabled={!canComplete || uploading}
                            color="success"
                            variant="contained"
                        >
                            סמן כהושלמה
                        </Button>
                    </DialogActions>
                </Dialog>

                <Snackbar
                    open={snack.open}
                    autoHideDuration={4000}
                    onClose={() => setSnack(s => ({ ...s, open: false }))}
                    message={snack.message}
                />

                {/* View Completed Task Dialog */}
                <Dialog open={viewOpen} onClose={closeViewDialog} fullScreen={fullScreen} fullWidth maxWidth="sm">
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        פרטי משימה
                        <IconButton onClick={closeViewDialog}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        {viewTask && (
                            <>
                                <Typography variant="h6" sx={{ textAlign: 'right', mb: 1 }}>{viewTask.description}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
                                    חנות: {viewTask.storeId?.name}
                                </Typography>
                                {viewTask.originatingQuestionText && (
                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right', fontStyle: 'italic' }}>
                                        מקור: "{viewTask.originatingQuestionText}"
                                    </Typography>
                                )}
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                                    <Chip label={`דחיפות: ${viewTask.priority === 'High' ? 'גבוהה' : 'רגילה'}`} size="small" />
                                    <Chip label={`תאריך יעד: ${new Date(viewTask.dueDate).toLocaleDateString('he-IL')}`} size="small" />
                                    {viewTask.completedAt && (
                                        <Chip label={`הושלמה: ${new Date(viewTask.completedAt).toLocaleDateString('he-IL')}`} color="success" size="small" />
                                    )}
                                </Stack>

                                {(viewTask.proofImageUrls?.length || viewTask.proofImageUrl) ? (
                                    <ImageList cols={fullScreen ? 2 : 3} gap={8} sx={{ mt: 2 }}>
                                        {(viewTask.proofImageUrls || [viewTask.proofImageUrl]).filter(Boolean).map((src: string, idx: number) => (
                                            <ImageListItem key={src + idx}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={src} alt={`proof-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                                            </ImageListItem>
                                        ))}
                                    </ImageList>
                                ) : (
                                    <Typography sx={{ mt: 2, textAlign: 'right' }} color="text.secondary">אין תמונות להצגה</Typography>
                                )}
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeViewDialog}>סגור</Button>
                    </DialogActions>
                </Dialog>
                </>
            )}
        </Box>
    );
}