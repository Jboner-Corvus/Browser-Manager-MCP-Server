/**
 * Professional Button Component with variants, loading states, and accessibility
 */

import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  onFocus?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled = false,
  children,
  onClick,
  onFocus,
  onBlur,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
  ...props
}, ref) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle async click operations
  const handleClick = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading || isLoading) return;

    setIsLoading(true);
    setIsPressed(true);

    try {
      if (onClick) {
        await onClick(event);
      }
    } catch (error) {
      console.error('Button click error:', error);
    } finally {
      setIsLoading(false);
      setIsPressed(false);
    }
  }, [disabled, loading, isLoading, onClick]);

  // Handle keyboard interactions
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsPressed(true);
    }
    onKeyDown?.(event);
  }, [onKeyDown]);

  const handleKeyUp = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsPressed(false);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsPressed(false);
      setIsLoading(false);
    };
  }, []);

  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'rounded-lg',
    'transition-all',
    'duration-200',
    'ease-in-out',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'select-none'
  ];

  const variantClasses = {
    primary: [
      'bg-blue-600',
      'text-white',
      'hover:bg-blue-700',
      'active:bg-blue-800',
      'focus:ring-blue-500',
      'shadow-sm',
      'hover:shadow-md'
    ],
    secondary: [
      'bg-gray-600',
      'text-white',
      'hover:bg-gray-700',
      'active:bg-gray-800',
      'focus:ring-gray-500',
      'shadow-sm',
      'hover:shadow-md'
    ],
    outline: [
      'border-2',
      'border-gray-300',
      'text-gray-700',
      'bg-white',
      'hover:bg-gray-50',
      'active:bg-gray-100',
      'focus:ring-blue-500',
      'hover:border-gray-400'
    ],
    ghost: [
      'text-gray-700',
      'bg-transparent',
      'hover:bg-gray-100',
      'active:bg-gray-200',
      'focus:ring-gray-500'
    ],
    danger: [
      'bg-red-600',
      'text-white',
      'hover:bg-red-700',
      'active:bg-red-800',
      'focus:ring-red-500',
      'shadow-sm',
      'hover:shadow-md'
    ]
  };

  const sizeClasses = {
    sm: ['px-3', 'py-1.5', 'text-sm', 'min-h-[32px]'],
    md: ['px-4', 'py-2', 'text-base', 'min-h-[40px]'],
    lg: ['px-6', 'py-3', 'text-lg', 'min-h-[48px]']
  };

  const stateClasses = [
    (loading || isLoading) && 'cursor-wait',
    isPressed && 'scale-95',
    fullWidth && 'w-full'
  ].filter(Boolean);

  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    stateClasses,
    className
  );

  const isDisabled = disabled || loading || isLoading;

  const renderIcon = () => {
    if (!icon) return null;

    const iconClasses = cn(
      'transition-transform',
      'duration-200',
      size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5',
      iconPosition === 'right' && children ? 'ml-2' : 'mr-2'
    );

    return <span className={iconClasses}>{icon}</span>;
  };

  const renderContent = () => {
    if (loading || isLoading) {
      return (
        <>
          <svg
            className={cn(
              'animate-spin',
              size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5',
              iconPosition === 'right' && children ? 'ml-2' : 'mr-2'
            )}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {loadingText || children}
        </>
      );
    }

    return (
      <>
        {iconPosition === 'left' && renderIcon()}
        {children}
        {iconPosition === 'right' && renderIcon()}
      </>
    );
  };

  return (
    <button
      ref={ref}
      className={classes}
      disabled={isDisabled}
      onClick={handleClick}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onMouseUp={handleMouseUp}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-disabled={isDisabled}
      aria-busy={loading || isLoading}
      type="button"
      {...props}
    >
      <span className="flex items-center justify-center">
        {renderContent()}
      </span>
    </button>
  );
});

Button.displayName = 'Button';

export default Button;