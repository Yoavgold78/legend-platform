// frontend/types/checklist.ts

export interface Task {
  _id: string;
  text: string;
  requiresPhoto: boolean;
}

// הוספנו הגדרה למבנה של אובייקט התזמון
export interface Schedule {
  type: 'daily' | 'weekly';
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
}

export interface ChecklistTemplate {
  _id: string;
  name: string;
  description?: string;
  store?: string;
  createdBy: string;
  tasks: Task[];
  type: 'template' | 'task';
  taskType?: 'universal' | 'store'; // New field for task types
  parentTemplate?: string;
  universalTemplateId?: string; // For universal task instances
  isUniversalTemplate?: boolean; // Flag to distinguish universal templates from instances
  isActive?: boolean;
  
  // --- שדה זה נוסף ---
  schedule?: Schedule;
  // --------------------
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}