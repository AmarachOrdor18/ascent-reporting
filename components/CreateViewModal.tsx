'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface CreateViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateViewModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateViewModalProps) {
  const [formData, setFormData] = useState({
    viewName: '',
    datasetId: '',
    sqlDefinition: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate view name follows convention
      if (!formData.viewName.endsWith('_DATA') && !formData.viewName.endsWith('_QRY02')) {
        throw new Error('View name must end with _DATA or _QRY02');
      }

      const response = await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewName: formData.viewName,
          datasetId: parseInt(formData.datasetId),
          viewDefinition: formData.sqlDefinition,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create view');
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
      viewName: '',
      datasetId: '',
      sqlDefinition: '',
    });
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create SQL View</h2>
            <p className="text-sm text-gray-600 mt-1">
              Define transformation logic using SQL
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                View Name * (must end with _DATA or _QRY02)
              </label>
              <input
                type="text"
                required
                value={formData.viewName}
                onChange={(e) =>
                  setFormData({ ...formData, viewName: e.target.value.toUpperCase() })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., EXPOSURE_REPORT_DATA"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Dataset ID *
              </label>
              <input
                type="number"
                required
                value={formData.datasetId}
                onChange={(e) =>
                  setFormData({ ...formData, datasetId: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 158262868"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                SQL Definition *
              </label>
              <textarea
                required
                value={formData.sqlDefinition}
                onChange={(e) =>
                  setFormData({ ...formData, sqlDefinition: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={15}
                placeholder={`CREATE OR REPLACE VIEW exposure_report_data AS
SELECT 
  policy_number,
  insured_name,
  premium_amount,
  effective_date,
  status
FROM ds_exposure_active
WHERE status = 'ACTIVE';`}
              />
            </div>
          </div>

          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-sm text-yellow-900">
              <strong>Naming Convention:</strong>
              <br />
              • Main view: [report_name]_DATA (contains transformation logic)
              <br />
              • Query view: [report_name]_QRY02 (wrapper with type column)
            </p>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {loading ? 'Creating...' : 'Create View'}
          </button>
        </div>
      </div>
    </div>
  );
}