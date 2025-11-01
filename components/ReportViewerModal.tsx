'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastRowRef = useCallback((node: HTMLTableRowElement) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);

  useEffect(() => {
    if (isOpen && datasetId) {
      fetchReport(1);
    }
  }, [isOpen, datasetId]);

  const fetchReport = async (pageNum: number) => {
    const isInitial = pageNum === 1;
    isInitial ? setLoading(true) : setLoadingMore(true);
    setError('');

    try {
      const response = await fetch(
        `/api/datasets/${datasetId}/query?page=${pageNum}&limit=1000`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch report');
      }

      if (result.data && result.data.length > 0) {
        const firstRow = result.data[0];
        
        if (isInitial) {
          setColumns(Object.keys(firstRow));
          setData(result.data);
        } else {
          setData(prev => [...prev, ...result.data]);
        }
        
        setMetadata(result);
        setHasMore(result.pagination.hasMore);
        setPage(pageNum);
      } else if (isInitial) {
        setData([]);
        setColumns([]);
        setHasMore(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      isInitial ? setLoading(false) : setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchReport(page + 1);
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
                Showing: {data.length.toLocaleString()} rows
                {metadata.pagination.total > 0 && 
                  ` of ${metadata.pagination.total.toLocaleString()} total`}
                {hasMore && ' • Scroll to load more'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchReport(1)}
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
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-gray-100 z-10">
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
                    <tr 
                      key={idx} 
                      className="hover:bg-gray-50"
                      ref={idx === data.length - 1 ? lastRowRef : null}
                    >
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
              
              {loadingMore && (
                <div className="text-center py-4">
                  <RefreshCw className="animate-spin mx-auto text-blue-600" size={24} />
                  <p className="text-sm text-gray-600 mt-2">Loading more...</p>
                </div>
              )}
              
              {!hasMore && data.length > 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  All {data.length.toLocaleString()} rows loaded
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}