'use client';

import { useState, useEffect } from 'react';
import { Upload, Download, FileSpreadsheet, RefreshCw, Plus, LogOut } from 'lucide-react';
import CreateDataSourceModal from './CreateDataSourceModal';
import UploadModal from './UploadModal';
import CreateCycleModal from './CreateCycleModal';
import toast, { Toaster } from 'react-hot-toast';

export default function AscentDashboard() {
  const [mounted, setMounted] = useState(false); // 👈 add this

  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeView, setActiveView] = useState('datasources');
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [dataSets, setDataSets] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [stats, setStats] = useState({
    dataSources: 0,
    dataSets: 0,
    users: 0,
    others: 0,
  });
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showCreateDSModal, setShowCreateDSModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateCycleModal, setShowCreateCycleModal] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState('');

  // Fetch data on mount and when view changes
  useEffect(() => {
    fetchData();
  }, [activeView]);

    const fetchData = async () => {
    setLoading(true);

    try {
    let response: Response;
    let data: any;

    // 🧩 Select API endpoint based on active view
    if (activeView === 'datasources') {
        response = await fetch('/api/datasources');
    } else if (activeView === 'datasets') {
        response = await fetch('/api/datasets');
    } else if (activeView === 'cycles') {
        response = await fetch('/api/cycles');
    } else {
        throw new Error('Invalid view selected');
    }

    // 🧠 Try parsing JSON safely (in case backend returns HTML or invalid JSON)
    try {
        data = await response.json();
    } catch {
        throw new Error('Invalid JSON response from server');
    }

    // 🚨 Check for server errors
    if (!response.ok || data?.error) {
        throw new Error(data?.error || `Failed to fetch ${activeView}`);
    }

    // 🧾 Ensure the response is an array
    const dataArray = Array.isArray(data) ? data : [];

    // 🧮 Update the correct state based on the view
    switch (activeView) {
        case 'datasources':
        setDataSources(dataArray);
        setStats((prev) => ({ ...prev, dataSources: dataArray.length }));
        break;

        case 'datasets':
        setDataSets(dataArray);
        setStats((prev) => ({ ...prev, dataSets: dataArray.length }));
        break;

        case 'cycles':
        setCycles(dataArray);
        break;
    }
    } catch (error: any) {
    console.error('Error fetching data:', error);
    toast.error(error.message || 'Failed to load data');

    // 🧹 Prevent map errors by clearing state arrays on failure
    if (activeView === 'datasources') setDataSources([]);
    if (activeView === 'datasets') setDataSets([]);
    if (activeView === 'cycles') setCycles([]);
    } finally {
    setLoading(false);
    }
    };
  

  const handleUploadClick = (datasourceName: string) => {
    setSelectedDataSource(datasourceName);
    setShowUploadModal(true);
  };

  const handleAdmit = async (datasourceName: string, datasourceId: string) => {
    if (!confirm(`Are you sure you want to admit data to ${datasourceName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/datasources/${datasourceId}/admit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasourceName }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success(result.message);
      fetchData();
    } catch (error: any) {
      console.error('Admit error:', error);
      toast.error(error.message || 'Failed to admit data');
    }
  };

  const handleCloseCycle = async (cycleReferenceId: string) => {
    const datasourceNames = prompt(
      'Enter comma-separated datasource names to include in this cycle (e.g., DS_EXPOSURE,DS_RETRO_EXPOSURE):'
    );

    if (!datasourceNames) return;

    const dsArray = datasourceNames.split(',').map((ds) => ds.trim());

    try {
      const response = await fetch(`/api/cycles/${cycleReferenceId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleReferenceId,
          datasourceNames: dsArray,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success(result.message);
      fetchData();
    } catch (error: any) {
      console.error('Close cycle error:', error);
      toast.error(error.message || 'Failed to close cycle');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Toaster position="top-right" />

      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-blue-900">ASCENT</h1>
          </div>

          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">CONTI CONTI</span>
              <button className="text-gray-400 hover:text-gray-600">▼</button>
            </div>
            <div className="text-xs text-gray-500 mt-1">Operator</div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Data Source
            </div>
            <button
              onClick={() => setActiveView('datasources')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm ${
                activeView === 'datasources'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileSpreadsheet size={18} />
              Data Sources
            </button>
            <button
              onClick={() => setShowCreateDSModal(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50"
            >
              <Plus size={18} />
              Create Data Source
            </button>

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6">
              Data Sets
            </div>
            <button
              onClick={() => setActiveView('datasets')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm ${
                activeView === 'datasets'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileSpreadsheet size={18} />
              Data Sets
            </button>

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6">
              Reports
            </div>
            <button
              onClick={() => setActiveView('cycles')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm ${
                activeView === 'cycles'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <RefreshCw size={18} />
              Report Cycles
            </button>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50">
              <LogOut size={18} />
              Audit Log
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm text-gray-500 mb-1">
                  DASHBOARD / {activeView.toUpperCase()}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Welcome to Dashboard</h2>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                  <Download size={18} />
                  DOWNLOAD EXCEL
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                  <Download size={18} />
                  DOWNLOAD CSV
                </button>
                {activeView === 'cycles' && (
                  <button
                    onClick={() => setShowCreateCycleModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                  >
                    <Plus size={18} />
                    OPEN NEW CYCLE
                  </button>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-green-500 text-white p-6 rounded-lg">
                <div className="text-sm uppercase mb-2">Data Sources</div>
                <div className="text-4xl font-bold">{stats.dataSources}</div>
              </div>
              <div className="bg-slate-500 text-white p-6 rounded-lg">
                <div className="text-sm uppercase mb-2">Data Sets</div>
                <div className="text-4xl font-bold">{stats.dataSets}</div>
              </div>
              <div className="bg-yellow-500 text-white p-6 rounded-lg">
                <div className="text-sm uppercase mb-2">Users</div>
                <div className="text-4xl font-bold">{stats.users}</div>
              </div>
              <div className="bg-cyan-500 text-white p-6 rounded-lg">
                <div className="text-sm uppercase mb-2">Others</div>
                <div className="text-4xl font-bold">{stats.others}</div>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {activeView === 'datasources' && 'Data Sources'}
                  {activeView === 'datasets' && 'Data Sets'}
                  {activeView === 'cycles' && 'Report Cycles'}
                </h3>
                <button
                  onClick={fetchData}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-end gap-3 mb-4">
                  <span className="text-sm text-gray-600">Filter</span>
                  <input
                    type="text"
                    placeholder="Type to Search"
                    className="px-4 py-2 border border-gray-300 rounded w-64"
                  />
                  <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                    Clear
                  </button>
                </div>

                {/* Data Sources Table */}
                {activeView === 'datasources' && (
                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="text-center py-8">Loading...</div>
                    ) : dataSources.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No data sources found. Create one to get started.
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-sm">
                            <th className="pb-3 font-semibold">S/N</th>
                            <th className="pb-3 font-semibold">DataSourceId</th>
                            <th className="pb-3 font-semibold">DataSourceName</th>
                            <th className="pb-3 font-semibold">Description</th>
                            <th className="pb-3 font-semibold">Type</th>
                            <th className="pb-3 font-semibold">Lobby</th>
                            <th className="pb-3 font-semibold">Created At</th>
                            <th className="pb-3 font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {dataSources.map((ds: any, idx) => (
                            <tr key={ds.datasource_id} className="border-b border-gray-100 bg-green-50">
                              <td className="py-4">{idx + 1}</td>
                              <td className="py-4">{ds.datasource_id}</td>
                              <td className="py-4 font-medium">{ds.datasource_name}</td>
                              <td className="py-4">{ds.datasource_description}</td>
                              <td className="py-4">{ds.datasource_update_type}</td>
                              <td className="py-4">{ds.lobby || 0}</td>
                              <td className="py-4">{formatDate(ds.datasource_created_at)}</td>
                              <td className="py-4">
                                <div className="flex gap-2 flex-wrap">
                                  <button className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                                    Screen View
                                  </button>
                                  <button className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                                    History
                                  </button>
                                  <button
                                    onClick={() => handleUploadClick(ds.datasource_name)}
                                    className="px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
                                  >
                                    Upload
                                  </button>
                                  {ds.lobby > 0 && (
                                    <>
                                      <button className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600">
                                        Lobby ({ds.lobby})
                                      </button>
                                      <button
                                        onClick={() => handleAdmit(ds.datasource_name, ds.datasource_id)}
                                        className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                                      >
                                        Admit
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Data Sets Table */}
                {activeView === 'datasets' && (
                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="text-center py-8">Loading...</div>
                    ) : dataSets.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No data sets found.
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-sm">
                            <th className="pb-3 font-semibold">S/N</th>
                            <th className="pb-3 font-semibold">DataSetId</th>
                            <th className="pb-3 font-semibold">DataSetName</th>
                            <th className="pb-3 font-semibold">Description</th>
                            <th className="pb-3 font-semibold">Updated At</th>
                            <th className="pb-3 font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {dataSets.map((ds: any, idx) => (
                            <tr key={ds.dataset_id} className="border-b border-gray-100">
                              <td className="py-4">{idx + 1}</td>
                              <td className="py-4">{ds.dataset_id}</td>
                              <td className="py-4 font-medium">{ds.dataset_name}</td>
                              <td className="py-4">{ds.dataset_description}</td>
                              <td className="py-4">{formatDate(ds.dataset_updated_at)}</td>
                              <td className="py-4">
                                <div className="flex gap-2">
                                  <button className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600">
                                    Design
                                  </button>
                                  <button className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600">
                                    Screen View
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Cycles Table */}
                {activeView === 'cycles' && (
                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="text-center py-8">Loading...</div>
                    ) : cycles.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No cycles found. Create one to get started.
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-sm">
                            <th className="pb-3 font-semibold">S/N</th>
                            <th className="pb-3 font-semibold">Cycle Type</th>
                            <th className="pb-3 font-semibold">Cycle Date</th>
                            <th className="pb-3 font-semibold">Cycle Reference</th>
                            <th className="pb-3 font-semibold">Opened By</th>
                            <th className="pb-3 font-semibold">Status</th>
                            <th className="pb-3 font-semibold">Created At</th>
                            <th className="pb-3 font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {cycles.map((cycle: any, idx) => (
                            <tr key={cycle.cycle_id} className="border-b border-gray-100">
                              <td className="py-4">{idx + 1}</td>
                              <td className="py-4">{cycle.cycle_type}</td>
                              <td className="py-4">{cycle.cycle_date}</td>
                              <td className="py-4 font-mono text-xs">{cycle.cycle_reference_id}</td>
                              <td className="py-4">{cycle.opened_by}</td>
                              <td className="py-4">
                                <span
                                  className={`px-3 py-1 rounded text-xs font-semibold ${
                                    cycle.status === 'OPEN'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {cycle.status}
                                </span>
                              </td>
                              <td className="py-4">{formatDate(cycle.opened_at)}</td>
                              <td className="py-4">
                                <div className="flex gap-2">
                                  <button className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600">
                                    More
                                  </button>
                                  {cycle.status === 'OPEN' ? (
                                    <button
                                      onClick={() => handleCloseCycle(cycle.cycle_reference_id)}
                                      className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
                                    >
                                      Close
                                    </button>
                                  ) : (
                                    <button className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">
                                      Reopen
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateDataSourceModal
        isOpen={showCreateDSModal}
        onClose={() => setShowCreateDSModal(false)}
        onSuccess={() => {
          fetchData();
          toast.success('Data source created successfully!');
        }}
      />

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        datasourceName={selectedDataSource}
        onSuccess={() => {
          fetchData();
        }}
      />

      <CreateCycleModal
        isOpen={showCreateCycleModal}
        onClose={() => setShowCreateCycleModal(false)}
        onSuccess={() => {
          fetchData();
          toast.success('Cycle created successfully!');
        }}
      />
    </>
  );
}