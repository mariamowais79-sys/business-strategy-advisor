
export interface SalesRecord {
  date: string;
  invoiceNo: string;
  customerName: string;
  distributor: string;
  product: string;
  quantity: number;
  revenue: number;
  discount: number;
  cost: number;
  creditDays: number;
  outstandingAmount: number;
  region: string;
  salesRep: string;
}

export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export interface AdvisoryOutput {
  keyInsight: string;
  rootCause: string;
  riskLevel: RiskLevel;
  recommendedAction: string;
  expectedImpact: string;
}

export interface BusinessSolution {
  id: string;
  title: string;
  description: string;
  icon: string;
  details: string[];
}

export interface DashboardState {
  filter: {
    region?: string;
    product?: string;
    distributor?: string;
    customer?: string;
  };
  highlightedMetric?: 'revenue' | 'profit' | 'outstanding' | 'discount';
  activeTab: 'home' | 'dashboard' | 'reports' | 'distributors';
}

export enum Language {
  ENGLISH = 'English',
  SPANISH = 'Spanish',
  FRENCH = 'French',
  URDU = 'Urdu',
  ARABIC = 'Arabic',
  HINDI = 'Hindi',
  AUTO = 'Auto-Detect'
}
