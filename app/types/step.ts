export type StepStatus = 'current' | 'complete' | 'upcoming';

export interface Step {
  title: string;
  description: string;
  status: StepStatus;
} 