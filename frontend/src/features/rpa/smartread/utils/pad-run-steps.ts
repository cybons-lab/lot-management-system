export const PAD_RUN_STEP_ORDER = [
  { key: "CREATED", label: "開始" },
  { key: "TASK_CREATED", label: "タスク作成" },
  { key: "UPLOADED", label: "ファイルアップロード" },
  { key: "REQUEST_DONE", label: "リクエスト完了待ち" },
  { key: "TASK_DONE", label: "タスク完了待ち" },
  { key: "EXPORT_STARTED", label: "エクスポート開始" },
  { key: "EXPORT_DONE", label: "エクスポート完了待ち" },
  { key: "DOWNLOADED", label: "エクスポート取得" },
  { key: "POSTPROCESSED", label: "CSV後処理" },
] as const;

export function getPadRunStepIndex(step: string | null | undefined) {
  if (!step) return -1;
  return PAD_RUN_STEP_ORDER.findIndex((item) => item.key === step);
}
