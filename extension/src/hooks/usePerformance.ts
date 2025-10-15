/**
 * Performance monitoring and optimization hooks
 * Provides performance metrics, lazy loading, and optimization utilities
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { logger } from '../core/logger';

export interface PerformanceMetrics {
  renderTime: number;
  componentMountTime: number;
  reRenderCount: number;
  memoryUsage: number;
  lastUpdateTime: Date;
  averageRenderTime: number;
}

export interface UsePerformanceOptions {
  enableMemoryMonitoring?: boolean;
  enableRenderTimeTracking?: boolean;
  maxMetricsHistory?: number;
}

export function usePerformance(options: UsePerformanceOptions = {}): PerformanceMetrics & {
  resetMetrics: () => void;
  exportMetrics: () => string;
} {
  const {
    enableMemoryMonitoring = true,
    enableRenderTimeTracking = true,
    maxMetricsHistory = 100
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentMountTime: Date.now(),
    reRenderCount: 0,
    memoryUsage: 0,
    lastUpdateTime: new Date(),
    averageRenderTime: 0
  });

  const renderTimesRef = useRef<number[]>([]);
  const renderStartRef = useRef<number>(Date.now());

  // Track render time
  useEffect(() => {
    if (enableRenderTimeTracking) {
      const renderTime = Date.now() - renderStartRef.current;
      renderTimesRef.current.push(renderTime);

      if (renderTimesRef.current.length > maxMetricsHistory) {
        renderTimesRef.current.shift();
      }

      const averageRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;

      setMetrics(prev => ({
        ...prev,
        renderTime,
        reRenderCount: prev.reRenderCount + 1,
        averageRenderTime,
        lastUpdateTime: new Date()
      }));
    }

    renderStartRef.current = Date.now();
  });

  // Memory monitoring
  useEffect(() => {
    if (enableMemoryMonitoring && 'memory' in performance) {
      const updateMemoryUsage = () => {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // Convert to MB

        setMetrics(prev => ({
          ...prev,
          memoryUsage
        }));
      };

      updateMemoryUsage();
      const interval = setInterval(updateMemoryUsage, 5000);

      return () => clearInterval(interval);
    }
  }, [enableMemoryMonitoring]);

  const resetMetrics = useCallback(() => {
    renderTimesRef.current = [];
    setMetrics({
      renderTime: 0,
      componentMountTime: Date.now(),
      reRenderCount: 0,
      memoryUsage: 0,
      lastUpdateTime: new Date(),
      averageRenderTime: 0
    });
    logger.info('performance', 'Performance metrics reset');
  }, []);

  const exportMetrics = useCallback(() => {
    return JSON.stringify({
      ...metrics,
      renderHistory: renderTimesRef.current,
      timestamp: new Date().toISOString()
    }, null, 2);
  }, [metrics]);

  return {
    ...metrics,
    resetMetrics,
    exportMetrics
  };
}

// Hook for lazy loading components with loading states
export function useLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    fallback?: React.ComponentType;
    errorComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
    retryAttempts?: number;
    preload?: boolean;
  } = {}
) {
  const {
    fallback: Fallback,
    errorComponent: ErrorComponent,
    retryAttempts = 3,
    preload = false
  } = options;

  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadComponent = useCallback(async () => {
    if (Component) return Component;

    setLoading(true);
    setError(null);

    try {
      logger.debug('lazy-loading', 'Loading component');
      const module = await importFn();
      setComponent(module.default);
      setLoading(false);
      return module.default;
    } catch (err) {
      const error = err as Error;
      setError(error);
      setLoading(false);
      logger.error('lazy-loading', 'Failed to load component', error);
      throw error;
    }
  }, [importFn, Component]);

  const retry = useCallback(() => {
    if (retryCount < retryAttempts) {
      setRetryCount(prev => prev + 1);
      setComponent(null);
      loadComponent();
    }
  }, [retryCount, retryAttempts, loadComponent]);

  // Preload if requested
  useEffect(() => {
    if (preload) {
      loadComponent();
    }
  }, [preload, loadComponent]);

  const LazyComponent = useMemo(() => {
    if (Component) {
      return Component;
    }

    if (loading && Fallback) {
      return Fallback;
    }

    if (error && ErrorComponent) {
      return ErrorComponent as React.ComponentType<any>;
    }

    return null;
  }, [Component, loading, error, Fallback, ErrorComponent, retry]);

  return {
    Component: LazyComponent,
    loadComponent,
    isLoading: loading,
    error,
    retry,
    retryCount
  };
}

// Hook for debounced values
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook for throttled functions
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  return useCallback((...args: Parameters<T>) => {
    if (Date.now() - lastRun.current >= delay) {
      fn(...args);
      lastRun.current = Date.now();
    }
  }, [fn, delay]) as T;
}

// Hook for intersection observer (lazy loading)
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLDivElement>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [options]);

  return [targetRef, isIntersecting];
}

// Hook for resource monitoring
export function useResourceMonitor() {
  const [resources, setResources] = useState<{
    memory: number;
    timing: PerformanceTiming | null;
    navigation: PerformanceNavigation | null;
  }>({
    memory: 0,
    timing: null,
    navigation: null
  });

  useEffect(() => {
    const updateResources = () => {
      const memory = 'memory' in performance ? (performance as any).memory.usedJSHeapSize : 0;
      const timing = performance.timing;
      const navigation = performance.navigation;

      setResources({
        memory: memory / 1024 / 1024, // Convert to MB
        timing,
        navigation
      });
    };

    updateResources();
    const interval = setInterval(updateResources, 5000);

    return () => clearInterval(interval);
  }, []);

  const getPerformanceGrade = useCallback(() => {
    const { timing } = resources;
    if (!timing) return 'N/A';

    const loadTime = timing.loadEventEnd - timing.navigationStart;
    const domInteractive = timing.domInteractive - timing.navigationStart;

    if (loadTime < 1000 && domInteractive < 500) return 'A';
    if (loadTime < 2000 && domInteractive < 1000) return 'B';
    if (loadTime < 3000 && domInteractive < 1500) return 'C';
    return 'D';
  }, [resources]);

  return {
    ...resources,
    performanceGrade: getPerformanceGrade(),
    isHighMemoryUsage: resources.memory > 100, // > 100MB
    isSlowLoad: resources.timing ?
      (resources.timing.loadEventEnd - resources.timing.navigationStart) > 3000 : false
  };
}

// Hook for virtual scrolling (performance optimization for large lists)
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return {
      items: items.slice(startIndex, endIndex + 1),
      startIndex,
      endIndex,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    scrollTop
  };
}