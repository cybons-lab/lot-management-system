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
  onToggle: (id: string, role: "guest" | "user", checked: boolean) => void;
  disabled: boolean;
}

type VisibilityEntry = { user: boolean; guest: boolean };

function normalizeVisibilityEntry(value: unknown): VisibilityEntry {
  if (typeof value === "boolean") {
    return { user: value, guest: value };
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const user = typeof record.user === "boolean" ? record.user : true;
    const guest = typeof record.guest === "boolean" ? record.guest : true;
    return { user, guest };
  }

  return { user: true, guest: true };
}

/* eslint-disable-next-line complexity */
function VisibilityRow({ id, label, isSub, config, onToggle, disabled }: VisibilityRowProps) {
  const featureConf = normalizeVisibilityEntry(config[id]);

  let userInherited = false;
  let guestInherited = false;

  if (isSub) {
    const parentId = id.split(":")[0];
    const parentConf = normalizeVisibilityEntry(config[parentId]);
    userInherited = parentConf.user;
    guestInherited = parentConf.guest;
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
          {isSub && (userInherited || guestInherited) && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100 font-medium">
              親から継承中
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex flex-col items-center gap-1">
          <Switch
            checked={featureConf.user}
            onCheckedChange={(checked) => onToggle(id, "user", checked)}
            disabled={disabled}
          />
          {isSub && userInherited && !featureConf.user && (
            <span className="text-[9px] text-green-600 font-bold whitespace-nowrap">実質: ON</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex flex-col items-center gap-1">
          <Switch
            checked={featureConf.guest}
            onCheckedChange={(checked) => onToggle(id, "guest", checked)}
            disabled={disabled}
          />
          {isSub && guestInherited && !featureConf.guest && (
            <span className="text-[9px] text-green-600 font-bold whitespace-nowrap">実質: ON</span>
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

  const handleToggle = (featureKey: string, role: "guest" | "user", checked: boolean) => {
    const newConfig = { ...config };
    const current = normalizeVisibilityEntry(newConfig[featureKey]);
    newConfig[featureKey] = { ...current, [role]: checked };
    onChange(JSON.stringify(newConfig));
  };

  return (
    <div className="rounded-md border mt-2 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-100">
          <TableRow>
            <TableHead className="w-[300px]">機能・ページ・タブ</TableHead>
            <TableHead className="text-center w-[120px]">一般ユーザー</TableHead>
            <TableHead className="text-center w-[120px]">ゲスト</TableHead>
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
