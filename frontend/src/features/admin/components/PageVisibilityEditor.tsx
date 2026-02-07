import * as React from "react";

import { Switch } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FEATURE_CONFIG } from "@/config/feature-config";
import { cn } from "@/shared/libs/utils";
import type { PageVisibilityConfig } from "@/types/system";

interface VisibilityRowProps {
  id: string;
  label: string;
  isSub?: boolean;
  config: PageVisibilityConfig;
  onToggle: (id: string, role: "user", checked: boolean) => void;
  disabled: boolean;
}

interface VisibilityEntry {
  user: boolean;
}

function normalizeVisibilityEntry(value: unknown): VisibilityEntry {
  if (typeof value === "boolean") {
    return { user: value };
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const user = typeof record.user === "boolean" ? record.user : true;
    return { user };
  }

  return { user: true };
}

function VisibilityRow({ id, label, isSub, config, onToggle, disabled }: VisibilityRowProps) {
  const featureConf = normalizeVisibilityEntry(config[id]);

  let userParentDisabled = false;

  if (isSub) {
    const parentId = id.split(":")[0];
    const parentConf = parentId ? normalizeVisibilityEntry(config[parentId]) : { user: true };
    // New Logic: If parent is FALSE, child is forced FALSE.
    // If parent is TRUE, child is configurable.
    userParentDisabled = !parentConf.user;
  }

  return (
    <TableRow className={cn(isSub ? "bg-slate-50/50" : "bg-white")}>
      <TableCell
        className={cn("font-medium", isSub ? "pl-8 text-slate-500 text-sm" : "text-slate-900")}
      >
        <div className="flex items-center gap-2">
          {isSub ? "└ " : ""}
          {label}
          {!isSub && (
            <span className="ml-1 text-[10px] text-slate-400 font-mono uppercase">#{id}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex flex-col items-center gap-1">
          <Switch
            checked={featureConf.user}
            onCheckedChange={(checked) => onToggle(id, "user", checked)}
            disabled={disabled || userParentDisabled}
          />
          {isSub && userParentDisabled && (
            <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
              親が無効
            </span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

interface PageVisibilityEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export function PageVisibilityEditor({ value, onChange, disabled }: PageVisibilityEditorProps) {
  const config = ((): PageVisibilityConfig => {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  })();

  const handleToggle = (featureKey: string, role: "user", checked: boolean) => {
    const newConfig = { ...config };
    const current = normalizeVisibilityEntry(newConfig[featureKey]);
    newConfig[featureKey] = { ...current, [role]: checked };
    onChange(JSON.stringify(newConfig));
  };

  return (
    <div className="rounded-md border mt-2 overflow-hidden">
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
        <p className="text-xs text-amber-800">
          <strong>注意:</strong>{" "}
          ゲストユーザーの権限は固定されており、ここでは変更できません。ゲストは「ダッシュボード」「在庫一覧」「ロット一覧」のみ閲覧可能です（読み取り専用）。
          管理者は常にすべての機能にアクセス可能です。
        </p>
      </div>
      <Table>
        <TableHeader className="bg-slate-100">
          <TableRow>
            <TableHead className="w-[400px]">機能・ページ・タブ</TableHead>
            <TableHead className="text-center w-[150px]">一般ユーザー</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.values(FEATURE_CONFIG).map((feature) => (
            <React.Fragment key={feature.id}>
              <VisibilityRow
                id={feature.id}
                label={feature.label}
                config={config}
                onToggle={handleToggle}
                disabled={disabled}
              />
              {feature.subFeatures?.map((sub) => (
                <VisibilityRow
                  key={`${feature.id}:${sub.id}`}
                  id={`${feature.id}:${sub.id}`}
                  label={sub.label}
                  isSub
                  config={config}
                  onToggle={handleToggle}
                  disabled={disabled}
                />
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
