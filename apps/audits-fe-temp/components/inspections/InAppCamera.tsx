'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Dialog, IconButton, Slider, Typography, Stack, CircularProgress } from '@mui/material';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import CloseIcon from '@mui/icons-material/Close';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import FlashOffIcon from '@mui/icons-material/FlashOff';
import FlashAutoIcon from '@mui/icons-material/FlashAuto';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

interface InAppCameraProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

const InAppCamera = ({ open, onClose, onCapture }: InAppCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [imageCapture, setImageCapture] = useState<any>(null);

  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [isTorchSupported, setIsTorchSupported] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number; hardware: boolean } | null>(null); // hardware flag
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showFlashOverlay, setShowFlashOverlay] = useState(false);
  const [avgBrightness, setAvgBrightness] = useState<number | null>(null);
  const [permissionState, setPermissionState] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const brightnessIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [focusStatus, setFocusStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const pinchStartRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);
  const touchStartRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let mediaStream: MediaStream | null = null;
    let isCancelled = false;

    const initializeCamera = async () => {
      try {
        setError(null);
        // Query permission state if supported (non-blocking)
        try {
          // @ts-ignore
            if (navigator.permissions?.query) {
              // @ts-ignore
              const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
              setPermissionState(status.state);
              status.onchange = () => setPermissionState(status.state);
            }
        } catch {}

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        };

        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (isCancelled) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();

          const track = mediaStream.getVideoTracks()[0];
          
          // @ts-ignore - ImageCapture may not be in default TS types
          if (window.ImageCapture) {
            // @ts-ignore
            setImageCapture(new window.ImageCapture(track));
          }
          
          // @ts-ignore
          const capabilities = track.getCapabilities ? track.getCapabilities() : {};
            
          // @ts-ignore
          if (capabilities.torch) {
            setIsTorchSupported(true);
          }
          
          // @ts-ignore
          if (capabilities.zoom) {
            setZoomCapabilities({
              // @ts-ignore
              min: capabilities.zoom.min,
              // @ts-ignore
              max: capabilities.zoom.max,
              // @ts-ignore
              step: capabilities.zoom.step || 0.1,
              hardware: true
            });
            // @ts-ignore
            setZoomLevel(capabilities.zoom.min || 1);
          } else {
            // Fallback digital zoom capabilities
            setZoomCapabilities({ min: 1, max: 3, step: 0.1, hardware: false });
            setZoomLevel(1);
          }

          // Attempt continuous autofocus if supported
          try {
            // Attempt continuous focus if browser supports (not typed in TS lib)
            // @ts-ignore
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
              // @ts-ignore
              await (track as any).applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
            }
          } catch (e) {
            console.warn('Continuous autofocus not applied:', e);
          }
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("לא ניתן לגשת למצלמה. יש לוודא שנתת הרשאה לדפדפן.");
      }
    };

    initializeCamera();

    return () => {
      isCancelled = true;
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      setStream(null);
      setImageCapture(null);
      setFlashMode('off');
      setIsTorchSupported(false);
      setZoomCapabilities(null);
      if (brightnessIntervalRef.current) clearInterval(brightnessIntervalRef.current);
      brightnessIntervalRef.current = null;
      setAvgBrightness(null);
    };
  }, [open]);

  // Orientation listener
  useEffect(() => {
    if (!open) return;
    const updateOrientation = () => {
      const isPortrait = window.innerHeight >= window.innerWidth;
      setOrientation(isPortrait ? 'portrait' : 'landscape');
    };
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    // Some devices support orientationchange
    window.addEventListener('orientationchange', updateOrientation);
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, [open]);

  // Brightness analysis (for auto flash decision)
  useEffect(() => {
    if (!open || !videoRef.current || flashMode !== 'auto') {
      if (brightnessIntervalRef.current) {
        clearInterval(brightnessIntervalRef.current);
        brightnessIntervalRef.current = null;
      }
      return;
    }
    if (!analysisCanvasRef.current) {
      analysisCanvasRef.current = document.createElement('canvas');
      analysisCanvasRef.current.width = 32;
      analysisCanvasRef.current.height = 18;
    }
    const canvas = analysisCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sample = () => {
      try {
        ctx.drawImage(videoRef.current as HTMLVideoElement, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let total = 0; // simple avg luminance
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          total += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }
        const avg = total / (data.length / 4);
        setAvgBrightness(avg);
      } catch {}
    };
    sample();
    brightnessIntervalRef.current = setInterval(sample, 800);
    return () => {
      if (brightnessIntervalRef.current) clearInterval(brightnessIntervalRef.current);
      brightnessIntervalRef.current = null;
    };
  }, [open, flashMode]);
  
  // *** MODIFIED CAPTURE LOGIC ***
  // This logic now prioritizes capturing directly from the video stream to ensure WYSIWYG.
  const handleCapture = async () => {
    if (isCapturing || !videoRef.current) return;
    setIsCapturing(true);

    // Decide if we simulate flash overlay (torch fallback)
    const brightnessThreshold = 55; // heuristic
    const needLight = flashMode === 'on' || (flashMode === 'auto' && (avgBrightness ?? 255) < brightnessThreshold);
    const simulateFlash = needLight && !isTorchSupported;

    try {
      if (simulateFlash) {
        setShowFlashOverlay(true);
        await new Promise(r => setTimeout(r, 120)); // brief flash effect
        setShowFlashOverlay(false);
      }

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context is not available");

      // Apply digital zoom cropping if hardware zoom absent
      const capabilities = zoomCapabilities;
      if (capabilities && !capabilities.hardware && zoomLevel > 1) {
        const cropScale = zoomLevel; // scale factor
        const sw = video.videoWidth / cropScale;
        const sh = video.videoHeight / cropScale;
        const sx = (video.videoWidth - sw) / 2;
        const sy = (video.videoHeight - sh) / 2;
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (!blob) throw new Error("Canvas to Blob conversion failed");
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
      handleClose();
    } catch (err) {
      console.error("Failed to capture photo:", err);
      setError("שגיאה בצילום התמונה.");
    } finally {
      setIsCapturing(false);
    }
  };
  
  const applyZoom = useCallback(() => {
    if (!stream || !zoomCapabilities) return;
    if (!zoomCapabilities.hardware) return; // digital handled via CSS/canvas
    const track = stream.getVideoTracks()[0];
    try {
      // @ts-ignore
      track.applyConstraints({ advanced: [{ zoom: zoomLevel }] });
    } catch (err) {
      console.error('Zoom not supported or failed to apply:', err);
    }
  }, [stream, zoomLevel, zoomCapabilities]);
  
  useEffect(() => {
    applyZoom();
  }, [zoomLevel, applyZoom]);

  const cycleFlashMode = useCallback(() => {
    setFlashMode((prev) => (prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off'));
  }, []);

  useEffect(() => {
    if (!stream || !isTorchSupported) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    const brightnessThreshold = 55;
    const enableTorch = flashMode === 'on' || (flashMode === 'auto' && (avgBrightness ?? 255) < brightnessThreshold);
    try {
      // @ts-ignore
      track.applyConstraints({ advanced: [{ torch: enableTorch }] });
    } catch (err) {
      console.warn('Torch not supported or failed to apply:', err);
    }
  }, [stream, flashMode, isTorchSupported, avgBrightness]);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  type TouchLike = { clientX: number; clientY: number };
  const distance = (t1: TouchLike, t2: TouchLike) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const attemptFocusAt = useCallback(async (normX: number, normY: number) => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    // @ts-ignore
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    try {
      // @ts-ignore
      if (caps.pointsOfInterest) {
        // @ts-ignore
        await track.applyConstraints({ advanced: [{ pointsOfInterest: [{ x: normX, y: normY }] }] });
      }
      // @ts-ignore
      if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('single-shot')) {
        // @ts-ignore
        await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] });
      }
      setFocusStatus('ok');
    } catch (err) {
      console.warn('Focus at point not supported:', err);
      setFocusStatus('fail');
    }
  }, [stream]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && zoomCapabilities) {
      e.preventDefault();
      pinchStartRef.current = distance(e.touches[0], e.touches[1]);
      initialZoomRef.current = zoomLevel;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current = { time: Date.now(), x: t.clientX, y: t.clientY };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && zoomCapabilities && pinchStartRef.current) {
      e.preventDefault();
      const d = distance(e.touches[0], e.touches[1]);
      const ratio = d / pinchStartRef.current;
      const next = clamp(initialZoomRef.current * ratio, zoomCapabilities.min, zoomCapabilities.max);
      setZoomLevel(next);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0 && touchStartRef.current && overlayRef.current) {
      const start = touchStartRef.current;
      const endTouch = e.changedTouches[0];
      const dt = Date.now() - start.time;
      const move = Math.hypot(endTouch.clientX - start.x, endTouch.clientY - start.y);
      if (dt < 300 && move < 10) {
        // Detect double tap
        const now = Date.now();
        const prev = lastTapRef.current;
        if (prev && (now - prev.time) < 250 && Math.hypot(prev.x - endTouch.clientX, prev.y - endTouch.clientY) < 40 && zoomCapabilities) {
          // Double tap: cycle zoom (min -> mid -> max)
          const { min, max } = zoomCapabilities;
            const mid = +(min + (max - min) / 2).toFixed(2);
            setZoomLevel(prevLevel => {
              if (prevLevel < mid * 0.9) return mid;
              if (prevLevel < max * 0.9) return max;
              return min;
            });
        } else {
          const rect = overlayRef.current.getBoundingClientRect();
          const x = clamp(endTouch.clientX - rect.left, 0, rect.width);
          const y = clamp(endTouch.clientY - rect.top, 0, rect.height);
          setFocusPoint({ x, y });
          setFocusStatus('idle');
          const nx = rect.width ? x / rect.width : 0.5;
          const ny = rect.height ? y / rect.height : 0.5;
          attemptFocusAt(nx, ny);
          if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
          focusTimeoutRef.current = setTimeout(() => setFocusPoint(null), 1000);
          lastTapRef.current = { time: now, x: endTouch.clientX, y: endTouch.clientY };
        }
      }
      touchStartRef.current = null;
    }
    if (e.touches.length < 2) {
      pinchStartRef.current = null;
    }
  };

  useEffect(() => () => {
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
  }, []);

  // Proper close handler (cleanup stream + video)
  const handleClose = useCallback(() => {
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch {}
    onClose();
  }, [onClose, stream]);

  return (
    <Dialog open={open} onClose={handleClose} fullScreen>
      <Box
        ref={overlayRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: 'black', touchAction: 'none', overflow: 'hidden' }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: zoomCapabilities && !zoomCapabilities.hardware && zoomLevel > 1 ? `scale(${zoomLevel})` : undefined,
            transition: 'transform 0.25s ease',
            transformOrigin: 'center center'
          }}
        />

        {focusPoint && (
          <Box
            sx={{
              position: 'absolute',
              left: focusPoint.x - 30,
              top: focusPoint.y - 30,
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: focusStatus === 'fail' ? '2px solid #ff1744' : focusStatus === 'ok' ? '2px solid #00e676' : '2px solid #ffffff',
              boxShadow: focusStatus === 'fail'
                ? '0 0 8px rgba(255, 23, 68, 0.7)'
                : focusStatus === 'ok'
                  ? '0 0 8px rgba(0,230,118,0.7)'
                  : '0 0 6px rgba(255,255,255,0.6)',
              pointerEvents: 'none',
              animation: 'focus-pulse 1s ease-out'
            }}
          />
        )}

        {showFlashOverlay && (
          <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'white', opacity: 0.85, pointerEvents: 'none', transition: 'opacity 120ms ease' }} />
        )}

        {isCapturing && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <CircularProgress color="inherit" />
          </Box>
        )}

        <IconButton onClick={handleClose} sx={{ position: 'absolute', top: 16, right: 16, color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <CloseIcon />
        </IconButton>

        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 2, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {error && (
            <Typography color="error" sx={{ bgcolor: 'rgba(255,255,255,0.8)', p: 1, borderRadius: 1, mb: 2 }}>
              {error}
            </Typography>
          )}
          {permissionState === 'denied' && (
            <Typography sx={{ bgcolor: 'rgba(255,255,255,0.8)', p: 1, borderRadius: 1, mb: 2, color: 'black' }}>
              ההרשאה למצלמה חסומה. יש לפתוח את הגדרות הדפדפן / המכשיר ולהעניק הרשאת מצלמה.
            </Typography>
          )}
          {flashMode === 'auto' && avgBrightness !== null && (
            <Typography variant="caption" sx={{ color: 'white', mb: 1 }}>
              בהירות: {Math.round(avgBrightness)} {isTorchSupported ? '(פלאש אוטומטי)' : '(סימולציה)'}
            </Typography>
          )}

          {zoomCapabilities && (
            <Stack spacing={2} direction="row" sx={{ mb: 2, color: 'white', width: '80%', alignItems: 'center' }}>
              <ZoomOutIcon />
              <Slider
                aria-label="Zoom"
                value={zoomLevel}
                onChange={(_, newValue) => setZoomLevel(newValue as number)}
                min={zoomCapabilities.min}
                max={zoomCapabilities.max}
                step={zoomCapabilities.step}
                sx={{ color: 'white' }}
              />
              <ZoomInIcon />
            </Stack>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', width: '100%' }}>
            <IconButton onClick={cycleFlashMode} sx={{ color: 'white' }} aria-label={`flash-${flashMode}`}>
              {flashMode === 'on' ? (
                <FlashOnIcon fontSize="large" />
              ) : flashMode === 'auto' ? (
                <FlashAutoIcon fontSize="large" />
              ) : (
                <FlashOffIcon fontSize="large" />
              )}
            </IconButton>
            <IconButton onClick={handleCapture} disabled={isCapturing}>
              <RadioButtonCheckedIcon sx={{ fontSize: 80, color: 'white' }} />
            </IconButton>
            <Box sx={{ width: 48 }} />
          </Box>
        </Box>
      </Box>
      <style>{`
        @keyframes focus-pulse {
          0% { transform: scale(1.2); opacity: 0.7; }
          50% { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1.2); opacity: 0; }
        }
      `}</style>
    </Dialog>
  );
};

export default InAppCamera;