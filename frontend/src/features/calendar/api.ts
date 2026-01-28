import { http } from "@/shared/api/http-client";

export type HolidayCalendar = {
  id: number;
  holiday_date: string;
  holiday_name: string | null;
  created_at: string;
  updated_at: string;
};

export type HolidayCalendarCreate = {
  holiday_date: string;
  holiday_name?: string | null;
};

export type HolidayCalendarUpdate = {
  holiday_date?: string;
  holiday_name?: string | null;
};

export type CompanyCalendar = {
  id: number;
  calendar_date: string;
  is_workday: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyCalendarCreate = {
  calendar_date: string;
  is_workday: boolean;
  description?: string | null;
};

export type CompanyCalendarUpdate = {
  calendar_date?: string;
  is_workday?: boolean;
  description?: string | null;
};

export type OriginalDeliveryCalendar = {
  id: number;
  delivery_date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type OriginalDeliveryCalendarCreate = {
  delivery_date: string;
  description?: string | null;
};

export type OriginalDeliveryCalendarUpdate = {
  delivery_date?: string;
  description?: string | null;
};

export type BusinessDayCalculationRequest = {
  start_date: string;
  days: number;
  direction: "after" | "before";
  include_start: boolean;
};

export type HolidayImportRequest = {
  tsv_data: string;
};

export type SyncImportResponse = {
  message: string;
  count: number;
};

export type BusinessDayCalculationResponse = {
  start_date: string;
  result_date: string;
  days: number;
  direction: "after" | "before";
  include_start: boolean;
};

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
