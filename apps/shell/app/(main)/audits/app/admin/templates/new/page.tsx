// app/admin/templates/new/page.tsx

'use client';

import TemplateBuilder from "../../../../components/template-builder/TemplateBuilder";

export default function CreateTemplatePage() {
    // This page now simply renders the builder in "create" mode (no id is passed)
    return <TemplateBuilder />;
}