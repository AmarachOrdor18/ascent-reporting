'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

interface DataPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasourceName: string;
  tableType: 'RAW' | 'ACTIVE' | 'HIST';
}

export default function DataPreviewModal({
  isOpen,
  onClose,
  datasourceName,
  tableType,
}: DataPreviewModalProps) {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, datasourceName, tableType]);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const tableName = `${datasourceName}_${tableType}`;
      const response = await fetch(`/api/preview?table=${tableName}&limit=100`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      if (result.rows.length > 0) {
        setColumns(Object.keys(result.rows[0]));
        setData(result.rows);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Data Preview</h2>
            <p className="text-sm text-gray-600 mt-1">
              {datasourceName}_{tableType} (showing first 100 rows)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 text-sm">
              <Download size={16} />
              Export
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="text-center py-8">Loading data...</div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && data.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No data available in this table.
            </div>
          )}

          {!loading && !error && data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {columns.map((col) => (
                        <td
                          key={col}
                          className="px-4 py-2 text-sm text-gray-900 border"
                        >
                          {row[col] !== null && row[col] !== undefined
                            ? String(row[col])
                            : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}