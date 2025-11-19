/**
 * Forecast Hooks (v2.2 - Phase B-2)
 * TanStack Query hooks for forecast headers and lines
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  ForecastHeadersListParams,
  CreateForecastHeaderRequest,
  UpdateForecastHeaderRequest,
  CreateForecastLineRequest,
  UpdateForecastLineRequest,
  BulkImportForecastRequest,
} from "../api";
import {
  getForecastHeaders,
  getForecastHeader,
  getForecastLines,
  createForecastHeader,
  updateForecastHeader,
  deleteForecastHeader,
  createForecastLine,
  updateForecastLine,
  deleteForecastLine,
  bulkImportForecasts,
} from "../api";

// ===== Query Keys =====

export const forecastKeys = {
  all: ["forecasts"] as const,
  headers: () => [...forecastKeys.all, "headers"] as const,
  header: (id: number) => [...forecastKeys.all, "headers", id] as const,
  lines: (headerId: number) => [...forecastKeys.all, "lines", headerId] as const,
};

// ===== Query Hooks =====

/**
 * Get forecast headers list
 */
export const useForecastHeaders = (params?: ForecastHeadersListParams) => {
  return useQuery({
    queryKey: [...forecastKeys.headers(), params],
    queryFn: () => getForecastHeaders(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get forecast header detail (with lines)
 */
export const useForecastHeader = (id: number) => {
  return useQuery({
    queryKey: forecastKeys.header(id),
    queryFn: () => getForecastHeader(id),
    enabled: id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get forecast lines for a header
 */
export const useForecastLines = (headerId: number) => {
  return useQuery({
    queryKey: forecastKeys.lines(headerId),
    queryFn: () => getForecastLines(headerId),
    enabled: headerId > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// ===== Mutation Hooks =====

/**
 * Create forecast header
 */
export const useCreateForecastHeader = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateForecastHeaderRequest) => createForecastHeader(data),
    onSuccess: () => {
      // Invalidate headers list to refetch
      queryClient.invalidateQueries({ queryKey: forecastKeys.headers() });
    },
  });
};

/**
 * Update forecast header
 */
export const useUpdateForecastHeader = (id: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateForecastHeaderRequest) => updateForecastHeader(id, data),
    onSuccess: () => {
      // Invalidate both the specific header and the headers list
      queryClient.invalidateQueries({ queryKey: forecastKeys.header(id) });
      queryClient.invalidateQueries({ queryKey: forecastKeys.headers() });
    },
  });
};

/**
 * Delete forecast header
 */
export const useDeleteForecastHeader = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteForecastHeader(id),
    onSuccess: () => {
      // Invalidate headers list to refetch
      queryClient.invalidateQueries({ queryKey: forecastKeys.headers() });
    },
  });
};

/**
 * Create forecast line
 */
export const useCreateForecastLine = (headerId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateForecastLineRequest) => createForecastLine(headerId, data),
    onSuccess: () => {
      // Invalidate both the header detail (includes lines) and the lines list
      queryClient.invalidateQueries({ queryKey: forecastKeys.header(headerId) });
      queryClient.invalidateQueries({ queryKey: forecastKeys.lines(headerId) });
    },
  });
};

/**
 * Update forecast line
 */
export const useUpdateForecastLine = (lineId: number, headerId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateForecastLineRequest) => updateForecastLine(lineId, data),
    onSuccess: () => {
      // Invalidate both the header detail (includes lines) and the lines list
      queryClient.invalidateQueries({ queryKey: forecastKeys.header(headerId) });
      queryClient.invalidateQueries({ queryKey: forecastKeys.lines(headerId) });
    },
  });
};

/**
 * Delete forecast line
 */
export const useDeleteForecastLine = (headerId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lineId: number) => deleteForecastLine(lineId),
    onSuccess: () => {
      // Invalidate both the header detail (includes lines) and the lines list
      queryClient.invalidateQueries({ queryKey: forecastKeys.header(headerId) });
      queryClient.invalidateQueries({ queryKey: forecastKeys.lines(headerId) });
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
      // Invalidate all forecast queries to refetch
      queryClient.invalidateQueries({ queryKey: forecastKeys.all });
    },
  });
};
