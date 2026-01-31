import { BusinessDayCalcCard } from "../components/BusinessDayCalcCard";
import { CompanyCalendarCard } from "../components/CompanyCalendarCard";
import { DeliveryCalendarCard } from "../components/DeliveryCalendarCard";
import { HolidayCalendarCard } from "../components/HolidayCalendarCard";

import { PageHeader } from "@/shared/components/layout/PageHeader";

export function CalendarSettingsPage() {
  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader title="カレンダー設定" subtitle="祝日・会社カレンダー・配信日を管理します" />

      <HolidayCalendarCard />
      <CompanyCalendarCard />
      <DeliveryCalendarCard />
      <BusinessDayCalcCard />
    </div>
  );
}
