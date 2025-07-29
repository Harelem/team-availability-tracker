import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

const buttonVariants = {
  default: 'bg-blue-600 text-white hover:bg-blue-700 border-transparent',
  outline: 'bg-transparent text-gray-700 border-gray-300 hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-700 border-transparent hover:bg-gray-100',
  link: 'bg-transparent text-blue-600 border-transparent hover:text-blue-800 underline-offset-4 hover:underline'
};

const buttonSizes = {
  default: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1.5 text-xs',
  lg: 'px-6 py-3 text-base'
};

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'default', 
  size = 'default',
  className = "",
  disabled,
  ...props 
}) => {
  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-md font-medium transition-colors
        border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:opacity-50 disabled:pointer-events-none
        ${buttonVariants[variant]}
        ${buttonSizes[size]}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};