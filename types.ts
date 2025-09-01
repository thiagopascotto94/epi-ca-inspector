

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
  url: string;
}

export interface Library {
  id: string;
  name: string;
  files: LibraryFile[];
}

export interface SimilarityJob {
  id: string;
  caData: CAData;
  libraryFiles: LibraryFile[];
  libraryName: string;
  description: string;
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
