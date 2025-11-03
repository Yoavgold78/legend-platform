'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tab,
  Tabs,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getAllStores, getAllInspections, getAllTemplates } from '@/lib/api/auth0-api';

interface Store {
  _id: string;
  name: string;
}

interface Inspection {
  _id: string;
  storeId: { _id: string; name: string };
  templateId: { _id?: string; name?: string };
  performedAt: string;
  finalScore: number;
  sectionScores: {
    sectionName: string;
    score: number;
  }[];
  answers?: {
    questionId: string;
    value?: any;
    calculatedScore?: number;
  }[];
}

const ReportsPage = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedControl, setSelectedControl] = useState<string>('');
  const [selectedControlComparison, setSelectedControlComparison] = useState<string>('');
  const [selectedInspectionCount, setSelectedInspectionCount] = useState<number>(5);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [allInspections, setAllInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  const [questionMap, setQuestionMap] = useState<Record<string, string>>({});

  // Get unique section names from all inspections
  const availableSections = React.useMemo(() => {
    const sectionNames = new Set<string>();
    inspections.forEach(inspection => {
      inspection.sectionScores?.forEach(section => {
        sectionNames.add(section.sectionName);
      });
    });
    return Array.from(sectionNames);
  }, [inspections]);

  // Get available control types from inspections (template id + name)
  const availableControls = React.useMemo(() => {
    const map = new Map<string, string>();
    inspections.forEach(ins => {
      const id = ins.templateId?._id || (ins.templateId as any)?.id;
      const name = ins.templateId?.name || (ins.templateId as any)?.name;
      if (id && name) map.set(String(id), name);
    });
    const controls = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    console.log('Available controls:', controls);
    return controls;
  }, [inspections]);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const data = await getAllStores();
        setStores(data);
        if (data.length > 0) {
          setSelectedStore(data[0]._id);
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
      }
    };
    fetchStores();

    // Fetch all inspections once for comparison
    const fetchAllInspections = async () => {
      try {
        const data = await getAllInspections();
        setAllInspections(data);
      } catch (error) {
        console.error('Error fetching all inspections:', error);
      }
    };
    fetchAllInspections();

    // Fetch all templates once to build questionId -> text map
    const fetchTemplates = async () => {
      try {
        const templates = await getAllTemplates();
        const map: Record<string, string> = {};
        templates.forEach((tpl: any) => {
          tpl.sections?.forEach((sec: any) => {
            sec.questions?.forEach((q: any) => {
              map[q._id] = q.text || q.label || q.name || q._id;
            });
          });
        });
        setQuestionMap(map);
      } catch (err) {
        console.error('Failed to fetch templates for questions map', err);
      }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    const fetchInspections = async () => {
      if (!selectedStore || !allInspections.length) return;
      
      setLoading(true);
      try {
        // Filter inspections for selected store and sort by date
        const filteredAndSorted = allInspections
          .filter((inspection: Inspection) => inspection.storeId._id === selectedStore)
          .sort((a: Inspection, b: Inspection) => 
            new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime()
          );
        
        console.log('Filtered inspections:', filteredAndSorted);
        if (filteredAndSorted.length > 0) {
          const latest = filteredAndSorted[filteredAndSorted.length - 1];
          console.log('Latest inspection:', latest);
          console.log('Sections:', latest.sectionScores);
          console.log('Answers:', latest.answers);
        }
        
        setInspections(filteredAndSorted);
      } catch (error) {
        console.error('Error filtering inspections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInspections();
  }, [selectedStore, allInspections]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
    // Reset selections when changing tabs
    if (newValue !== 0) setSelectedControl('');
    if (newValue !== 1) setSelectedSection('');
    if (newValue !== 2) {
      setSelectedControlComparison('');
      setSelectedInspectionCount(5);
    }
  };

  const handleStoreChange = (event: any) => {
    setSelectedStore(event.target.value);
    // Reset section selection when store changes
    setSelectedSection('');
    setSelectedControl('');
  };

  const handleControlChange = (event: any) => {
  setSelectedControl(event.target.value);
  };

  const handleControlComparisonChange = (event: any) => {
    setSelectedControlComparison(event.target.value);
  };

  const handleInspectionCountChange = (event: any) => {
    setSelectedInspectionCount(event.target.value);
  };

  const handleSectionChange = (event: any) => {
    setSelectedSection(event.target.value);
  };

  // Transform data for the score trend chart
  const scoreTrendData = React.useMemo(() => {
    console.log('Building scoreTrendData with selectedControl:', selectedControl);
    if (!selectedControl) {
      // If no control type selected, show all inspections
      const allData = inspections.map(inspection => ({
        date: new Date(inspection.performedAt).toLocaleDateString('he-IL'),
        score: inspection.finalScore,
      }));
      console.log('All inspections data:', allData);
      return allData;
    }

    // If control type is selected, filter and show only inspections of that type
    const filteredData = inspections
      .filter(inspection => {
        const tplId = inspection.templateId?._id || (inspection.templateId as any)?.id || (inspection.templateId as any)?.toString();
        const match = String(tplId) === String(selectedControl);
        console.log(`Inspection ${inspection._id}: templateId=${tplId}, selectedControl=${selectedControl}, match=${match}`);
        return match;
      })
      .map(inspection => ({
        date: new Date(inspection.performedAt).toLocaleDateString('he-IL'),
        score: inspection.finalScore,
      }));
    console.log('Filtered data for control:', filteredData);
    return filteredData;
  }, [inspections, selectedControl]);

  // Transform data for the sections comparison chart
  const sectionComparisonData = React.useMemo(() => {
    if (!selectedStore || !selectedSection || inspections.length === 0) {
      console.log('No store/section selected or no inspections');
      return [];
    }

    // Get all inspections and their scores for the selected section
    return inspections.map(inspection => {
      const sectionScore = inspection.sectionScores?.find(
        section => section.sectionName === selectedSection
      );

      return {
        date: new Date(inspection.performedAt).toLocaleDateString('he-IL'),
        score: sectionScore?.score || 0,
        name: selectedSection
      };
    });
  }, [selectedStore, selectedSection, inspections]);

  // Transform data for stores comparison chart
  const storesComparisonData = React.useMemo(() => {
    if (!allInspections.length || !stores.length) {
      return [];
    }

    return stores.map(store => {
      // Get all inspections for this store
      let storeInspections = allInspections
        .filter(inspection => inspection.storeId._id === store._id)
        .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());

      // Filter by control type if selected
      if (selectedControlComparison) {
        storeInspections = storeInspections.filter(inspection => {
          const tplId = inspection.templateId?._id || (inspection.templateId as any)?.id || (inspection.templateId as any)?.toString();
          return String(tplId) === String(selectedControlComparison);
        });
      }

      // Take the last N inspections
      const recentInspections = storeInspections.slice(0, selectedInspectionCount);

      // Calculate average score
      let averageScore = 0;
      if (recentInspections.length > 0) {
        const totalScore = recentInspections.reduce((sum, inspection) => sum + inspection.finalScore, 0);
        averageScore = Math.round((totalScore / recentInspections.length) * 100) / 100;
      }

      return {
        storeName: store.name,
        averageScore,
        inspectionCount: recentInspections.length
      };
    })
    .filter(item => item.inspectionCount > 0) // Only show stores with inspections
    .sort((a, b) => b.averageScore - a.averageScore); // Sort by score (highest first)
  }, [allInspections, stores, selectedControlComparison, selectedInspectionCount]);

  // Custom tick renderer for store names (multi-line, prevents clipping)
  const renderStoreTick = (props: any) => {
    const { x, y, payload } = props;
    if (!payload?.value) return <g />;
    // Split Hebrew names by space to allow wrapping; fallback single line
    const parts = String(payload.value).split(' ');
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={14}
          fontSize={12}
          fill="#555"
          textAnchor="middle"
          style={{ direction: 'rtl' }}
        >
          {parts.map((part: string, idx: number) => (
            <tspan key={idx} x={0} dy={idx === 0 ? 0 : 14}>{part}</tspan>
          ))}
        </text>
      </g>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, direction: 'rtl' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        דוחות ביקורת
      </Typography>

      <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="store-select-label">בחר חנות</InputLabel>
          <Select
            labelId="store-select-label"
            value={selectedStore}
            label="בחר חנות"
            onChange={handleStoreChange}
          >
            {stores.map((store) => (
              <MenuItem key={store._id} value={store._id}>
                {store.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Control selector: visible on the score trend tab */}
        {selectedTab === 0 && (
          <FormControl fullWidth>
            <InputLabel id="control-select-label">בחר סוג בקרה</InputLabel>
            <Select
              labelId="control-select-label"
              value={selectedControl}
              label="בחר סוג בקרה"
              onChange={handleControlChange}
              disabled={!selectedStore || availableControls.length === 0}
            >
              <MenuItem value="">-- ללא בקרה --</MenuItem>
              {availableControls.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Section selector: only show when the section comparison tab is active */}
        {selectedTab === 1 && (
          <FormControl fullWidth>
            <InputLabel id="section-select-label">בחר מקטע</InputLabel>
            <Select
              labelId="section-select-label"
              value={selectedSection}
              label="בחר מקטע"
              onChange={handleSectionChange}
              disabled={!selectedStore}
            >
              {availableSections.map((sectionName) => (
                <MenuItem key={sectionName} value={sectionName}>
                  {sectionName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Stores comparison controls: only show when the stores comparison tab is active */}
        {selectedTab === 2 && (
          <>
            <FormControl fullWidth>
              <InputLabel id="control-comparison-select-label">בחר סוג בקרה</InputLabel>
              <Select
                labelId="control-comparison-select-label"
                value={selectedControlComparison}
                label="בחר סוג בקרה"
                onChange={handleControlComparisonChange}
                disabled={availableControls.length === 0}
              >
                <MenuItem value="">-- כל סוגי הבקרה --</MenuItem>
                {availableControls.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel id="inspection-count-select-label">מספר ביקורות לממוצע</InputLabel>
              <Select
                labelId="inspection-count-select-label"
                value={selectedInspectionCount}
                label="מספר ביקורות לממוצע"
                onChange={handleInspectionCountChange}
              >
                <MenuItem value={3}>3 ביקורות אחרונות</MenuItem>
                <MenuItem value={5}>5 ביקורות אחרונות</MenuItem>
                <MenuItem value={10}>10 ביקורות אחרונות</MenuItem>
              </Select>
            </FormControl>
          </>
        )}
      </Box>

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="מגמת ציונים" />
          <Tab label="השוואת מקטעים" />
          <Tab label="השוואת סניפים" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {selectedTab === 0 && (
            <Box sx={{ height: 400 }}>
              <Typography variant="h6" gutterBottom>
                מגמת ציונים לאורך זמן
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={scoreTrendData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    labelFormatter={(value) => `תאריך: ${value}`}
                    formatter={(value: any, name: any) => [
                      `${value}%`,
                      name
                    ]}
                  />
                  {/* <Legend /> */}
                  <Line
                    type="monotone"
                    dataKey="score"
                    name={selectedControl ? (availableControls.find(c => c.id === selectedControl)?.name || 'ציון') : "ציון"}
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}

          {selectedTab === 1 && (
            <Box sx={{ height: 400 }}>
              <Typography variant="h6" gutterBottom>
                השוואת ציוני מקטע לאורך זמן
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sectionComparisonData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 30,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    height={60}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    label={{ 
                      value: 'ציון', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' }
                    }}
                  />
                  <Tooltip 
                    labelFormatter={(value) => `תאריך: ${value}`}
                    formatter={(value: any, name: any) => [
                      `${value}%`,
                      name
                    ]}
                  />
                  {/* <Legend /> */}
                  <Bar
                    dataKey="score"
                    name={selectedSection || 'ציון מקטע'}
                    fill="#82ca9d"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}

          {selectedTab === 2 && (
            <Box sx={{ height: 600 }}>
              <Typography variant="h6" gutterBottom>
                השוואת ציוני סניפים (ממוצע {selectedInspectionCount} ביקורות אחרונות)
              </Typography>
              {storesComparisonData.length === 0 ? (
                <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
                  אין נתונים להצגה
                </Typography>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={storesComparisonData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 60, // Reverted to original-like size
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="storeName"
                      height={80}
                      interval={0}
                      tick={renderStoreTick}
                      tickMargin={10}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      label={{ 
                        value: 'ציון ממוצע', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle' }
                      }}
                    />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => [
                        `${value}%`,
                        `ציון ממוצע (${props.payload.inspectionCount} ביקורות)`
                      ]}
                      labelFormatter={(label) => `סניף: ${label}`}
                    />
                    <Bar
                      dataKey="averageScore"
                      name="ציון ממוצע"
                    >
                      {storesComparisonData.map((entry, index) => {
                        const score = entry.averageScore;
                        let color = "#f44336"; // אדום - דרוש שיפור
                        if (score >= 90) color = "#4caf50"; // ירוק - מעולה
                        else if (score >= 80) color = "#8bc34a"; // ירוק בהיר - טוב מאוד
                        else if (score >= 70) color = "#ffeb3b"; // צהוב - טוב
                        else if (score >= 60) color = "#ff9800"; // כתום - בינוני
                        
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ReportsPage;