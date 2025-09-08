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
