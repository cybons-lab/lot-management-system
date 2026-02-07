/**
 * テーブル型UIでのキーボードナビゲーション用ユーティリティ
 */

export type NavigationTarget<TRecordId, TFieldKey> = {
  rowId: TRecordId;
  field: TFieldKey;
} | null;

/**
 * Tabキーによる移動先を解決する
 */
export const resolveTabTarget = <TRecordId, TFieldKey, TRecord>(
  currentRowId: TRecordId,
  currentField: TFieldKey,
  direction: 1 | -1,
  fieldOrder: TFieldKey[],
  rowIds: TRecordId[],
  getRowById: (rowId: TRecordId) => TRecord | undefined,
  isSkipable?: (record: TRecord | undefined) => boolean,
): NavigationTarget<TRecordId, TFieldKey> => {
  const currentFieldIndex = fieldOrder.indexOf(currentField);
  const currentRowIndex = rowIds.indexOf(currentRowId);

  let nextFieldIndex = currentFieldIndex + direction;
  let nextRowIndex = currentRowIndex;

  if (nextFieldIndex >= fieldOrder.length) {
    nextFieldIndex = 0;
    nextRowIndex++;
  } else if (nextFieldIndex < 0) {
    nextFieldIndex = fieldOrder.length - 1;
    nextRowIndex--;
  }

  if (nextRowIndex < 0 || nextRowIndex >= rowIds.length) {
    return null;
  }

  const nextRowId = rowIds[nextRowIndex] as TRecordId;
  const nextField = fieldOrder[nextFieldIndex] as TFieldKey;
  const nextRow = getRowById(nextRowId);

  // スキップ対象（処理中など）の場合は再帰的に次を探す
  if (isSkipable && isSkipable(nextRow)) {
    return resolveTabTarget(
      nextRowId,
      nextField,
      direction,
      fieldOrder,
      rowIds,
      getRowById,
      isSkipable,
    );
  }

  return { rowId: nextRowId, field: nextField };
};

/**
 * Enterキーによる移動先を解決する（通常は上下移動）
 */
export const resolveEnterTarget = <TRecordId, TFieldKey, TRecord>(
  currentRowId: TRecordId,
  currentField: TFieldKey,
  direction: 1 | -1,
  rowIds: TRecordId[],
  getRowById: (rowId: TRecordId) => TRecord | undefined,
  isSkipable?: (record: TRecord | undefined) => boolean,
): NavigationTarget<TRecordId, TFieldKey> => {
  const currentRowIndex = rowIds.indexOf(currentRowId);
  const nextRowIndex = currentRowIndex + direction;

  if (nextRowIndex < 0 || nextRowIndex >= rowIds.length) {
    return null;
  }

  const nextRowId = rowIds[nextRowIndex] as TRecordId;
  const nextRow = getRowById(nextRowId);

  if (isSkipable && isSkipable(nextRow)) {
    return resolveEnterTarget(nextRowId, currentField, direction, rowIds, getRowById, isSkipable);
  }

  return { rowId: nextRowId, field: currentField };
};
