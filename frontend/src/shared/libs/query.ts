// src/lib/query.ts
export const toSearchParams = (input: Record<string, unknown>) => {
  const sp = new URLSearchParams();
  Object.entries(input ?? {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    // 配列は複数クエリに展開 ?k=a&k=b
    if (Array.isArray(v)) {
      v.forEach((x) => sp.append(k, String(x)));
    } else {
      sp.set(k, String(v));
    }
  });
  return sp.toString();
};
