'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import useManagerStore from '@/store/managerStore';
import {
  Box,
  Typography,
  Paper,
  Grid,
  LinearProgress,
  Alert,
  CircularProgress,
  Button,
} from '@mui/material';
import { getAllInspections, generateShareLink } from '@/lib/api/inspections';

// Types mirrored from inspector page for consistency
interface Inspection {
  _id: string;
  storeId: { _id: string; name: string } | string | null;
  templateId: { name: string } | string | null;
  performedAt: string;
  finalScore: number;
}

interface StoreGroup {
  storeId: string;
  storeName: string;
  inspections: Inspection[];
  latestInspection: Inspection;
  totalInspections: number;
}

export default function AuditsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { selectedStoreId } = useManagerStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getAllInspections();
        setInspections(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('שגיאה בטעינת הבקרות. נסה שוב מאוחר יותר.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter by manager's allowed stores (if provided)
  const allowedStoreIds = (user?.stores || []).map(String);

  const filteredInspections = useMemo(() => {
    if (!inspections) return [] as Inspection[];
    
    // Handle global store filter from useManagerStore
    if (selectedStoreId === 'all') {
      // Show all inspections from user's allowed stores
      if (allowedStoreIds.length > 0) {
        return inspections.filter((ins) => {
          if (!ins.storeId || typeof ins.storeId !== 'object') return false;
          return allowedStoreIds.includes(String(ins.storeId._id));
        });
      }
      // If no store constraints were provided on the user, show empty (safer default)
      return [] as Inspection[];
    } else {
      // Show inspections only from the selected store
      return inspections.filter((ins) => {
        if (!ins.storeId || typeof ins.storeId !== 'object') return false;
        return String(ins.storeId._id) === selectedStoreId;
      });
    }
  }, [inspections, allowedStoreIds, selectedStoreId]);

  const storeGroups = useMemo<StoreGroup[]>(() => {
    const map = new Map<string, StoreGroup>();
    filteredInspections.forEach((ins) => {
      if (!ins.storeId || typeof ins.storeId !== 'object') return;
      const sId = ins.storeId._id;
      const sName = ins.storeId.name;
      if (!map.has(sId)) {
        map.set(sId, {
          storeId: sId,
          storeName: sName,
          inspections: [],
          latestInspection: ins,
          totalInspections: 0,
        });
      }
      const group = map.get(sId)!;
      group.inspections.push(ins);
      group.totalInspections++;
      if (new Date(ins.performedAt) > new Date(group.latestInspection.performedAt)) {
        group.latestInspection = ins;
      }
    });

    return Array.from(map.values())
      .map((g) => ({
        ...g,
        inspections: g.inspections.sort(
          (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
        ),
      }))
      .sort(
        (a, b) =>
          new Date(b.latestInspection.performedAt).getTime() -
          new Date(a.latestInspection.performedAt).getTime()
      );
  }, [filteredInspections]);

  const toggleStoreExpanded = (storeId: string) => {
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  };

  // Open a view the manager is allowed to access by using the existing share page
  const handleViewSummary = async (inspectionId: string) => {
    try {
      const res = await generateShareLink(inspectionId);
      const token = res.token;
      if (token) {
        router.push(`/share/${token}`);
        return;
      }
      // Fallback if token missing
      router.push(`/inspection/results/${inspectionId}`);
    } catch (err) {
      console.error('Failed to open summary via share link:', err);
      // Fallback to the original route
      router.push(`/inspection/results/${inspectionId}`);
    }
  };

  return (
    <Box sx={{ direction: 'rtl', p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
        צפייה בבקרות
      </Typography>

      {loading && (
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && storeGroups.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {storeGroups.length === 1 ? (
            // Single-store manager: show only the inspections list without the store header
            <Paper elevation={2} sx={{ borderRadius: '12px', p: 3 }}>
              {storeGroups[0].inspections.map((inspection) => (
                <Box
                  key={inspection._id}
                  sx={{
                    py: 2,
                    px: 3,
                    mb: 2,
                    borderRadius: 2,
                    bgcolor: 'background.default',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1">
                      {typeof inspection.templateId === 'object' && inspection.templateId?.name
                        ? inspection.templateId.name
                        : 'תבנית לא זמינה'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(inspection.performedAt).toLocaleDateString('he-IL')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography>ציון: {Math.round(inspection.finalScore)}%</Typography>
                    <Button variant="outlined" size="small" onClick={() => handleViewSummary(inspection._id)}>
                      הצג סיכום
                    </Button>
                  </Box>
                </Box>
              ))}
            </Paper>
          ) : (
            // Multi-store manager: grouped view with expandable store headers
            storeGroups.map((store) => (
              <Paper key={store.storeId} elevation={2} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
                <Box
                  onClick={() => toggleStoreExpanded(store.storeId)}
                  sx={{
                    p: 3,
                    cursor: 'pointer',
                    bgcolor: expandedStores.has(store.storeId) ? 'action.selected' : 'background.paper',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Typography variant="h6" component="h3" fontWeight={500}>
                        {store.storeName}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        ביקורת אחרונה: {new Date(store.latestInspection.performedAt).toLocaleDateString('he-IL')}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box>
                        <Typography variant="body2">ציון אחרון: {Math.round(store.latestInspection.finalScore)}%</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={store.latestInspection.finalScore}
                          sx={{ height: '8px', borderRadius: '4px', mt: 1 }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Typography variant="body2" color="text.secondary">
                        סה״כ ביקורות: {store.totalInspections}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                {expandedStores.has(store.storeId) && (
                  <Box sx={{ p: 3, pt: 0, borderTop: '1px solid', borderColor: 'divider' }}>
                    {store.inspections.map((inspection) => (
                      <Box
                        key={inspection._id}
                        sx={{
                          py: 2,
                          px: 3,
                          mt: 2,
                          borderRadius: 2,
                          bgcolor: 'background.default',
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle1">
                            {typeof inspection.templateId === 'object' && inspection.templateId?.name
                              ? inspection.templateId.name
                              : 'תבנית לא זמינה'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(inspection.performedAt).toLocaleDateString('he-IL')}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography>ציון: {Math.round(inspection.finalScore)}%</Typography>
                          <Button variant="outlined" size="small" onClick={() => handleViewSummary(inspection._id)}>
                            הצג סיכום
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            ))
          )}
        </Box>
      ) : (
        !loading && (
          <Paper elevation={2} sx={{ p: 4, borderRadius: '12px', textAlign: 'center' }}>
            <Typography color="text.secondary">לא נמצאו ביקורות להצגה.</Typography>
          </Paper>
        )
      )}
    </Box>
  );
}