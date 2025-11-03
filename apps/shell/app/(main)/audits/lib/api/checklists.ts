// frontend/lib/api/checklists.ts

import axios from '../axios'; 
import type { ChecklistTemplate } from '../../types/checklist';

/**
 * Creates a new checklist template or a scheduled task.
 */
export const createChecklistTemplate = async (templateData: any): Promise<ChecklistTemplate> => {
  try {
    const response = await axios.post<ChecklistTemplate>('/checklists', templateData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data?.message || 'An unexpected error occurred';
  }
};

/**
 * Fetches templates for a given store. 
 * Can fetch only base templates (for linking) or all items (for the update list).
 */
export const getChecklistTemplates = async (storeId: string, allItems: boolean = false): Promise<ChecklistTemplate[]> => {
  try {
    const response = await axios.get(`/checklists/templates?storeId=${storeId}&allItems=${allItems}`);
    return response.data;
  } catch (error: any)    {
    throw error.response?.data?.message || 'Failed to fetch templates';
  }
};

/**
 * Fetches a single checklist item by its ID.
 */
export const getChecklistTemplateById = async (id: string): Promise<ChecklistTemplate> => {
  try {
    const response = await axios.get<ChecklistTemplate>(`/checklists/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data?.message || 'Failed to fetch template details';
  }
};

/**
 * Updates an existing checklist item.
 */
export const updateChecklistTemplate = async (id: string, templateData: any): Promise<ChecklistTemplate> => {
  try {
    const response = await axios.put<ChecklistTemplate>(`/checklists/${id}`, templateData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data?.message || 'Failed to update template';
  }
};

/**
 * Deletes a checklist item by ID.
 */
export const deleteChecklistTemplate = async (id: string): Promise<{ success: boolean }> => {
  try {
    await axios.delete(`/checklists/${id}`);
    return { success: true };
  } catch (error: any) {
    throw error.response?.data?.message || 'Failed to delete checklist item';
  }
};


/**
 * Fetches the currently active checklist templates for a given store.
 */
export const getActiveChecklist = async (storeId: string): Promise<ChecklistTemplate[]> => {
  try {
    const response = await axios.get<ChecklistTemplate[]>(`/checklists/store/${storeId}/active`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data?.message || 'An unexpected error occurred';
  }
};

/**
 * Submits a completed checklist instance.
 */
export const submitChecklistInstance = async (instanceData: any): Promise<any> => {
  try {
    const response = await axios.post('/checklist-instances', instanceData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data?.message || 'An unexpected error occurred';
  }
};