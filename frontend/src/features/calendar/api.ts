import { http } from "@/shared/api/http-client";

export interface HolidayCalendar {
  id: number;
  holiday_date: string;
  holiday_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface HolidayCalendarCreate {
  holiday_date: string;
  holiday_name?: string | null;
}

export interface HolidayCalendarUpdate {
  holiday_date?: string;
  holiday_name?: string | null;
}

export interface CompanyCalendar {
  id: number;
  calendar_date: string;
  is_workday: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyCalendarCreate {
  calendar_date: string;
  is_workday: boolean;
  description?: string | null;
}

export interface CompanyCalendarUpdate {
  calendar_date?: string;
  is_workday?: boolean;
  description?: string | null;
}

export interface OriginalDeliveryCalendar {
  id: number;
  delivery_date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface OriginalDeliveryCalendarCreate {
  delivery_date: string;
  description?: string | null;
}

export interface OriginalDeliveryCalendarUpdate {
  delivery_date?: string;
  description?: string | null;
}

export interface BusinessDayCalculationRequest {
  start_date: string;
  days: number;
  direction: "after" | "before";
  include_start: boolean;
}

export interface HolidayImportRequest {
  tsv_data: string;
}

export interface SyncImportResponse {
  message: string;
  count: number;
}

export interface BusinessDayCalculationResponse {
  start_date: string;
  result_date: string;
  days: number;
  direction: "after" | "before";
  include_start: boolean;
}

const BASE_PATH = "calendar";

export const calendarApi = {
  listHolidays: () => http.get<HolidayCalendar[]>(`${BASE_PATH}/holidays`),
  createHoliday: (payload: HolidayCalendarCreate) =>
    http.post<HolidayCalendar>(`${BASE_PATH}/holidays`, payload),
  updateHoliday: (id: number, payload: HolidayCalendarUpdate) =>
    http.put<HolidayCalendar>(`${BASE_PATH}/holidays/${id}`, payload),
  deleteHoliday: (id: number) => http.deleteVoid(`${BASE_PATH}/holidays/${id}`),

  listCompanyDays: () => http.get<CompanyCalendar[]>(`${BASE_PATH}/company-days`),
  createCompanyDay: (payload: CompanyCalendarCreate) =>
    http.post<CompanyCalendar>(`${BASE_PATH}/company-days`, payload),
  updateCompanyDay: (id: number, payload: CompanyCalendarUpdate) =>
    http.put<CompanyCalendar>(`${BASE_PATH}/company-days/${id}`, payload),
  deleteCompanyDay: (id: number) => http.deleteVoid(`${BASE_PATH}/company-days/${id}`),

  listOriginalDeliveryDates: () =>
    http.get<OriginalDeliveryCalendar[]>(`${BASE_PATH}/original-delivery-dates`),
  createOriginalDeliveryDate: (payload: OriginalDeliveryCalendarCreate) =>
    http.post<OriginalDeliveryCalendar>(`${BASE_PATH}/original-delivery-dates`, payload),
  updateOriginalDeliveryDate: (id: number, payload: OriginalDeliveryCalendarUpdate) =>
    http.put<OriginalDeliveryCalendar>(`${BASE_PATH}/original-delivery-dates/${id}`, payload),
  deleteOriginalDeliveryDate: (id: number) =>
    http.deleteVoid(`${BASE_PATH}/original-delivery-dates/${id}`),

  calculateBusinessDay: (payload: BusinessDayCalculationRequest) =>
    http.post<BusinessDayCalculationResponse>(`${BASE_PATH}/business-day-calc`, payload),

  syncHolidays: () => http.post<SyncImportResponse>(`${BASE_PATH}/holidays/sync`, {}),
  importHolidays: (payload: HolidayImportRequest) =>
    http.post<SyncImportResponse>(`${BASE_PATH}/holidays/import`, payload),
};
