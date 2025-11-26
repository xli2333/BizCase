
export enum GenerationStep {
  IDLE = 'IDLE',
  RESEARCHING = 'RESEARCHING', // Gathering info (General, Quant, Human)
  SELECTING_OBJECTIVE = 'SELECTING_OBJECTIVE', // User chooses objective
  REVIEW_FRAMEWORK = 'REVIEW_FRAMEWORK', // New: User reviews and refines framework
  DRAFTING = 'DRAFTING', // Writing content & notes
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface SearchSource {
  title: string;
  uri: string;
  snippet?: string; // Added optional snippet
}

export interface UploadedFile {
  name: string;
  mimeType: string;
  data: string; // Base64 for binary, string for text
  isText: boolean;
}

export interface CaseStudyData {
  topic: string;
  sources: SearchSource[];
  context: string; // Aggregated info
  objectives: string[]; // The 5 generated options
  selectedObjective?: string;
  framework?: string;
  caseContent?: string;
  teachingNotes?: string;
}

export interface GenerationState {
  step: GenerationStep;
  progress: number; // 0 to 100
  message: string;
}
