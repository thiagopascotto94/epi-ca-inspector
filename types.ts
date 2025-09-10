export interface CAData {
  caNumber: string;
  status: string;
  validity: string;
  daysRemaining?: string;
  processNumber: string;
  nature: string;
  equipmentName: string;
  equipmentType: string;
  description: string;
  approvedFor: string;
  restrictions: string;
  observations: string;
  manufacturer: {
    name: string;
    cnpj: string;
    site: string;
    address: string;
  };
  photos: string[];
  history: { date: string; event: string }[];
  norms: string[];
  markings: string;
  references: string;
}

export interface LibraryFile {
  id: string;
    name: string;
  url: string;
  content?: string;
}

export interface Library {
  id:string;
  name: string;
  files: LibraryFile[];
  isSystemModel?: boolean;
  systemModelId?: string;
  usageCount?: number;
}

export type JobType = 'ANALYZE_CAS' | 'SUGGEST_CONVERSION' | 'FIND_SIMILAR' | 'EXTRACT_TEXT';

export interface SimilarityJobInput {
  caData: CAData;
  libraryFiles: LibraryFile[];
  libraryName: string;
  description: string;
}

export interface SimilarityJob {
  id: string;
  type: JobType;
  inputData: SimilarityJobInput;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: string; // Will now be a JSON string of ParsedSimilarityResult[]
  error?: string;
  createdAt: number; // timestamp
  completedAt?: number; // timestamp
  progress?: number;
  totalFiles?: number;
  progressMessage?: string;
}

export interface ParsedSimilarityResult {
  productName: string;
  caNumber?: string;
  confidence: number; // e.g., 95 for 95%
  justification: string;
  detailedJustification: string;
  imageUrl?: string;
}

export type Theme = 'light' | 'dark';

export interface ConfirmationState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmButtonText?: string;
    confirmButtonColor?: string;
}

export interface ClientStats {
  id: string;
  email: string;
  libraries: number;
  documents: number;
  searches: number;
}

export interface LoginCredentials {
  email: string;
  password?: string; // Password is not always required, e.g. for social login
}

export interface User {
  id: string;
  email: string;
  role: 'USER' | 'ROOT';
}

export interface AuthResponse {
  token: string;
  user?: User; // The user object might be part of the response
}

export interface CreateJobResponse {
  message: string;
  jobId: string;
}