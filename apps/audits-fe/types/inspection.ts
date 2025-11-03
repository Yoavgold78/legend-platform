// frontend/types/inspection.ts

export interface Store {
  _id: string;
  name: string;
}

export interface TemplateInfo {
  _id: string;
  name: string;
  description: string;
}

export interface Answer {
  questionId: string;
  value: any;
  comment?: string;
  photos?: string[];
}

export interface PhotoFile {
  file: File;
  previewUrl: string;
}

// NEW: Added Task interface for the frontend
export interface Task {
  _id?: string; // Optional because it doesn't exist before creation
  inspectionId: string;
  description: string;
  dueDate: string;
  priority: 'Normal' | 'High';
  originatingQuestionText?: string;
  questionId?: string; // For frontend tracking
}


export interface FollowUpQuestion {
    _id: string;
    text: string;
    type?: 'yes_no' | 'slider' | 'multiple_choice' | 'text_input';
    options?: { text: string, weight?: number, scoreWeight?: number }[];
    sliderRange?: [number, number];
}

export interface Question {
    _id: string;
    text: string;
    type: 'yes_no' | 'slider' | 'multiple_choice' | 'text_input';
    options?: { text: string, weight?: number, scoreWeight?: number }[];
    sliderRange?: [number, number];
    allowComment: boolean;
    allowPhoto: boolean;
    conditionalOn?: string;
    conditionalValue?: any;
    conditionalTrigger?: { onAnswer?: string, followUpQuestions?: FollowUpQuestion[]; }
    parentQuestionId?: string; 
}

export interface Section {
    _id: string;
    title: string;
    questions: Question[];
}

export interface FullTemplate {
    _id: string;
    name: string;
    sections: Section[];
}