'use client';

import TemplateBuilder from "../../../../../components/template-builder/TemplateBuilder";
import { useParams } from 'next/navigation';
// FIX: Import components for the loading state
import { Box, CircularProgress } from '@mui/material';

export default function EditTemplatePage() {
    const params = useParams();

    // FIX: Add a check to handle the case where params are not yet available
    if (!params) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    const templateId = Array.isArray(params.id) ? params.id[0] : params.id as string;

    // This page renders the builder in "edit" mode by passing the id from the URL
    return <TemplateBuilder templateId={templateId} />;
}