// frontend/app/inspection/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NotificationsBell from '@/components/common/NotificationsBell';
import { getAllInspections } from '@/lib/api/inspections';
import useAuthStore from '@/store/authStore';
import {
  Box,
  Button,
  Typography,
  Grid,
  LinearProgress,
  CircularProgress,
  Alert,
  Avatar,
  Paper,
} from '@mui/material';
import { Add, Logout } from '@mui/icons-material';
import Image from 'next/image';

// Define interfaces for our data structures
interface Inspection {
  _id: string;
  storeId: { _id: string; name: string } | string | null;
  templateId: { name: string } | string | null;
  performedAt: string;
  finalScore: number;
}

interface StoreInspections {
  storeId: string;
  storeName: string;
  inspections: Inspection[];
  latestInspection: Inspection;
  totalInspections: number;
}

const InspectorDashboardPage = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  // *** START OF CHANGE: Importing the correct function name ***
  const logoutUser = useAuthStore((state) => state.logoutUser);
  // *** END OF CHANGE ***
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchInspections = async () => {
      try {
        setLoading(true);
        const data = await getAllInspections();
        setInspections(data);
        setError(null);
      } catch (err) {
        setError('שגיאה בטעינת הביקורות. נסה שוב מאוחר יותר.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInspections();
  }, []);

  // Transform inspections into a store-grouped format
  const storeInspections = React.useMemo<StoreInspections[]>(() => {
    const storeMap = new Map<string, StoreInspections>();

    inspections.forEach(inspection => {
      if (typeof inspection.storeId !== 'object' || !inspection.storeId) {
        console.warn('Skipping inspection with missing or unpopulated storeId:', inspection);
        return;
      }

      const storeId = inspection.storeId._id;
      const storeName = inspection.storeId.name;

      if (!storeMap.has(storeId)) {
        storeMap.set(storeId, {
          storeId,
          storeName: storeName,
          inspections: [],
          latestInspection: inspection,
          totalInspections: 0
        });
      }
      
      const store = storeMap.get(storeId)!;
      store.inspections.push(inspection);
      store.totalInspections++;
      
      if (new Date(inspection.performedAt) > new Date(store.latestInspection.performedAt)) {
        store.latestInspection = inspection;
      }
    });

    return Array.from(storeMap.values()).map(store => ({
      ...store,
      inspections: store.inspections.sort((a, b) => 
        new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
      )
    })).sort((a, b) => 
      new Date(b.latestInspection.performedAt).getTime() - 
      new Date(a.latestInspection.performedAt).getTime()
    );
  }, [inspections]);

  const toggleStoreExpanded = (storeId: string) => {
    setExpandedStores(prev => {
      const newSet = new Set(prev);
      if (newSet.has(storeId)) {
        newSet.delete(storeId);
      } else {
        newSet.add(storeId);
      }
      return newSet;
    });
  };

  const handleStartNewInspection = () => {
    router.push('/inspection/new');
  };

  // *** START OF CHANGE: Updating the logout handler ***
  const handleLogout = () => {
    // 1. Clear the Zustand store first
    logoutUser();
    // 2. Redirect to Auth0 logout
    window.location.href = '/api/auth/logout';
  };
  // *** END OF CHANGE ***

  return (
    <Box sx={{ direction: 'rtl', p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>{user?.fullName?.charAt(0)}</Avatar>
          <Typography variant="h5" component="h1" fontWeight="600">
            {user?.fullName}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
           <Image src="/Logo.jpg" alt="Logo" width={100} height={40} />
           <NotificationsBell />
           <Button
              variant="outlined"
              color="error"
              endIcon={<Logout />}
              onClick={handleLogout}
            >
              יציאה
            </Button>
        </Box>

      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Paper elevation={2} sx={{ p: 3, borderRadius: '12px', bgcolor: '#F8FAFC', textAlign: 'start' }}>
          <Typography variant="h4" component="h2" sx={{ fontWeight: 600 }} gutterBottom>
            התחל ביקורת חדשה
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<Add />}
            onClick={handleStartNewInspection}
            sx={{ mt: 2 }}
          >
            ביקורת חדשה
          </Button>
        </Paper>

        {loading && (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        {!loading && !error && storeInspections.length > 0 ? (
          storeInspections.map((store) => (
            <Paper 
              key={store.storeId}
              elevation={2} 
              sx={{ 
                borderRadius: '12px',
                overflow: 'hidden'
              }}
            >
              <Box
                onClick={() => toggleStoreExpanded(store.storeId)}
                sx={{
                  p: 3,
                  cursor: 'pointer',
                  bgcolor: expandedStores.has(store.storeId) ? 'action.selected' : 'background.paper',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Grid container alignItems="center" spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="h6" component="h3" fontWeight="500">
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
                      <Typography variant="body2">
                        ציון אחרון: {Math.round(store.latestInspection.finalScore)}%
                      </Typography>
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
                        <Typography>
                          ציון: {Math.round(inspection.finalScore)}%
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => router.push(`/inspection/results/${inspection._id}`)}
                        >
                          הצג סיכום
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          ))
        ) : !loading && (
          <Paper elevation={2} sx={{ p: 4, borderRadius: '12px', textAlign: 'center' }}>
            <Typography color="text.secondary">
              לא נמצאו ביקורות להצגה.
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default InspectorDashboardPage;