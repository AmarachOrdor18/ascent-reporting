'use client';

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface Column {
  name: string;
  type: string;
}

interface CreateDataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateDataSourceModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateDataSourceModalProps) {
  const [formData, setFormData] = useState({
    datasource_id: '',
    datasource_name: '',
    datasource_description: '',
    datasource_update_type: 'REPLACE',
  });
  const [columns, setColumns] = useState<Column[]>([
    { name: '', type: 'VARCHAR(255)' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dataTypes = [
    'VARCHAR(255)',
    'VARCHAR(500)',
    'VARCHAR(1000)',
    'TEXT',
    'INT',
    'BIGINT',
    'DECIMAL(18,2)',
    'DECIMAL(18,4)',
    'DATE',
    'TIMESTAMP',
    'BOOLEAN',
  ];

  const addColumn = () => {
    setColumns([...columns, { name: '', type: 'VARCHAR(255)' }]);
  };

  const removeColumn = (index: number) => {
    if (columns.length > 1) {
      setColumns(columns.filter((_, i) => i !== index));
    }
  };

  const updateColumn = (index: number, field: 'name' | 'type', value: string) => {
    const updated = [...columns];
    updated[index][field] = value;
    setColumns(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.datasource_name.startsWith('DS_')) {
      setError('Datasource name must start with DS_');
      return;
    }

    const invalidColumns = columns.filter(
      (col) => !col.name.trim() || !col.type.trim()
    );
    if (invalidColumns.length > 0) {
      setError('All columns must have a name and type');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/datasources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          datasource_id: parseInt(formData.datasource_id),
          columns: columns.map((col) => ({
            name: col.name.trim().toLowerCase().replace(/\s+/g, '_'),
            type: col.type,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create datasource');
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      datasource_id: '',
      datasource_name: '',
      datasource_description: '',
      datasource_update_type: 'REPLACE',
    });
    setColumns([{ name: '', type: 'VARCHAR(255)' }]);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create Data Source</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Datasource ID *
              </label>
              <input
                type="number"
                required
                value={formData.datasource_id}
                onChange={(e) =>
                  setFormData({ ...formData, datasource_id: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 443148624"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Datasource Name * (must start with DS_)
              </label>
              <input
                type="text"
                required
                value={formData.datasource_name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    datasource_name: e.target.value.toUpperCase(),
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., DS_EXPOSURE"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.datasource_description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    datasource_description: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Describe the purpose of this data source"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Update Type
              </label>
              <select
                value={formData.datasource_update_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    datasource_update_type: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="REPLACE">REPLACE (Clear and replace all data)</option>
                <option value="APPEND">APPEND (Add new data)</option>
              </select>
            </div>
          </div>

          {/* Columns */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-semibold text-gray-700">
                Table Columns *
              </label>
              <button
                type="button"
                onClick={addColumn}
                className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                <Plus size={16} />
                Add Column
              </button>
            </div>

            <div className="space-y-3">
              {columns.map((column, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      value={column.name}
                      onChange={(e) => updateColumn(index, 'name', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Column name (e.g., policy_number)"
                    />
                  </div>
                  <div className="flex-1">
                    <select
                      value={column.type}
                      onChange={(e) => updateColumn(index, 'type', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {dataTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeColumn(index)}
                    disabled={columns.length === 1}
                    className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-3 text-sm text-gray-600">
              Note: System will automatically add: id, upload_id, uploaded_at, uploaded_by
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Creating...' : 'Create Data Source'}
          </button>
        </div>
      </div>
    </div>
  );
}