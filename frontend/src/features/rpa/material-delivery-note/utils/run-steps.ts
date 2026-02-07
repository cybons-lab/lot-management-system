/**
 * 素材納品書発行の進捗ステップ定義
 *
 * ドキュメント: docs/material-delivery-note-progress-tracking.md
 *
 * 進捗ステップの順序を定義し、Run Eventから現在の進捗状態を判定する。
 */

export const MATERIAL_DELIVERY_RUN_STEP_ORDER = [
  { key: "CLOUD_FLOW_STARTED", label: "開始" },
  { key: "PAD_KICK_STARTED", label: "RPA端末指示受領" },
  { key: "POWERSHELL_PAD_KICKED", label: "RPA実行開始" },
  { key: "PROD_PAD_STARTED", label: "処理開始" },
  { key: "PROD_PAD_DONE", label: "処理完了" },
] as const;

/**
 * イベントタイプから進捗ステップのインデックスを取得
 *
 * @param eventType - Run Eventのevent_type
 * @returns ステップインデックス（0始まり）。見つからない場合は-1
 */
export function getMaterialDeliveryRunStepIndex(eventType: string | null | undefined): number {
  if (!eventType) return -1;
  return MATERIAL_DELIVERY_RUN_STEP_ORDER.findIndex((item) => item.key === eventType);
}

/**
 * Run Eventsのリストから現在の進捗ステップを判定
 *
 * @param events - Run Eventのリスト（時系列順）
 * @returns 最新の進捗ステップのインデックス
 */
export function getCurrentStepFromEvents(events: { event_type: string }[] | undefined): number {
  if (!events || events.length === 0) return -1;

  // 最新のイベントから順に検索し、定義済みステップに該当するものを見つける
  for (let i = events.length - 1; i >= 0; i--) {
    const stepIndex = getMaterialDeliveryRunStepIndex(events[i].event_type);
    if (stepIndex >= 0) {
      return stepIndex;
    }
  }

  return -1;
}
