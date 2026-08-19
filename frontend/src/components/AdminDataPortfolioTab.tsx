import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FolderPlus,
  Upload,
  Search,
  Trash2,
  Eye,
  FileText,
  Volume2,
  Video,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Folder,
  FileUp,
  Link as LinkIcon,
} from 'lucide-react';
import { datasetApi } from '../services/api';
import { detectFileType, formatFileSize, DatasetCategoryType } from '../utils/fileTypeDetector';

interface AdminDataPortfolioTabProps {
  addToast: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

interface DatasetItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  language?: string;
  total_files: number;
  total_size_bytes: number;
  drive_folder_id?: string;
  status: string;
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

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetDesc, setNewDatasetDesc] = useState('');
  const [newDatasetLang, setNewDatasetLang] = useState('Multilingual');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingDataset, setIsCreatingDataset] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Link Upload Modal State
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlFileName, setUrlFileName] = useState('');
  const [urlCategory, setUrlCategory] = useState<DatasetCategoryType>('VIDEO');
  const [urlLink, setUrlLink] = useState('');
  const [urlFileSizeText, setUrlFileSizeText] = useState('50 MB');
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  // File Upload Queue state
  const [uploadQueue, setUploadQueue] = useState<UploadTask[]>([]);
  const [isUploadingQueue, setIsUploadingQueue] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load Datasets List
  const fetchDatasets = async () => {
    setIsLoading(true);
    try {
      const res = await datasetApi.getDatasets({ search: searchQuery, status: statusFilter });
      if (res.data && res.data.success) {
        setDatasets(res.data.datasets || []);
      }
    } catch (err: any) {
      console.error('Fetch datasets error:', err);
      addToast('Error', 'Failed to fetch datasets.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, [searchQuery, statusFilter]);

  // Load Selected Dataset Files
  const fetchDatasetDetails = async (identifier: string) => {
    setIsLoadingFiles(true);
    try {
      const res = await datasetApi.getDatasetBySlugOrId(identifier);
      if (res.data && res.data.success) {
        setSelectedDataset(res.data.dataset);
        setDatasetFiles(res.data.files || []);
      }
    } catch (err: any) {
      addToast('Error', 'Failed to load dataset details.', 'error');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Create New Dataset
  const handleCreateDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDatasetName.trim()) return;

    setIsCreatingDataset(true);
    try {
      const res = await datasetApi.createDataset({
        name: newDatasetName.trim(),
        description: newDatasetDesc.trim(),
        language: newDatasetLang.trim(),
      });

      if (res.data && res.data.success) {
        addToast('Success', `Dataset "${newDatasetName}" created!`, 'success');
        setNewDatasetName('');
        setNewDatasetDesc('');
        setIsCreateModalOpen(false);
        fetchDatasets();
        if (res.data.dataset) {
          setSelectedDataset(res.data.dataset);
          setDatasetFiles([]);
        }
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to create dataset.', 'error');
    } finally {
      setIsCreatingDataset(false);
    }
  };

  // Create Custom Folder
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

  // Handle Add File via Link
  const handleAddUrlFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDataset || !urlFileName.trim() || !urlLink.trim()) {
      addToast('Error', 'Please provide a file name and valid link.', 'error');
      return;
    }

    setIsSubmittingUrl(true);
    try {
      let sizeBytes = 10 * 1024 * 1024;
      const numMatch = urlFileSizeText.match(/([\d.]+)/);
      if (numMatch && numMatch[1]) {
        const val = parseFloat(numMatch[1]);
        if (urlFileSizeText.toUpperCase().includes('GB')) sizeBytes = val * 1024 * 1024 * 1024;
        else if (urlFileSizeText.toUpperCase().includes('MB')) sizeBytes = val * 1024 * 1024;
        else if (urlFileSizeText.toUpperCase().includes('KB')) sizeBytes = val * 1024;
        else sizeBytes = val;
      }

      const res = await datasetApi.uploadFile(selectedDataset.id, {
        fileName: urlFileName.trim(),
        fileType: urlCategory,
        mimeType: urlCategory === 'VIDEO' ? 'video/mp4' : urlCategory === 'AUDIO' ? 'audio/wav' : 'application/octet-stream',
        fileSize: Math.round(sizeBytes),
        driveUrl: urlLink.trim(),
      });

      if (res.data && res.data.success) {
        addToast('Success', `File "${urlFileName}" added via Google Drive link!`, 'success');
        setDatasetFiles((prev) => [res.data.file, ...prev]);
        setSelectedDataset((prev) =>
          prev
            ? {
                ...prev,
                total_files: prev.total_files + 1,
                total_size_bytes: prev.total_size_bytes + Math.round(sizeBytes),
              }
            : null
        );
        setIsUrlModalOpen(false);
        setUrlFileName('');
        setUrlLink('');
      } else {
        throw new Error(res.data?.message || 'Failed to add link');
      }
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to add file link.', 'error');
    } finally {
      setIsSubmittingUrl(false);
    }
  };

  // Auto-fetch file metadata from Google Drive link
  const handleLinkUrlChange = async (url: string) => {
    setUrlLink(url);
    if (!url || !url.includes('drive.google.com')) return;

    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (!fileIdMatch || !fileIdMatch[1]) return;

    setIsFetchingMetadata(true);
    try {
      const res = await datasetApi.fetchLinkMetadata(url);
      if (res.data && res.data.success) {
        if (res.data.fileName) {
          setUrlFileName(res.data.fileName);
        }
        if (res.data.fileType) {
          setUrlCategory(res.data.fileType as DatasetCategoryType);
        }
        if (res.data.fileSize) {
          setUrlFileSizeText(formatFileSize(res.data.fileSize));
        }
      }
    } catch (err) {
      console.warn('Metadata auto-fetch notice:', err);
    } finally {
      setIsFetchingMetadata(false);
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

        const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB base64 chunks
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
            addToast('Success', `File "${fileName}" deleted.`, 'success');
            setDatasetFiles((prev) => prev.filter((f) => f.id !== fileId));
            if (selectedDataset) {
              const target = datasetFiles.find((f) => f.id === fileId);
              const sz = target ? target.file_size : 0;
              setSelectedDataset({
                ...selectedDataset,
                total_files: Math.max(0, selectedDataset.total_files - 1),
                total_size_bytes: Math.max(0, selectedDataset.total_size_bytes - sz),
              });
            }
          }
        } catch (err: any) {
          addToast('Error', 'Failed to delete file.', 'error');
        }
      }
    );
  };

  // Dataset Deletion Handler
  const handleDeleteDataset = (datasetId: string, datasetName: string) => {
    showConfirm(
      'Delete Dataset',
      `Are you sure you want to delete dataset "${datasetName}"? This will permanently delete all associated Google Drive folders and database indexes.`,
      async () => {
        try {
          const res = await datasetApi.deleteDataset(datasetId);
          if (res.data && res.data.success) {
            addToast('Success', `Dataset "${datasetName}" deleted.`, 'success');
            if (selectedDataset?.id === datasetId) {
              setSelectedDataset(null);
            }
            fetchDatasets();
          }
        } catch (err: any) {
          addToast('Error', 'Failed to delete dataset.', 'error');
        }
      }
    );
  };

  // Compute Statistics per category
  const categoryCounts = useMemo(() => {
    const counts: Record<DatasetCategoryType, { count: number; size: number }> = {
      AUDIO: { count: 0, size: 0 },
      VIDEO: { count: 0, size: 0 },
      IMAGE: { count: 0, size: 0 },
      JSON: { count: 0, size: 0 },
      CSV: { count: 0, size: 0 },
      PDF: { count: 0, size: 0 },
      OTHER: { count: 0, size: 0 },
    };

    datasetFiles.forEach((file) => {
      const type = file.file_type || 'AUDIO';
      if (counts[type]) {
        counts[type].count += 1;
        counts[type].size += file.file_size;
      }
    });

    return counts;
  }, [datasetFiles]);

  // Filtered files inside selected dataset
  const filteredFiles = useMemo(() => {
    let list = datasetFiles.filter((f) => {
      const matchCat = activeCategoryTab === 'ALL' || f.file_type === activeCategoryTab;
      const matchQuery = f.file_name.toLowerCase().includes(fileSearchQuery.toLowerCase());
      return matchCat && matchQuery;
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
      {/* TOP ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#090a0f] p-6 rounded-3xl border border-white/10 shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Folder className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white font-display">AI Data Portfolio & Datasets</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise multilingual speech, video, image, JSON, CSV & PDF AI training dataset catalog.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedDataset && (
            <button
              onClick={() => setSelectedDataset(null)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>← Back to Catalog</span>
            </button>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Dataset</span>
          </button>
        </div>
      </div>

      {!selectedDataset ? (
        /* CATALOG DATASET LIST VIEW */
        <div className="space-y-6">
          {/* SEARCH & FILTERS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#090a0f] p-4 rounded-2xl border border-white/10">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">Status: All</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* DATASETS GRID */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-44 bg-[#090a0f] border border-white/10 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : datasets.length === 0 ? (
            <div className="bg-[#090a0f] border border-white/10 rounded-3xl p-12 text-center space-y-4">
              <Folder className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No AI Datasets Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create your first speech or text AI training dataset to start organizing audio, video, image, and JSON files.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Dataset</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {datasets.map((ds) => (
                <div
                  key={ds.id}
                  className="bg-[#090a0f] border border-white/10 hover:border-cyan-500/40 rounded-3xl p-5 space-y-4 transition-all group relative shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold uppercase">
                      {ds.language || 'Multilingual'}
                    </span>
                    <button
                      onClick={() => handleDeleteDataset(ds.id, ds.name)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      title="Delete dataset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors font-display line-clamp-1">
                      {ds.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {ds.description || 'Enterprise AI training dataset.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <p className="text-slate-400 font-mono text-[11px]">{ds.total_files} files</p>
                      <p className="text-cyan-400 font-mono font-bold text-xs">{formatFileSize(ds.total_size_bytes)}</p>
                    </div>

                    <button
                      onClick={() => fetchDatasetDetails(ds.slug || ds.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 group-hover:bg-cyan-500/20 text-slate-300 group-hover:text-cyan-300 border border-slate-800 group-hover:border-cyan-500/30 text-xs font-mono inline-flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Manage</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* SELECTED DATASET FILE MANAGEMENT VIEW */
        <div className="space-y-6">
          {/* DATASET HEADER SUMMARY */}
          <div className="bg-[#090a0f] border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-400">{selectedDataset.language || 'Multilingual'}</span>
                <span className="text-slate-600">•</span>
                <span className="text-xs font-mono text-slate-400">ID: {selectedDataset.slug}</span>
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

          {/* UPLOAD SECTIONS: DROPZONE + DRIVE LINK BUTTON */}
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
            <h3 className="text-base font-bold text-white">Upload Files to Dataset</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
              Direct computer upload or paste Google Drive public links for video and large datasets.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-all cursor-pointer"
              >
                Select Files from Computer
              </button>

              <button
                onClick={() => setIsUrlModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
              >
                <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Add via Google Drive Link / URL</span>
              </button>
            </div>
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

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {uploadQueue.map((task) => (
                  <div key={task.id} className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate max-w-md">
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {task.type}
                        </span>
                        <span className="text-white font-medium truncate">{task.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({formatFileSize(task.size)})</span>
                      </div>

                      {task.status === 'completed' && <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>}
                      {task.status === 'failed' && <span className="text-[11px] font-mono text-rose-400">Failed</span>}
                      {task.status === 'uploading' && <span className="text-[11px] font-mono text-cyan-400 animate-pulse">{task.progress}%</span>}
                      {task.status === 'queued' && <span className="text-[11px] font-mono text-slate-400">Queued</span>}
                    </div>

                    {task.status === 'uploading' && (
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-cyan-400 h-full transition-all duration-300" style={{ width: `${task.progress}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FILES INDEX TABLE */}
          <div className="bg-[#090a0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl space-y-4">
            <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase">Files ({filteredFiles.length})</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-60">
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
          <div className="bg-[#090a0f] border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white font-display">Create New AI Dataset</h3>
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
                  placeholder="e.g. Odia Speech Recognition Corpus"
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Language</label>
                <input
                  type="text"
                  placeholder="e.g. Odia, Hindi, Multilingual"
                  value={newDatasetLang}
                  onChange={(e) => setNewDatasetLang(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe dataset domain, audio hours, or sample rate..."
                  value={newDatasetDesc}
                  onChange={(e) => setNewDatasetDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDataset}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {isCreatingDataset ? 'Creating...' : 'Create Dataset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD VIA GOOGLE DRIVE LINK MODAL */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090a0f] border border-white/10 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-white font-display">Add File via Google Drive Link</h3>
              </div>
              <button onClick={() => setIsUrlModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUrlFile} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">File Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clothing_lacha_Amroha_244235.mp4"
                  value={urlFileName}
                  onChange={(e) => setUrlFileName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Category *</label>
                  <select
                    value={urlCategory}
                    onChange={(e: any) => setUrlCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="VIDEO">VIDEO</option>
                    <option value="AUDIO">AUDIO</option>
                    <option value="IMAGE">IMAGE</option>
                    <option value="JSON">JSON</option>
                    <option value="CSV">CSV</option>
                    <option value="PDF">PDF</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Approx. File Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 58.5 MB"
                    value={urlFileSizeText}
                    onChange={(e) => setUrlFileSizeText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1 flex items-center justify-between">
                  <span>Google Drive Link / Public File URL *</span>
                  {isFetchingMetadata && (
                    <span className="text-[10px] text-cyan-400 font-mono animate-pulse">⚡ Auto-detecting file size & details...</span>
                  )}
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/file/d/1qIS832Ixs5Q_QoNW_0Gh0uT6jIHzleIa/view"
                  value={urlLink}
                  onChange={(e) => handleLinkUrlChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Tip: Paste your Google Drive link to automatically detect file name, size, and category!
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUrl}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingUrl ? 'Adding...' : 'Add File Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
