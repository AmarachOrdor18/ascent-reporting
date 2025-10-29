'use client';

import { useState, useEffect } from 'react';
import { X, Download, RefreshCw } from 'lucide-react';

interface ReportViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  datasetName: string;
}

export default function ReportViewerModal({
  isOpen,
  onClose,
  datasetId,
  datasetName,
}: ReportViewerModalProps) {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    if (isOpen && datasetId) {
      fetchReport();
    }
  }, [isOpen, datasetId]);

  const fetchReport = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/datasets/${datasetId}/query`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch report');
      }

      if (result.data && result.data.length > 0) {
        // Extract columns from first row
        const firstRow = result.data[0].result || result.data[0];
        setColumns(Object.keys(firstRow));
        setData(result.data.map((row: any) => row.result || row));
        setMetadata(result);
      } else {
        setData([]);
        setColumns([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) return;

    const csv = [
      columns.join(','),
      ...data.map(row =>
        columns.map(col => {
          const value = row[col];
          return typeof value === 'string' && value.includes(',')
            ? `"${value}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${datasetName}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      return value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(value).toLocaleDateString();
    }
    return String(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{datasetName}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {metadata?.dataset?.dataset_description}
            </p>
            {metadata && (
              <p className="text-xs text-gray-500 mt-1">
                Generated: {new Date(metadata.generatedAt).toLocaleString()} •{' '}
                {metadata.rowCount} rows • View: {metadata.viewName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              disabled={data.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="text-center py-12">
              <RefreshCw className="animate-spin mx-auto mb-4 text-blue-600" size={32} />
              <p className="text-gray-600">Loading report data...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No data available for this report.</p>
              <p className="text-sm mt-2">
                Make sure you have admitted data to the active tables.
              </p>
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 border bg-gray-100">
                      #
                    </th>
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left font-semibold text-gray-700 border bg-gray-100 whitespace-nowrap"
                      >
                        {col.replace(/_/g, ' ').toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border text-gray-500 font-mono text-xs">
                        {idx + 1}
                      </td>
                      {columns.map((col) => (
                        <td
                          key={col}
                          className="px-4 py-2 border text-gray-900 whitespace-nowrap"
                        >
                          {formatValue(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        {!loading && data.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Showing {data.length} rows</span>
              <span>{columns.length} columns</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}