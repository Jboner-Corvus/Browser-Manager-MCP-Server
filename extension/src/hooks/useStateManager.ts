/**
 * React hooks for optimized state management integration
 * Provides memoized, performant access to the centralized state manager
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { stateManager, StateListener } from '../core/stateManager';
import { logger } from '../core/logger';

// Basic state subscription hook with memoization
export function useStateValue<T = any>(path: string, defaultValue?: T): [T, (value: T) => void] {
  const [, forceUpdate] = useState({});
  const currentValueRef = useRef<T>(defaultValue as T);
  const listenerRef = useRef<StateListener<T>>();
  const pathRef = useRef(path);

  // Update refs when path changes
  if (pathRef.current !== path) {
    pathRef.current = path;
    currentValueRef.current = stateManager.getValue<T>(path) ?? (defaultValue as T);
  }

  const setValue = useCallback((newValue: T) => {
    stateManager.setValue(path, newValue);
  }, [path]);

  // Memoize current value to prevent unnecessary re-renders
  const currentValue = useMemo(() => {
    const value = stateManager.getValue<T>(path);
    return value !== undefined ? value : (defaultValue as T);
  }, [path, defaultValue]);

  // Update ref and trigger re-render if value changed
  if (currentValueRef.current !== currentValue) {
    currentValueRef.current = currentValue;
  }

  useEffect(() => {
    const listener: StateListener<T> = (newValue) => {
      if (currentValueRef.current !== newValue) {
        currentValueRef.current = newValue;
        forceUpdate({});
      }
    };

    // Initial subscription
    const unsubscribe = stateManager.subscribe(path, listener);
    listenerRef.current = listener;

    // Get current value
    const initialValue = stateManager.getValue<T>(path);
    if (initialValue !== undefined && currentValueRef.current !== initialValue) {
      currentValueRef.current = initialValue;
      forceUpdate({});
    }

    return unsubscribe;
  }, [path]);

  return [currentValueRef.current, setValue];
}

// Optimized hook for accessing nested state paths
export function useNestedState<T = any>(basePath: string, paths: string[]): Record<string, T> {
  const [, forceUpdate] = useState({});
  const valuesRef = useRef<Record<string, T>>({} as Record<string, T>);
  const listenersRef = useRef<Map<string, () => void>>(new Map());

  const fullPaths = useMemo(() => {
    return paths.map(path => `${basePath}.${path}`);
  }, [basePath, paths]);

  // Memoize current values
  const currentValues = useMemo(() => {
    const values: Record<string, T> = {};
    fullPaths.forEach((fullPath, index) => {
      const value = stateManager.getValue<T>(fullPath);
      values[paths[index]] = value;
    });
    return values;
  }, [fullPaths, paths]);

  // Check if values changed
  const valuesChanged = useMemo(() => {
    return !Object.keys(currentValues).every(key =>
      valuesRef.current[key] === currentValues[key]
    );
  }, [currentValues]);

  // Update refs and trigger re-render if needed
  if (valuesChanged) {
    valuesRef.current = { ...currentValues };
  }

  useEffect(() => {
    // Clean up old listeners
    listenersRef.current.forEach(unsubscribe => unsubscribe());
    listenersRef.current.clear();

    // Create new listeners for each path
    fullPaths.forEach((fullPath, index) => {
      const unsubscribe = stateManager.subscribe(fullPath, (newValue) => {
        const key = paths[index];
        if (valuesRef.current[key] !== newValue) {
          valuesRef.current[key] = newValue;
          forceUpdate({});
        }
      });
      listenersRef.current.set(fullPath, unsubscribe);
    });

    return () => {
      listenersRef.current.forEach(unsubscribe => unsubscribe());
      listenersRef.current.clear();
    };
  }, [fullPaths, paths]);

  return valuesRef.current;
}

// Hook for state persistence with debounce
export function usePersistedState<T = any>(
  path: string,
  defaultValue: T,
  debounceMs: number = 500
): [T, (value: T) => void] {
  const [value, setValue] = useStateValue<T>(path, defaultValue);
  const timeoutRef = useRef<number>();

  const setPersistedValue = useCallback((newValue: T) => {
    setValue(newValue);

    // Debounce persistence
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      stateManager.setValue(path, newValue);
      logger.debug('use-persisted-state', `State persisted: ${path}`, { value: newValue });
    }, debounceMs);
  }, [path, setValue, debounceMs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, setPersistedValue];
}

// Hook for computed state with memoization
export function useComputedState<T = any>(
  dependencies: string[],
  computeFn: () => T
): T {
  const [computedValue, setComputedValue] = useState<T>(() => computeFn());
  const dependenciesRef = useRef<string[]>(dependencies);
  const computeFnRef = useRef(computeFn);

  // Update refs when dependencies or compute function change
  dependenciesRef.current = dependencies;
  computeFnRef.current = computeFn;

  useEffect(() => {
    const unsubscribeFunctions = dependencies.map(path =>
      stateManager.subscribe(path, () => {
        const newValue = computeFnRef.current();
        setComputedValue(newValue);
      })
    );

    // Initial computation
    setComputedValue(computeFn());

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, dependencies);

  return computedValue;
}

// Hook for state history tracking
export function useStateHistory<T = any>(
  path: string,
  maxHistory: number = 50
): [T, (value: T) => void, T[]] {
  const [value, setValue] = useStateValue<T>(path);
  const [history, setHistory] = useState<T[]>([]);

  const setValueWithHistory = useCallback((newValue: T) => {
    setValue(newValue);
    setHistory(prevHistory => {
      const newHistory = [...prevHistory, newValue].slice(-maxHistory);
      return newHistory;
    });
  }, [setValue, maxHistory]);

  useEffect(() => {
    setHistory([value]);
  }, [path]);

  return [value, setValueWithHistory, history];
}

// Hook for optimistic updates with rollback
export function useOptimisticState<T = any>(
  path: string,
  optimisticUpdateFn: (currentValue: T) => Promise<T>,
  onError?: (error: Error) => void
): [T, (updateFn: (currentValue: T) => T) => Promise<void>, boolean] {
  const [value, setValue] = useStateValue<T>(path);
  const [isUpdating, setIsUpdating] = useState(false);
  const optimisticValueRef = useRef<T>();
  const originalValueRef = useRef<T>();

  const optimisticUpdate = useCallback(async (updateFn: (currentValue: T) => T) => {
    if (isUpdating) return;

    setIsUpdating(true);
    originalValueRef.current = value;

    try {
      // Apply optimistic update immediately
      const optimisticValue = updateFn(value);
      optimisticValueRef.current = optimisticValue;
      setValue(optimisticValue);

      // Apply the real update
      const result = await optimisticUpdateFn(value);

      // If the result differs from optimistic value, update it
      if (result !== optimisticValue) {
        setValue(result);
      }

      optimisticValueRef.current = undefined;
      originalValueRef.current = undefined;
    } catch (error) {
      // Rollback on error
      if (originalValueRef.current !== undefined) {
        setValue(originalValueRef.current);
      }
      optimisticValueRef.current = undefined;
      originalValueRef.current = undefined;

      logger.error('optimistic-state', 'Optimistic update failed', error as Error);
      onError?.(error as Error);
    } finally {
      setIsUpdating(false);
    }
  }, [value, isUpdating, optimisticUpdateFn, setValue, onError]);

  return [optimisticValueRef.current ?? value, optimisticUpdate, isUpdating];
}

// Hook for state validation
export function useStateValidation<T = any>(
  path: string,
  validator: (value: T) => string | null
): [T, (value: T) => void, string | null] {
  const [value, setValue] = useStateValue<T>(path);
  const [error, setError] = useState<string | null>(null);

  const setValidatedValue = useCallback((newValue: T) => {
    const validationError = validator(newValue);
    setError(validationError);

    if (!validationError) {
      setValue(newValue);
    }
  }, [setValue, validator]);

  useEffect(() => {
    const validationError = validator(value);
    setError(validationError);
  }, [value, validator]);

  return [value, setValidatedValue, error];
}

// Hook for performance monitoring
export function useStatePerformance(path: string): {
  value: any;
  renderCount: number;
  lastUpdate: Date;
} {
  const [value, setValue] = useStateValue(path);
  const renderCountRef = useRef(0);
  const lastUpdateRef = useRef(new Date());

  renderCountRef.current += 1;
  lastUpdateRef.current = new Date();

  return {
    value,
    renderCount: renderCountRef.current,
    lastUpdate: lastUpdateRef.current
  };
}