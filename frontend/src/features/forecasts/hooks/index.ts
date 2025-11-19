/**
 * Forecast Hooks (v2.4)
 * TanStack Query hooks for forecast_current / forecast_history
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  ForecastListParams,
  CreateForecastRequest,
  UpdateForecastRequest,
  BulkImportForecastRequest,
} from "../api";
import {
  getForecasts,
  getForecast,
  getForecastHistory,
  createForecast,
  updateForecast,
  deleteForecast,
  bulkImportForecasts,
} from "../api";

// ===== Query Keys =====

export const forecastKeys = {
  all: ["forecasts"] as const,
  list: () => [...forecastKeys.all, "list"] as const,
  detail: (id: number) => [...forecastKeys.all, "detail", id] as const,
  history: () => [...forecastKeys.all, "history"] as const,
};

// ===== Query Hooks =====

/**
 * Get forecasts list (grouped by customer × delivery_place × product)
 */
export const useForecasts = (params?: ForecastListParams) => {
  return useQuery({
    queryKey: [...forecastKeys.list(), params],
    queryFn: () => getForecasts(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get single forecast by ID
 */
export const useForecast = (id: number) => {
  return useQuery({
    queryKey: forecastKeys.detail(id),
    queryFn: () => getForecast(id),
    enabled: id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get forecast history
 */
export const useForecastHistory = (params?: ForecastListParams) => {
  return useQuery({
    queryKey: [...forecastKeys.history(), params],
    queryFn: () => getForecastHistory(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// ===== Mutation Hooks =====

/**
 * Create forecast entry
 */
export const useCreateForecast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateForecastRequest) => createForecast(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: forecastKeys.list() });
    },
  });
};

/**
 * Update forecast entry
 */
export const useUpdateForecast = (id: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateForecastRequest) => updateForecast(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: forecastKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: forecastKeys.list() });
    },
  });
};

/**
 * Delete forecast entry
 */
export const useDeleteForecast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteForecast(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: forecastKeys.list() });
    },
  });
};

/**
 * Bulk import forecasts
 */
export const useBulkImportForecasts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkImportForecastRequest) => bulkImportForecasts(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: forecastKeys.all });
    },
  });
};

// ===== Legacy compatibility =====
// These exports maintain backward compatibility with existing code

export const useForecastHeaders = useForecasts;
export const useForecastHeader = useForecast;
