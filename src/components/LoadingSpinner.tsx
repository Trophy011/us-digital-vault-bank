
import React from 'react';
import { Building2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "Loading...", 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700">
      <div className="flex items-center space-x-3 mb-4">
        <Building2 className="h-10 w-10 text-white" />
        <span className="text-2xl font-bold text-white">US Bank</span>
      </div>
      <div className="flex flex-col items-center space-y-4">
        <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-white/20 border-t-white`} />
        <p className="text-white text-lg font-medium">{message}</p>
      </div>
    </div>
  );
};
