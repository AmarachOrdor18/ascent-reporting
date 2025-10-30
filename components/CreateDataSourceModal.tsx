'use client';

import { useState } from 'react';
import { X, Info, AlertCircle } from 'lucide-react';

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
    datasource_name: '',
    datasource_description: '',
    datasource_update_type: 'REPLACE',
  });
  const [sqlQuery, setSqlQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Example template
  const exampleQuery = `CREATE TABLE example_table (
    policy_number VARCHAR(100),
    insured_name VARCHAR(255),
    premium_amount DECIMAL(18,2),
    effective_date DATE,
    status VARCHAR(50)
);`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.datasource_name.startsWith('DS_')) {
      setError('Datasource name must start with DS_');
      return;
    }

    if (!sqlQuery.trim()) {
      setError('SQL CREATE TABLE query is required');
      return;
    }

    // Validate SQL starts with CREATE TABLE
    if (!sqlQuery.trim().toUpperCase().startsWith('CREATE TABLE')) {
      setError('Query must start with CREATE TABLE');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/datasources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sql_query: sqlQuery,
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
      datasource_name: '',
      datasource_description: '',
      datasource_update_type: 'REPLACE',
    });
    setSqlQuery('');
    setError('');
  };

  const loadExample = () => {
    setSqlQuery(exampleQuery);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create Data Source</h2>
            <p className="text-sm text-gray-600 mt-1">
              Define table structure using SQL CREATE TABLE syntax
            </p>
          </div>
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
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <div className="text-red-700 text-sm">{error}</div>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4 mb-6">
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
              <p className="text-xs text-gray-500 mt-1">
                This will be the prefix for your RAW, ACTIVE, and HIST tables
              </p>
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
                rows={2}
                placeholder="Brief description of this data source"
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
                <option value="REPLACE">REPLACE - Clear and replace all data on admit</option>
                <option value="APPEND">APPEND - Add new data on admit</option>
              </select>
            </div>
          </div>

          {/* SQL Query Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                SQL CREATE TABLE Query *
              </label>
              <button
                type="button"
                onClick={loadExample}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Load Example
              </button>
            </div>
            <textarea
              required
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              rows={12}
              placeholder={exampleQuery}
            />
          </div>

          {/* Important Notes */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4">
            <div className="flex items-start gap-3">
              <Info className="text-blue-600 flex-shrink-0" size={20} />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-2">Important Notes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Only define your business columns - system columns (id, upload_id, uploaded_at, uploaded_by) will be added automatically</li>
                  <li>The table name in your query will be ignored - we'll use your datasource name</li>
                  <li>Upload files must be named exactly as the datasource (e.g., DS_EXPOSURE.csv)</li>
                  <li>Three tables will be created: DS_NAME_RAW, DS_NAME_ACTIVE, DS_NAME_HIST</li>
                  <li>Supported data types: VARCHAR(n), TEXT, INT, BIGINT, DECIMAL(p,s), DATE, TIMESTAMP, BOOLEAN</li>
                </ul>
              </div>
            </div>
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
            type="submit"
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