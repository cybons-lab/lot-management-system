/**
 * NotificationSettingsPage.tsx
 *
 * 通知設定ページ（システム管理メニューから独立）
 * Phase 3: システム管理メニュー分割
 *
 * TODO: 通知ルール、メール通知設定、Slack連携などの機能を実装
 */

import { Bell, BellRing, Mail, MessageSquare, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { PageContainer, PageHeader } from "@/shared/components/layout";

interface BrowserNotificationSectionProps {
  permission: NotificationPermission | "unsupported";
  onRequestPermission: () => Promise<void>;
}

function BrowserNotificationSection({
  permission,
  onRequestPermission,
}: BrowserNotificationSectionProps) {
  const permissionLabel = (() => {
    switch (permission) {
      case "granted":
        return "許可済み";
      case "denied":
        return "ブロック中";
      case "unsupported":
        return "未対応";
      default:
        return "未設定";
    }
  })();

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <BellRing className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold">ブラウザ通知</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        タブが非アクティブでも重要な通知を受け取るには、ブラウザ通知を有効化してください。
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          現在の状態: <span className="font-medium text-foreground">{permissionLabel}</span>
        </div>
        <Button
          size="sm"
          onClick={onRequestPermission}
          disabled={permission === "granted" || permission === "unsupported"}
        >
          ブラウザ通知を有効化
        </Button>
      </div>
      {permission === "denied" && (
        <div className="mt-3 text-xs text-muted-foreground">
          ブラウザのサイト設定から通知の許可を変更してください。
        </div>
      )}
      {permission === "unsupported" && (
        <div className="mt-3 text-xs text-muted-foreground">
          このブラウザは通知機能に対応していません。
        </div>
      )}
    </div>
  );
}

interface PlaceholderSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function PlaceholderSection({ title, description, icon }: PlaceholderSectionProps) {
  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 text-xs text-muted-foreground italic">
        ※ 今後のアップデートで実装予定
      </div>
    </div>
  );
}

export function NotificationSettingsPage() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(window.Notification.permission);
  }, []);

  const handleRequestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      toast.error("このブラウザは通知に対応していません");
      return;
    }

    try {
      const result = await window.Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        toast.success("ブラウザ通知を有効化しました");
      } else if (result === "denied") {
        toast.error("ブラウザ通知がブロックされています。設定をご確認ください。");
      } else {
        toast("ブラウザ通知は保留中です");
      }
    } catch (error) {
      console.error(error);
      toast.error("ブラウザ通知の許可取得に失敗しました");
    }
  };

  return (
    <PageContainer>
      <PageHeader title="通知設定" subtitle="通知ルールとチャンネル設定を管理します" />

      <div className="space-y-6">
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">開発中の機能</h3>
              <p className="text-sm text-yellow-800">
                この機能は現在開発中です。Phase 3では基本的な構造のみを実装しています。
              </p>
            </div>
          </div>
        </div>

        <BrowserNotificationSection
          permission={permission}
          onRequestPermission={handleRequestPermission}
        />

        <PlaceholderSection
          title="通知ルール"
          description="イベント発生時の通知条件やルールを設定できます。"
          icon={<Bell className="h-5 w-5 text-blue-500" />}
        />

        <PlaceholderSection
          title="メール通知設定"
          description="メール送信設定（SMTPサーバー、送信元アドレスなど）を管理します。"
          icon={<Mail className="h-5 w-5 text-green-500" />}
        />

        <PlaceholderSection
          title="Slack連携"
          description="Slackワークスペースとの連携設定を行います。"
          icon={<MessageSquare className="h-5 w-5 text-purple-500" />}
        />
      </div>
    </PageContainer>
  );
}
