import type {
  SimulateProgressResponse,
  SimulateResultResponse,
  SimulateSeedRequest,
} from "@/features/admin/api/admin-simulate";

/**
 * Props for the main SeedSimulateDialog component
 */
export interface SeedSimulateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Preview counts for each entity type
 */
export interface PreviewCounts {
  warehouses: number | null;
  customers: number | null;
  suppliers: number | null;
  products: number | null;
  lots: number | null;
  orders: number | null;
  forecasts: number | null;
}

/**
 * Preview totals grouped by category
 */
export interface PreviewTotals {
  masters: number | null;
  inventory: number | null;
  orders: number | null;
  forecasts: number | null;
  overall: number | null;
}

/**
 * Combined preview data
 */
export interface PreviewData {
  counts: PreviewCounts;
  totals: PreviewTotals;
}

/**
 * Simulation state managed by useSimulationPolling
 */
export interface SimulationState {
  taskId: string | null;
  progress: SimulateProgressResponse | null;
  result: SimulateResultResponse | null;
}

/**
 * Return type for useSimulationForm hook
 */
export interface UseSimulationFormReturn {
  form: SimulateSeedRequest;
  setForm: React.Dispatch<React.SetStateAction<SimulateSeedRequest>>;
  handleProfileChange: (profile: string) => void;
  resetForm: () => void;
}

/**
 * Return type for useSimulationPolling hook
 */
export interface UseSimulationPollingReturn {
  taskId: string | null;
  progress: SimulateProgressResponse | null;
  result: SimulateResultResponse | null;
  startSimulation: (payload: SimulateSeedRequest) => void;
  isStarting: boolean;
  isRunning: boolean;
  reset: () => void;
}

/**
 * Props for ProfileSelect component
 */
export interface ProfileSelectProps {
  value: string | null;
  onChange: (profile: string) => void;
}

/**
 * Props for ParameterInputs component
 */
export interface ParameterInputsProps {
  form: SimulateSeedRequest;
  onFormChange: React.Dispatch<React.SetStateAction<SimulateSeedRequest>>;
}

/**
 * Props for SnapshotSettings component
 */
export interface SnapshotSettingsProps {
  saveSnapshot: boolean;
  snapshotName: string | null;
  onSaveSnapshotChange: (checked: boolean) => void;
  onSnapshotNameChange: (name: string | null) => void;
}

/**
 * Props for PreviewSection component
 */
export interface PreviewSectionProps {
  preview: PreviewData;
}

/**
 * Props for ProgressSection component
 */
export interface ProgressSectionProps {
  taskId: string | null;
  progress: SimulateProgressResponse;
}

/**
 * Props for ResultSection component
 */
export interface ResultSectionProps {
  result: SimulateResultResponse;
}
