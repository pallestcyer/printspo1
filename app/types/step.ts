export enum StepStatus {
  COMPLETE = 'complete',
  CURRENT = 'current',
  UPCOMING = 'upcoming'
}

export interface Step {
  title: string;
  description: string;
  status: StepStatus;
} 