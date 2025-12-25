import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { hooksLogger, logNetworkRequest, performance } from '../utils/debug';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  immediate?: boolean;
}

interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function useApi<T>(
  endpoint: string, 
  options: ApiOptions = {}
) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const { token, logout } = useAuth();
  const { method = 'GET', immediate = false } = options;

  const execute = useCallback(async (
    requestOptions?: ApiOptions
  ): Promise<T | null> => {
    const finalOptions = { ...options, ...requestOptions };
    const finalMethod = finalOptions.method || method;
    const url = `${API_BASE_URL}/api${endpoint}`;
    
    hooksLogger.info(`Starting API request: ${finalMethod} ${endpoint}`, {
      hasToken: !!token,
      hasBody: !!finalOptions.body,
      endpoint
    });
    
    performance.mark(`api-${endpoint}-start`);
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...finalOptions.headers
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const fetchOptions: RequestInit = {
        method: finalMethod,
        headers
      };

      if (finalOptions.body && finalMethod !== 'GET') {
        fetchOptions.body = JSON.stringify(finalOptions.body);
        hooksLogger.debug(`Request body for ${endpoint}`, finalOptions.body);
      }

      hooksLogger.debug(`Sending request to ${url}`, { method: finalMethod, headers: { ...headers, Authorization: headers.Authorization ? 'Bearer ***' : undefined } });
      
      const response = await fetch(url, fetchOptions);
      
      hooksLogger.info(`Response received for ${endpoint}`, { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok 
      });

      if (response.status === 401) {
        hooksLogger.warn(`Unauthorized response for ${endpoint}, logging out`);
        logout();
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 
          errorData.detail || 
          `HTTP ${response.status}: ${response.statusText}`;
        
        hooksLogger.error(`API request failed: ${endpoint}`, { 
          status: response.status, 
          errorData, 
          errorMessage 
        });
        
        logNetworkRequest(finalMethod, url, finalOptions.body, null, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      performance.measure(`api-${endpoint}`, `api-${endpoint}-start`);
      hooksLogger.info(`API request successful: ${endpoint}`, { dataReceived: !!data });
      logNetworkRequest(finalMethod, url, finalOptions.body, data);
      
      setState({ data, loading: false, error: null });
      return data;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      performance.measure(`api-${endpoint}-error`, `api-${endpoint}-start`);
      hooksLogger.error(`API request exception: ${endpoint}`, { error, errorMessage });
      
      setState({ data: null, loading: false, error: errorMessage });
      return null;
    }
  }, [endpoint, method, token, logout, options]);

  useEffect(() => {
    if (immediate) {
      hooksLogger.debug(`Auto-executing immediate API call for ${endpoint}`);
      execute();
    }
  }, [execute, immediate, endpoint]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset
  };
}

export function usePaginatedApi<T>(
  endpoint: string,
  initialParams: PaginationParams = {}
) {
  const [params, setParams] = useState(initialParams);
  const [allData, setAllData] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const queryString = new URLSearchParams({
    ...(params.page && { skip: ((params.page - 1) * (params.limit || 20)).toString() }),
    ...(params.limit && { limit: params.limit.toString() }),
    ...(params.search && { search: params.search })
  }).toString();

  const { data, loading, error, execute } = useApi<{
    items?: T[];
    total?: number;
    data?: T[];
  }>(`${endpoint}?${queryString}`, { immediate: true });

  useEffect(() => {
    if (data) {
      const items = data.items || data.data || (Array.isArray(data) ? data : []);
      const total = data.total || items.length;

      if (params.page === 1 || !params.page) {
        setAllData(items);
      } else {
        setAllData(prev => [...prev, ...items]);
      }

      setTotalCount(total);
      setHasMore(items.length === (params.limit || 20));
    }
  }, [data, params.page, params.limit]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setParams(prev => ({
        ...prev,
        page: (prev.page || 1) + 1
      }));
    }
  }, [loading, hasMore]);

  const refresh = useCallback(() => {
    setParams(prev => ({ ...prev, page: 1 }));
    setAllData([]);
    setHasMore(true);
    execute();
  }, [execute]);

  const updateParams = useCallback((newParams: Partial<PaginationParams>) => {
    setParams(prev => ({ ...prev, ...newParams, page: 1 }));
    setAllData([]);
    setHasMore(true);
  }, []);

  return {
    data: allData,
    loading,
    error,
    totalCount,
    hasMore,
    params,
    loadMore,
    refresh,
    updateParams
  };
}

export function useApiMutation<T, P = any>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST'
) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const { token, logout } = useAuth();

  const mutate = useCallback(async (
    payload?: P,
    pathParams?: Record<string, string>
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let url = endpoint;
      if (pathParams) {
        Object.entries(pathParams).forEach(([key, value]) => {
          url = url.replace(`{${key}}`, value);
        });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const fetchOptions: RequestInit = {
        method,
        headers
      };

      if (payload && method !== 'DELETE') {
        fetchOptions.body = JSON.stringify(payload);
      }

      const response = await fetch(`${API_BASE_URL}/api${url}`, fetchOptions);

      if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || 
          errorData.detail || 
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = response.status === 204 ? null : await response.json();
      setState({ data, loading: false, error: null });
      return data;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState({ data: null, loading: false, error: errorMessage });
      return null;
    }
  }, [endpoint, method, token, logout]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    mutate,
    reset
  };
}