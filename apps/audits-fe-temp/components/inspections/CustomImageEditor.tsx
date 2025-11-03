'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, useTheme, useMediaQuery, Stack
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UndoIcon from '@mui/icons-material/Undo';

interface CustomImageEditorProps {
  open: boolean;
  imageUrl: string | null;
  onClose: () => void;
  onSave: (file: File) => void;
}

const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) throw new Error('Invalid data URL');
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) { u8arr[n] = bstr.charCodeAt(n); }
  return new File([u8arr], filename, { type: mime });
};

const CustomImageEditor = ({ open, imageUrl, onClose, onSave }: CustomImageEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (open && imageUrl) {
      setPaths([]);
    }
  }, [open, imageUrl]);

  useEffect(() => {
    if (open && drawCanvasRef.current && containerRef.current) {
      const canvas = drawCanvasRef.current;
      const container = containerRef.current;
      
      setTimeout(() => {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        redrawAllPaths(canvas);
      }, 50);
    }
  }, [open]);

  const redrawAllPaths = (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#E53935';
      // --- MODIFIED LINE: Changed lineWidth to be thinner ---
      ctx.lineWidth = isMobile ? 2 : 3; // Changed from 3/5 to 2/3
      // ----------------------------------------------------
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      paths.forEach(path => {
        if (path.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
      });
  }

  useEffect(() => {
    if (!open || !drawCanvasRef.current) return;
    redrawAllPaths(drawCanvasRef.current);
  }, [paths, open, isMobile]);

  const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    if (!drawCanvasRef.current) return null;
    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = (e as React.TouchEvent).touches?.[0];
    const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCoords(e);
    if (!coords) return;
    setIsDrawing(true);
    setPaths(prev => [...prev, [coords]]);
  };

  const handleDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoords(e);
    if (!coords) return;
    setPaths(prev => {
      const newPaths = [...prev];
      newPaths[newPaths.length - 1].push(coords);
      return newPaths;
    });
  };
  
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const preventScroll = (e: TouchEvent) => {
      if (isDrawing) {
        e.preventDefault();
      }
    };
    
    canvas.addEventListener('touchmove', preventScroll, { passive: false });
    
    return () => {
      canvas.removeEventListener('touchmove', preventScroll);
    };
  }, [isDrawing]);


  const handleDrawEnd = () => {
    setIsDrawing(false);
  };

  const handleUndo = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const handleInternalClose = () => {
    setPaths([]);
    onClose();
  };

  const handleSave = async () => {
    if (!drawCanvasRef.current || !imageUrl) return;

    try {
      const drawingCanvas = drawCanvasRef.current;
      const bgImage = new Image();
      bgImage.crossOrigin = 'anonymous';
      bgImage.src = imageUrl;
      await new Promise((resolve, reject) => {
        bgImage.onload = resolve;
        bgImage.onerror = reject;
      });

      const mergedCanvas = document.createElement('canvas');
      mergedCanvas.width = bgImage.naturalWidth;
      mergedCanvas.height = bgImage.naturalHeight;
      const ctx = mergedCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.drawImage(bgImage, 0, 0);
      ctx.drawImage(drawingCanvas, 0, 0, bgImage.naturalWidth, bgImage.naturalHeight);

      const mergedDataUrl = mergedCanvas.toDataURL('image/jpeg', 0.9);
      const finalFile = dataURLtoFile(mergedDataUrl, `edited-${Date.now()}.jpg`);
      
      onSave(finalFile);
    } catch (e) {
      console.error("Failed to save image:", e);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onClose={handleInternalClose} fullScreen={isMobile} maxWidth="lg" fullWidth sx={{ '& .MuiDialog-paper': { height: isMobile ? '100%' : '90%' } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        עריכת תמונה
        <IconButton onClick={handleInternalClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: isMobile ? 1 : 2, display: 'flex', flexDirection: 'column', bgcolor: 'grey.200', overflow: 'hidden' }}>
        <Box 
          ref={containerRef}
          sx={{ 
            position: 'relative', 
            width: '100%', 
            flex: '1 1 auto' 
          }}
        >
          <img 
            src={imageUrl || ''} 
            alt="background" 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain' 
            }}
          />
          <canvas
            ref={drawCanvasRef}
            onMouseDown={handleDrawStart}
            onMouseMove={handleDrawing}
            onMouseUp={handleDrawEnd}
            onMouseLeave={handleDrawEnd}
            onTouchStart={handleDrawStart}
            onTouchMove={handleDrawing}
            onTouchEnd={handleDrawEnd}
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              touchAction: 'none' 
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
        <Button variant="outlined" startIcon={<UndoIcon />} onClick={handleUndo} disabled={paths.length === 0}>בטל פעולה</Button>
        <Stack direction="row" spacing={2}>
          <Button onClick={handleInternalClose}>ביטול</Button>
          <Button onClick={handleSave} variant="contained">שמור תמונה</Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default CustomImageEditor;