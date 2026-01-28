import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  calendarApi,
  type BusinessDayCalculationRequest,
  type CompanyCalendarCreate,
  type CompanyCalendarUpdate,
  type HolidayCalendarCreate,
  type HolidayCalendarUpdate,
  type HolidayImportRequest,
  type OriginalDeliveryCalendarCreate,
  type OriginalDeliveryCalendarUpdate,
} from "./api";

export function useHolidayCalendar() {
  const queryClient = useQueryClient();

  const useList = () =>
    useQuery({
      queryKey: ["holidayCalendar"],
      queryFn: calendarApi.listHolidays,
    });

  const useCreate = () =>
    useMutation({
      mutationFn: (payload: HolidayCalendarCreate) => calendarApi.createHoliday(payload),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["holidayCalendar"] }),
    });

  const useUpdate = () =>
    useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: HolidayCalendarUpdate }) =>
        calendarApi.updateHoliday(id, payload),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["holidayCalendar"] }),
    });
  const useDelete = () =>
    useMutation({
      mutationFn: (id: number) => calendarApi.deleteHoliday(id),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["holidayCalendar"] }),
    });

  const useSync = () =>
    useMutation({
      mutationFn: calendarApi.syncHolidays,
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["holidayCalendar"] });
        return data;
      },
    });

  const useImport = () =>
    useMutation({
      mutationFn: (payload: HolidayImportRequest) => calendarApi.importHolidays(payload),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["holidayCalendar"] });
        return data;
      },
    });

  return { useList, useCreate, useUpdate, useDelete, useSync, useImport };
}

export function useCompanyCalendar() {
  const queryClient = useQueryClient();

  const useList = () =>
    useQuery({
      queryKey: ["companyCalendar"],
      queryFn: calendarApi.listCompanyDays,
    });

  const useCreate = () =>
    useMutation({
      mutationFn: (payload: CompanyCalendarCreate) => calendarApi.createCompanyDay(payload),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companyCalendar"] }),
    });

  const useUpdate = () =>
    useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: CompanyCalendarUpdate }) =>
        calendarApi.updateCompanyDay(id, payload),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companyCalendar"] }),
    });

  const useDelete = () =>
    useMutation({
      mutationFn: (id: number) => calendarApi.deleteCompanyDay(id),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companyCalendar"] }),
    });

  return { useList, useCreate, useUpdate, useDelete };
}

export function useOriginalDeliveryCalendar() {
  const queryClient = useQueryClient();

  const useList = () =>
    useQuery({
      queryKey: ["originalDeliveryCalendar"],
      queryFn: calendarApi.listOriginalDeliveryDates,
    });

  const useCreate = () =>
    useMutation({
      mutationFn: (payload: OriginalDeliveryCalendarCreate) =>
        calendarApi.createOriginalDeliveryDate(payload),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["originalDeliveryCalendar"] }),
    });

  const useUpdate = () =>
    useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: OriginalDeliveryCalendarUpdate }) =>
        calendarApi.updateOriginalDeliveryDate(id, payload),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["originalDeliveryCalendar"] }),
    });

  const useDelete = () =>
    useMutation({
      mutationFn: (id: number) => calendarApi.deleteOriginalDeliveryDate(id),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["originalDeliveryCalendar"] }),
    });

  return { useList, useCreate, useUpdate, useDelete };
}

export function useBusinessDayCalculator() {
  return useMutation({
    mutationFn: (payload: BusinessDayCalculationRequest) =>
      calendarApi.calculateBusinessDay(payload),
  });
}
