import React from 'react';
import { format } from 'date-fns';

interface PrintDocumentProps {
  title: string;
  subtitle?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  children: React.ReactNode;
}

/**
 * Professional print document wrapper for Sadaat Travels
 * Provides consistent header, footer, and formatting for printed documents
 */
export function PrintDocument({ title, subtitle, dateRange, children }: PrintDocumentProps) {
  const currentDate = format(new Date(), 'dd MMM yyyy, HH:mm');

  return (
    <div className="print-document">
      {/* Print Header */}
      <div className="print-header">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SADAAT TRAVELS</h1>
            <p className="text-sm text-gray-600">Management System</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Generated: {currentDate}</p>
          </div>
        </div>
        
        <div className="border-t-2 border-gray-900 pt-4 mt-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          {dateRange && (
            <p className="text-sm text-gray-600 mt-1">
              Period: {format(dateRange.start, 'dd MMM yyyy')} - {format(dateRange.end, 'dd MMM yyyy')}
            </p>
          )}
        </div>
      </div>

      {/* Print Content */}
      <div className="print-content">
        {children}
      </div>

      {/* Print Footer */}
      <div className="print-footer">
        <div className="border-t border-gray-300 pt-2 mt-8">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Sadaat Travels Management System</span>
            <span>Page <span className="page-number">1</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
