import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Folder,
  Plus,
  Search,
  Upload,
  FileText,
  Volume2,
  Video,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  Trash2,
  ArrowLeft,
  RefreshCw,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  HardDrive,
  Grid,
  List,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Download,
  Eye,
  FileUp,
} from 'lucide-react';
import { datasetApi } from '../services/api';
import { detectFileType, formatFileSize, DatasetCategoryType } from '../utils/fileTypeDetector';

interface AdminDataPortfolioTabProps {
  addToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, opts?: { confirmText?: string; cancelText?: string; intent?: 'danger' | 'warning' | 'info' }) => void;
}

interface DatasetItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  language?: string;
  drive_folder_id?: string;
  status: string;
  total_files: number;
  total_size_bytes: number;
  created_at: string;
  updated_at: string;
}

interface DatasetFileItem {
  id: string;
  dataset_id: string;
  file_name: string;
  file_type: DatasetCategoryType;
  mime_type?: string;
  file_size: number;
  drive_file_id?: string;
  drive_url?: string;
  thumbnail_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface UploadTask {
  id: string;
  file: File;
  name: string;
  size: number;
  type: DatasetCategoryType;
  mimeType: string;
  progress: number;
  status: 'queued' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

export const AdminDataPortfolioTab: React.FC<AdminDataPortfolioTabProps> = ({ addToast, showConfirm }) => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Selected dataset detail state
  const [selectedDataset, setSelectedDataset] = useState<DatasetItem | null>(null);
  const [datasetFiles, setDatasetFiles] = useState<DatasetFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<DatasetCategoryType | 'ALL'>('ALL');
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [fileSortBy, setFileSortBy] = useState<'latest' | 'name' | 'size'>('latest');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetDesc, setNewDatasetDesc] = useState('');
  const [newDatasetLang, setNewDatasetLang] = useState('Multilingual');
  const [isCreating, setIsCreating] = useState(false);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Drag and Drop & Upload Queue state
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadTask[]>([]);
  const [isUploadingQueue, setIsUploadingQueue] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load datasets on mount
  const loadDatasets = async () => {
    setIsLoading(true);
    try {
      const res = await datasetApi.getDatasets();
      if (res.data && res.data.success) {
        setDatasets(res.data.datasets || []);
      }
    } catch (err: any) {
      console.error('Failed to load datasets:', err);
      addToast('Error', 'Could not fetch datasets list.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  // Open dataset detail
  const handleOpenDataset = async (dataset: DatasetItem) => {
    setSelectedDataset(dataset);
    setIsLoadingFiles(true);
    try {
      const res = await datasetApi.getDatasetBySlugOrId(dataset.id);
      if (res.data && res.data.success) {
        setDatasetFiles(res.data.files || []);
      }
    } catch (err) {
      addToast('Error', 'Could not load dataset files.', 'error');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Create Dataset Handler
  const handleCreateDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDatasetName.trim()) {
      addToast('Validation', 'Please enter a dataset name.', 'warning');
      return;
    }

    setIsCreating(true);
    try {
      const res = await datasetApi.createDataset({
        name: newDatasetName.trim(),
        description: newDatasetDesc.trim(),
        language: newDatasetLang.trim(),
      });

      if (res.data && res.data.success) {
        addToast('Success', 'Dataset created successfully with Google Drive structure!', 'success');
        setNewDatasetName('');
        setNewDatasetDesc('');
        setIsCreateModalOpen(false);
        await loadDatasets();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to create dataset.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Create Custom Folder Handler
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !selectedDataset) return;

    setIsCreatingFolder(true);
    try {
      const res = await datasetApi.createFolder(selectedDataset.id, { folderName: newFolderName.trim() });
      if (res.data && res.data.success) {
        addToast('Success', `Folder "${newFolderName}" created!`, 'success');
        setNewFolderName('');
        setIsFolderModalOpen(false);
      }
    } catch (err: any) {
      addToast('Error', 'Failed to create folder.', 'error');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Handle Selected Files for Upload
  const processSelectedFiles = (filesList: FileList | File[]) => {
    const filesArray = Array.from(filesList);
    if (filesArray.length === 0) return;

    const newTasks: UploadTask[] = filesArray.map((file) => {
      const catInfo = detectFileType(file.name, file.type);
      return {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        type: catInfo.category,
        mimeType: file.type || 'application/octet-stream',
        progress: 0,
        status: 'queued',
      };
    });

    setUploadQueue((prev) => [...prev, ...newTasks]);
  };

  // Execute Upload Queue
  useEffect(() => {
    if (!selectedDataset || uploadQueue.length === 0 || isUploadingQueue) return;

    const queuedTask = uploadQueue.find((t) => t.status === 'queued');
    if (!queuedTask) return;

    const uploadSingleTask = async (task: UploadTask) => {
      setIsUploadingQueue(true);
      setUploadQueue((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'uploading', progress: 20 } : t)));

      try {
        // Read file as Base64 string
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const resStr = reader.result as string;
            const b64 = resStr.split(',')[1] || resStr;
            resolve(b64);
          };
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(task.file);
        });

        const CHUNK_SIZE = 3 * 1024 * 1024; // 3 MB base64 chunks
        if (base64Data.length > CHUNK_SIZE) {
          const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
          const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          let lastRes: any = null;

          for (let i = 0; i < totalChunks; i++) {
            const chunkData = base64Data.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            const chunkProgress = Math.round(((i + 1) / totalChunks) * 95);

            setUploadQueue((prev) =>
              prev.map((t) => (t.id === task.id ? { ...t, progress: chunkProgress } : t))
            );

            lastRes = await datasetApi.uploadChunk(selectedDataset.id, {
              uploadId,
              chunkIndex: i,
              totalChunks,
              fileName: task.name,
              fileType: task.type,
              mimeType: task.mimeType,
              fileSize: task.size,
              chunkData,
            });
          }

          if (lastRes?.data && lastRes.data.success) {
            const uploadedFileRecord = lastRes.data.file;
            setUploadQueue((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'completed', progress: 100 } : t)));
            setDatasetFiles((prev) => [uploadedFileRecord, ...prev]);

            setSelectedDataset((prev) =>
              prev
                ? {
                    ...prev,
                    total_files: prev.total_files + 1,
                    total_size_bytes: prev.total_size_bytes + task.size,
                  }
                : null
            );
          } else {
            throw new Error(lastRes?.data?.message || 'Chunked upload failed');
          }
        } else {
          setUploadQueue((prev) => prev.map((t) => (t.id === task.id ? { ...t, progress: 60 } : t)));

          const res = await datasetApi.uploadFile(selectedDataset.id, {
            fileName: task.name,
            fileType: task.type,
            mimeType: task.mimeType,
            fileSize: task.size,
            base64Data,
          });

          if (res.data && res.data.success) {
            const uploadedFileRecord = res.data.file;
            setUploadQueue((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'completed', progress: 100 } : t)));
            setDatasetFiles((prev) => [uploadedFileRecord, ...prev]);

            setSelectedDataset((prev) =>
              prev
                ? {
                    ...prev,
                    total_files: prev.total_files + 1,
                    total_size_bytes: prev.total_size_bytes + task.size,
                  }
                : null
            );
          } else {
            throw new Error(res.data?.message || 'Upload failed');
          }
        }
      } catch (err: any) {
        setUploadQueue((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'failed', error: err.message || 'Upload error' } : t))
        );
      } finally {
        setIsUploadingQueue(false);
      }
    };

    uploadSingleTask(queuedTask);
  }, [uploadQueue, isUploadingQueue, selectedDataset]);

  // File Deletion Handler
  const handleDeleteFile = (fileId: string, fileName: string) => {
    showConfirm(
      'Delete File',
      `Are you sure you want to delete "${fileName}"? This will move the file to trash on Google Drive and delete its database index.`,
      async () => {
        try {
          const res = await datasetApi.deleteFile(fileId);
          if (res.data && res.data.success) {
            addToast('Deleted', `File "${fileName}" deleted successfully.`, 'info');
            setDatasetFiles((prev) => prev.filter((f) => f.id !== fileId));
            setSelectedDataset((prev) => (prev ? { ...prev, total_files: Math.max(0, prev.total_files - 1) } : null));
          }
        } catch (err) {
          addToast('Error', 'Failed to delete file.', 'error');
        }
      }
    );
  };

  // Overall Statistics computation
  const stats = useMemo(() => {
    const totalDatasetsCount = datasets.length;
    const totalFilesCount = datasets.reduce((acc, curr) => acc + (curr.total_files || 0), 0);
    const totalSizeBytes = datasets.reduce((acc, curr) => acc + (curr.total_size_bytes || 0), 0);
    return {
      totalDatasetsCount,
      totalFilesCount,
      totalSizeFormatted: formatFileSize(totalSizeBytes),
    };
  }, [datasets]);

  // Filtered Datasets for Dashboard
  const filteredDatasets = useMemo(() => {
    return datasets.filter((ds) => {
      const matchSearch =
        ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ds.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ds.language || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || ds.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [datasets, searchQuery, statusFilter]);

  // Category file counts for selected dataset
  const categoryCounts = useMemo(() => {
    const counts: Record<DatasetCategoryType | 'ALL', { count: number; size: number }> = {
      ALL: { count: datasetFiles.length, size: datasetFiles.reduce((a, b) => a + (b.file_size || 0), 0) },
      AUDIO: { count: 0, size: 0 },
      VIDEO: { count: 0, size: 0 },
      IMAGE: { count: 0, size: 0 },
      JSON: { count: 0, size: 0 },
      CSV: { count: 0, size: 0 },
      PDF: { count: 0, size: 0 },
      OTHER: { count: 0, size: 0 },
    };

    datasetFiles.forEach((f) => {
      const cat = f.file_type || 'OTHER';
      if (counts[cat]) {
        counts[cat].count += 1;
        counts[cat].size += f.file_size || 0;
      }
    });

    return counts;
  }, [datasetFiles]);

  // Filtered & Sorted Files in Dataset Detail
  const filteredFiles = useMemo(() => {
    let list = datasetFiles.filter((f) => {
      const matchCat = activeCategoryTab === 'ALL' || f.file_type === activeCategoryTab;
      const matchSearch = f.file_name.toLowerCase().includes(fileSearchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    if (fileSortBy === 'name') {
      list.sort((a, b) => a.file_name.localeCompare(b.file_name));
    } else if (fileSortBy === 'size') {
      list.sort((a, b) => b.file_size - a.file_size);
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return list;
  }, [datasetFiles, activeCategoryTab, fileSearchQuery, fileSortBy]);

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      {!selectedDataset ? (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight font-display flex items-center gap-2.5">
                <Folder className="w-7 h-7 text-cyan-400" />
                Datasets Dashboard
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Manage all your enterprise AI training datasets, categories, and Google Drive folder structures.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadDatasets}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                title="Refresh Datasets"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Dataset</span>
              </button>
            </div>
          </div>

          {/* TOP METRICS SUMMARY */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#090a0f] p-4 rounded-2xl border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Total Datasets</span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Folder className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-white mt-2">{stats.totalDatasetsCount}</p>
              <span className="text-[10px] text-emerald-400 font-mono mt-1 inline-block">Active Repositories</span>
            </div>

            <div className="bg-[#090a0f] p-4 rounded-2xl border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Total Files</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-white mt-2">{stats.totalFilesCount.toLocaleString()}</p>
              <span className="text-[10px] text-indigo-300 font-mono mt-1 inline-block">Indexed Records</span>
            </div>

            <div className="bg-[#090a0f] p-4 rounded-2xl border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Total Storage</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <HardDrive className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-white mt-2">{stats.totalSizeFormatted}</p>
              <span className="text-[10px] text-purple-300 font-mono mt-1 inline-block">Google Drive Storage</span>
            </div>

            <div className="bg-[#090a0f] p-4 rounded-2xl border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">File Types</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <FileCode className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-white mt-2">6 Categories</p>
              <span className="text-[10px] text-amber-300 font-mono mt-1 inline-block">Audio, Video, Image, JSON, CSV, PDF</span>
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#090a0f] p-3 rounded-2xl border border-white/10">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>

              <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* DATASETS GRID / LIST */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-44 bg-[#090a0f] rounded-2xl border border-white/5 animate-pulse p-5" />
              ))}
            </div>
          ) : filteredDatasets.length === 0 ? (
            <div className="bg-[#090a0f] border border-white/10 rounded-2xl p-12 text-center">
              <Folder className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">No datasets found</h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                Create your first dataset to automatically generate Google Drive folder structures and organize speech, video, image, JSON, CSV and PDF training data.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Dataset</span>
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDatasets.map((ds) => (
                <div
                  key={ds.id}
                  onClick={() => handleOpenDataset(ds)}
                  className="group bg-[#090a0f] hover:bg-slate-900/80 border border-white/10 hover:border-cyan-500/50 rounded-2xl p-5 transition-all cursor-pointer shadow-lg hover:shadow-cyan-500/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition-transform">
                        <Folder className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                        {ds.status || 'ACTIVE'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors font-display line-clamp-1">
                      {ds.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {ds.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-cyan-300 font-semibold">{ds.total_files || 0} Files</span>
                      <span>•</span>
                      <span>{formatFileSize(ds.total_size_bytes || 0)}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#090a0f] border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-900/50 text-[11px] font-mono uppercase text-slate-400">
                      <th className="p-4">Dataset Name</th>
                      <th className="p-4">Language</th>
                      <th className="p-4">Files</th>
                      <th className="p-4">Storage Size</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                    {filteredDatasets.map((ds) => (
                      <tr key={ds.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-semibold text-white flex items-center gap-3">
                          <Folder className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div>
                            <p className="font-bold text-white">{ds.name}</p>
                            <p className="text-[11px] text-slate-400 line-clamp-1">{ds.description}</p>
                          </div>
                        </td>
                        <td className="p-4 font-mono">{ds.language || 'Multilingual'}</td>
                        <td className="p-4 font-mono font-bold text-cyan-300">{ds.total_files || 0}</td>
                        <td className="p-4 font-mono">{formatFileSize(ds.total_size_bytes || 0)}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            {ds.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenDataset(ds)}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-mono transition-all cursor-pointer"
                          >
                            Open Dataset
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* SECTION: DATASET DETAIL VIEW */
        <div className="space-y-6">
          {/* TOP BREADCRUMB NAV */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <button
              onClick={() => setSelectedDataset(null)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs font-mono transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>Back to Datasets</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFolderModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>New Folder</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-500 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Files</span>
              </button>
            </div>
          </div>

          {/* DATASET TITLE & SUMMARY BAR */}
          <div className="bg-[#090a0f] p-5 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {selectedDataset.language || 'Multilingual'}
                </span>
                <span className="text-xs text-slate-400">ID: {selectedDataset.id}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1 font-display">{selectedDataset.name}</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">{selectedDataset.description || 'Enterprise AI Dataset'}</p>
            </div>

            <div className="flex items-center gap-4 bg-slate-900/60 p-3 rounded-xl border border-white/5 text-xs">
              <div>
                <p className="text-slate-400">Total Files</p>
                <p className="text-base font-bold text-white font-mono mt-0.5">{selectedDataset.total_files}</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-slate-400">Storage Size</p>
                <p className="text-base font-bold text-cyan-400 font-mono mt-0.5">{formatFileSize(selectedDataset.total_size_bytes)}</p>
              </div>
            </div>
          </div>

          {/* CATEGORIES STATS SWITCHER */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { type: 'AUDIO', label: 'AUDIO', icon: Volume2, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
              { type: 'VIDEO', label: 'VIDEO', icon: Video, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
              { type: 'IMAGE', label: 'IMAGE', icon: ImageIcon, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
              { type: 'JSON', label: 'JSON', icon: FileCode, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
              { type: 'CSV', label: 'CSV', icon: FileSpreadsheet, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
              { type: 'PDF', label: 'PDF', icon: FileText, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
            ].map((cat) => {
              const Icon = cat.icon;
              const catData = categoryCounts[cat.type as DatasetCategoryType];
              const isActive = activeCategoryTab === cat.type;
              return (
                <button
                  key={cat.type}
                  onClick={() => setActiveCategoryTab(isActive ? 'ALL' : (cat.type as DatasetCategoryType))}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isActive ? `${cat.bg} shadow-lg ring-1 ring-cyan-400` : 'bg-[#090a0f] border-white/10 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-4 h-4 ${cat.color}`} />
                    <span className="text-[10px] font-mono text-slate-400">{catData?.count || 0} files</span>
                  </div>
                  <p className="text-xs font-bold text-white mt-2">{cat.label}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{formatFileSize(catData?.size || 0)}</p>
                </button>
              );
            })}
          </div>

          {/* DRAG AND DROP UPLOAD DROPZONE */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files) {
                processSelectedFiles(e.dataTransfer.files);
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              isDragOver
                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                : 'border-white/15 bg-[#090a0f] hover:border-cyan-500/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) processSelectedFiles(e.target.files);
              }}
            />
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mx-auto flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Drag & drop files here</h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports Audio (.mp3, .wav), Video (.mp4), Image (.png, .jpg), JSON, CSV, and PDF.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-all cursor-pointer"
            >
              Select Files from Computer
            </button>
          </div>

          {/* UPLOAD QUEUE PROGRESS PANEL */}
          {uploadQueue.length > 0 && (
            <div className="bg-[#090a0f] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-cyan-400" />
                  Upload Queue ({uploadQueue.filter((t) => t.status === 'completed').length}/{uploadQueue.length} completed)
                </span>
                <button
                  onClick={() => setUploadQueue([])}
                  className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Clear Queue
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {uploadQueue.map((task) => (
                  <div key={task.id} className="flex items-center justify-between text-xs bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2.5 truncate max-w-md">
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        {task.type}
                      </span>
                      <span className="font-medium text-slate-200 truncate">{task.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({formatFileSize(task.size)})</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {task.status === 'completed' && (
                        <span className="text-emerald-400 text-[11px] font-mono flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                      {task.status === 'uploading' && (
                        <span className="text-cyan-400 text-[11px] font-mono flex items-center gap-1 animate-pulse">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {task.progress}%
                        </span>
                      )}
                      {task.status === 'queued' && <span className="text-slate-400 text-[11px] font-mono">Queued</span>}
                      {task.status === 'failed' && (
                        <span className="text-rose-400 text-[11px] font-mono flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FILES LIST TABLE */}
          <div className="bg-[#090a0f] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Files ({filteredFiles.length})</h3>
                {activeCategoryTab !== 'ALL' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    Category: {activeCategoryTab}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <select
                  value={fileSortBy}
                  onChange={(e: any) => setFileSortBy(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="latest">Sort: Latest</option>
                  <option value="name">Sort: Name</option>
                  <option value="size">Sort: Size</option>
                </select>
              </div>
            </div>

            {isLoadingFiles ? (
              <div className="p-8 text-center text-slate-400 text-xs font-mono">Loading files index...</div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No files uploaded in this category yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-900/50 text-[11px] font-mono uppercase text-slate-400">
                      <th className="p-4">File Name</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Size</th>
                      <th className="p-4">Uploaded</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                    {filteredFiles.map((file) => {
                      const catInfo = detectFileType(file.file_name, file.mime_type);
                      return (
                        <tr key={file.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 font-medium text-white flex items-center gap-3">
                            <span className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                              <FileText className="w-4 h-4 text-cyan-400" />
                            </span>
                            <div>
                              <p className="font-bold text-white">{file.file_name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{file.mime_type || 'Unknown MIME'}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${catInfo.badgeBg}`}>
                              {catInfo.badgeText}
                            </span>
                          </td>
                          <td className="p-4 font-mono">{formatFileSize(file.file_size)}</td>
                          <td className="p-4 text-slate-400 text-[11px]">{new Date(file.created_at).toLocaleDateString()}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {file.drive_url && (
                                <button
                                  onClick={() => {
                                    const url = file.drive_url;
                                    if (!url) return;
                                    if (url.startsWith('data:') || url.startsWith('blob:')) {
                                      const win = window.open();
                                      if (win) {
                                        win.document.write(`<div style="background:#050505;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;"><img src="${url}" style="max-width:100%;max-height:90vh;border-radius:12px;" /></div>`);
                                      }
                                    } else {
                                      const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
                                      if (fileIdMatch && fileIdMatch[1]) {
                                        window.open(`https://drive.google.com/file/d/${fileIdMatch[1]}/view`, '_blank');
                                      } else {
                                        window.open(url, '_blank');
                                      }
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-cyan-400 border border-slate-800 transition-colors cursor-pointer"
                                  title="View file"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteFile(file.id, file.file_name)}
                                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
                                title="Delete file"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE DATASET MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090a0f] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Create New Dataset
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDataset} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Dataset Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Odia Speech Dataset"
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Language</label>
                <input
                  type="text"
                  placeholder="e.g. Odia, Hindi, Multilingual"
                  value={newDatasetLang}
                  onChange={(e) => setNewDatasetLang(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Short description of the training dataset content..."
                  value={newDatasetDesc}
                  onChange={(e) => setNewDatasetDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isCreating ? 'Creating Drive Folder...' : 'Create Dataset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CUSTOM FOLDER MODAL */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090a0f] border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Create Custom Folder</h3>
              <button onClick={() => setIsFolderModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Folder Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Training, Validation"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-bold text-xs disabled:opacity-50"
                >
                  {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
