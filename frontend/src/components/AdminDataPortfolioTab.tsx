import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
  Star,
  Edit,
  Trash2,
  Upload,
  Cloud,
  FileText,
  Music,
  Video as VideoIcon,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  HelpCircle,
  Folder,
  Globe,
  Layers,
  Info,
  ExternalLink,
} from 'lucide-react';
import {
  DatasetItem,
  DatasetCategory,
  DatasetLanguage,
  getAllDatasetsAdmin,
  saveDatasetToApi,
  toggleDatasetVisibility,
  toggleDatasetFeatured,
  deleteDatasetFromApi,
} from '../lib/dataPortfolioStore';
import { uploadImageToCloudinary } from '../lib/adminStore';
import { uploadDatasetFile, deleteDatasetFile } from '../lib/datasetStorage';

interface AdminDataPortfolioTabProps {
  addToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, opts?: { confirmText?: string; cancelText?: string; intent?: 'danger' | 'warning' | 'info' }) => void;
}

const CATEGORIES: DatasetCategory[] = [
  'Audio',
  'Video',
  'Image',
  'JSON',
  'CSV',
  'Transcription',
  'Annotation',
  'Other',
];

const LANGUAGES: DatasetLanguage[] = [
  'Odia',
  'Hindi',
  'English',
  'Bengali',
  'Telugu',
  'Tamil',
  'Other',
];

export const AdminDataPortfolioTab: React.FC<AdminDataPortfolioTabProps> = ({ addToast, showConfirm }) => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DatasetItem | null>(null);
  const [previewItem, setPreviewItem] = useState<DatasetItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<DatasetCategory>('Audio');
  const [formLanguage, setFormLanguage] = useState<string>('Odia');
  const [formFormat, setFormFormat] = useState('');
  const [formFileName, setFormFileName] = useState('');
  const [formSampleCount, setFormSampleCount] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formResolution, setFormResolution] = useState('');
  const [formUseCase, setFormUseCase] = useState('');
  const [formQualityInfo, setFormQualityInfo] = useState('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [formStorageFileId, setFormStorageFileId] = useState('');
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);

  // Google Drive File Upload State
  const [selectedDriveFile, setSelectedDriveFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'processing' | 'saving' | 'success' | 'error'>('idle');
  const [uploadStageText, setUploadStageText] = useState('');
  const [isReplacingFile, setIsReplacingFile] = useState(false);

  const loadDatasets = async () => {
    setIsLoading(true);
    try {
      const data = await getAllDatasetsAdmin();
      setDatasets(data);
    } catch (err: any) {
      addToast('Error loading datasets', err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Audio');
    setFormLanguage('Odia');
    setFormFormat('');
    setFormFileName('');
    setFormSampleCount('');
    setFormDuration('');
    setFormResolution('');
    setFormUseCase('');
    setFormQualityInfo('');
    setFormThumbnailUrl('');
    setFormFileUrl('');
    setFormStorageFileId('');
    setFormIsPublic(true);
    setFormIsFeatured(false);
    setSelectedDriveFile(null);
    setUploadProgress(0);
    setUploadStage('idle');
    setUploadStageText('');
    setIsReplacingFile(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item: DatasetItem) => {
    setEditingItem(item);
    setFormTitle(item.title || '');
    setFormDescription(item.description || '');
    setFormCategory(item.category || 'Audio');
    setFormLanguage(item.language || 'Odia');
    setFormFormat(item.format || '');
    setFormFileName(item.file_name || '');
    setFormSampleCount(item.sample_count || '');
    setFormDuration(item.duration || '');
    setFormResolution(item.resolution || '');
    setFormUseCase(item.use_case || '');
    setFormQualityInfo(item.quality_info || '');
    setFormThumbnailUrl(item.thumbnail_url || '');
    setFormFileUrl(item.file_url || '');
    setFormStorageFileId(item.storage_file_id || '');
    setFormIsPublic(item.is_public ?? true);
    setFormIsFeatured(item.is_featured ?? false);
    setSelectedDriveFile(null);
    setUploadProgress(0);
    setUploadStage('idle');
    setUploadStageText('');
    setIsReplacingFile(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast('Validation Error', 'Dataset Name is required.', 'warning');
      return;
    }

    setIsSaving(true);
    setUploadStageText('');

    let finalStorageFileId = formStorageFileId;
    let finalFileUrl = formFileUrl;
    let finalFileName = formFileName;

    // Case 1: Uploading a new file to Google Drive
    if (selectedDriveFile && (!editingItem || isReplacingFile)) {
      setUploadStage('uploading');
      setUploadProgress(0);
      setUploadStageText('Uploading dataset file to Google Drive...');

      const uploadResult = await uploadDatasetFile(selectedDriveFile, formCategory, (percent) => {
        setUploadProgress(percent);
        if (percent === 100) {
          setUploadStage('processing');
          setUploadStageText('Configuring Google Drive public permissions & folder structure...');
        }
      });

      if (!uploadResult.success) {
        setUploadStage('error');
        setUploadStageText(uploadResult.message || 'Google Drive upload failed.');
        addToast('Drive Upload Failed', uploadResult.message, 'error');
        setIsSaving(false);
        return;
      }

      finalStorageFileId = uploadResult.storageFileId || '';
      finalFileUrl = uploadResult.fileUrl || finalFileUrl;
      finalFileName = uploadResult.fileName || selectedDriveFile.name;

      // Automatically populate format if empty
      if (!formFormat && selectedDriveFile.name) {
        const ext = selectedDriveFile.name.split('.').pop()?.toUpperCase();
        if (ext) setFormFormat(ext);
      }
    }

    // Case 2: Save Metadata to Supabase
    setUploadStage('saving');
    setUploadStageText('Saving dataset metadata to Supabase...');

    try {
      const payload: Partial<DatasetItem> = {
        id: editingItem ? editingItem.id : undefined,
        title: formTitle.trim(),
        description: formDescription.trim(),
        category: formCategory,
        language: formLanguage.trim() || 'Odia',
        format: formFormat.trim(),
        file_name: finalFileName,
        storage_provider: 'google_drive',
        storage_file_id: finalStorageFileId,
        file_url: finalFileUrl.trim(),
        thumbnail_url: formThumbnailUrl.trim(),
        sample_count: formSampleCount.trim(),
        duration: formDuration.trim(),
        resolution: formResolution.trim(),
        use_case: formUseCase.trim(),
        quality_info: formQualityInfo.trim(),
        is_public: formIsPublic,
        is_featured: formIsFeatured,
      };

      const updated = await saveDatasetToApi(payload);

      // If replacing file during edit, trash old Google Drive file now
      if (editingItem && isReplacingFile && editingItem.storage_file_id && editingItem.storage_file_id !== finalStorageFileId) {
        try {
          await deleteDatasetFile(editingItem.storage_file_id);
        } catch (oldDelErr: any) {
          console.warn('[Note] Could not trash old Google Drive file:', oldDelErr.message);
        }
      }

      setDatasets(updated);
      setUploadStage('success');
      setUploadStageText('Dataset saved successfully!');
      setIsModalOpen(false);

      addToast(
        editingItem ? 'Dataset Updated' : 'Dataset Created',
        `"${formTitle}" saved successfully to Google Drive & Supabase.`,
        'success'
      );
    } catch (err: any) {
      setUploadStage('error');
      setUploadStageText(err.message || 'Supabase save error');
      addToast('Save Failed', err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisibility = async (item: DatasetItem) => {
    try {
      const nextStatus = !item.is_public;
      const updated = await toggleDatasetVisibility(item.id, nextStatus);
      setDatasets(updated);
      addToast(
        'Visibility Updated',
        `Dataset "${item.title}" is now ${nextStatus ? 'Public' : 'Hidden'}.`,
        'info'
      );
    } catch (err: any) {
      addToast('Update Failed', err.message, 'error');
    }
  };

  const handleToggleFeatured = async (item: DatasetItem) => {
    try {
      const nextStatus = !item.is_featured;
      const updated = await toggleDatasetFeatured(item.id, nextStatus);
      setDatasets(updated);
      addToast(
        'Featured Status Updated',
        `Dataset "${item.title}" ${nextStatus ? 'marked as Featured' : 'unfeatured'}.`,
        'info'
      );
    } catch (err: any) {
      addToast('Update Failed', err.message, 'error');
    }
  };

  const handleDelete = (item: DatasetItem) => {
    showConfirm(
      'Delete this dataset?',
      `Are you sure you want to delete dataset "${item.title}"? Associated Google Drive file will be moved to Trash before removing database metadata.`,
      async () => {
        try {
          const updated = await deleteDatasetFromApi(item.id, item.storage_file_id);
          setDatasets(updated);
          addToast('Dataset Deleted', `Dataset "${item.title}" and Google Drive file deleted.`, 'success');
        } catch (err: any) {
          addToast('Delete Failed', err.message, 'error');
        }
      },
      { confirmText: 'Delete Dataset & Drive File', intent: 'danger' }
    );
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingThumbnail(true);
    try {
      const url = await uploadImageToCloudinary(file, 'zenemoo/datasets');
      if (url) {
        setFormThumbnailUrl(url);
        addToast('Thumbnail Uploaded', 'Cover image uploaded to Cloudinary.', 'success');
      }
    } catch (err: any) {
      addToast('Upload Failed', err.message || 'Could not upload thumbnail.', 'error');
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const total = datasets.length;
    const publicCount = datasets.filter((d) => d.is_public).length;
    const hiddenCount = datasets.filter((d) => !d.is_public).length;
    const featuredCount = datasets.filter((d) => d.is_featured).length;

    const categoryCounts: Record<string, number> = {};
    CATEGORIES.forEach((c) => (categoryCounts[c] = 0));
    datasets.forEach((d) => {
      if (categoryCounts[d.category] !== undefined) {
        categoryCounts[d.category]++;
      } else {
        categoryCounts['Other'] = (categoryCounts['Other'] || 0) + 1;
      }
    });

    return { total, publicCount, hiddenCount, featuredCount, categoryCounts };
  }, [datasets]);

  // Filtered Datasets
  const filteredDatasets = useMemo(() => {
    return datasets.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.language && item.language.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.format && item.format.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [datasets, searchQuery, selectedCategory]);

  return (
    <div className="space-y-8">
      {/* Header Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-[#0a0f1d] to-slate-900/90 p-6 rounded-3xl border border-cyan-500/20 backdrop-blur-xl shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white font-display flex items-center gap-2">
                AI Data Portfolio
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono">
                  Metadata Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage showcase datasets, language corpora, speech models, and multi-modal training metadata.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Dataset</span>
        </button>
      </div>

      {/* Metrics Counter Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md">
          <span className="text-xs font-medium text-slate-400">Total Datasets</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono">{metrics.total}</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
        </div>

        <div className="bg-slate-900/70 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md">
          <span className="text-xs font-medium text-emerald-400/80">Public Datasets</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-400 font-mono">{metrics.publicCount}</span>
            <Eye className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        <div className="bg-slate-900/70 border border-amber-500/20 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md">
          <span className="text-xs font-medium text-amber-400/80">Hidden Datasets</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-400 font-mono">{metrics.hiddenCount}</span>
            <EyeOff className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        <div className="bg-slate-900/70 border border-purple-500/20 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md">
          <span className="text-xs font-medium text-purple-400/80">Featured Datasets</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-purple-400 font-mono">{metrics.featuredCount}</span>
            <Star className="w-4 h-4 text-purple-400 fill-purple-400/20" />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-2 lg:col-span-1 bg-slate-900/70 border border-white/10 rounded-2xl p-4 flex flex-col justify-between backdrop-blur-md">
          <span className="text-xs font-medium text-slate-400">Audio / Video / JSON</span>
          <div className="mt-2 flex items-center gap-2 text-xs font-mono text-cyan-300">
            <span>🔊 {metrics.categoryCounts['Audio'] || 0}</span>
            <span>🎥 {metrics.categoryCounts['Video'] || 0}</span>
            <span>📄 {metrics.categoryCounts['JSON'] || 0}</span>
          </div>
        </div>
      </div>

      {/* Category Pills & Search Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search datasets by name, language, format..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Refresh Data */}
          <button
            onClick={loadDatasets}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Refresh</span>
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                : 'bg-slate-900 border border-white/10 text-slate-300 hover:border-cyan-500/30'
            }`}
          >
            All Categories ({datasets.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = metrics.categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 border border-white/10 text-slate-300 hover:border-cyan-500/30'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Dataset Table & Card View */}
      {isLoading ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-white/10 backdrop-blur-md space-y-3">
          <div className="w-8 h-8 mx-auto border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-mono">Loading dataset portfolio metadata...</p>
        </div>
      ) : filteredDatasets.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-white/10 backdrop-blur-md space-y-3">
          <Database className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Datasets Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery || selectedCategory !== 'All'
              ? 'No dataset matching your search or category filter.'
              : 'No dataset metadata has been added yet. Click "Add New Dataset" to create your first entry.'}
          </p>
          {(searchQuery || selectedCategory !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="text-xs text-cyan-400 hover:underline font-mono"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-xs font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Dataset Name</th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4">Language</th>
                <th className="py-4 px-4">Format & Stats</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4 text-center">Featured</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {filteredDatasets.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                  {/* Name & Thumbnail */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.thumbnail_url ? (
                          <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <Database className="w-5 h-5 text-cyan-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="text-xs text-slate-400 line-clamp-1 max-w-xs">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                      {item.category}
                    </span>
                  </td>

                  {/* Language */}
                  <td className="py-4 px-4">
                    <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-md border border-white/10">
                      {item.language}
                    </span>
                  </td>

                  {/* Format & Stats */}
                  <td className="py-4 px-4">
                    <div className="text-xs space-y-0.5">
                      <div className="text-slate-200 font-mono font-medium">{item.format || 'N/A'}</div>
                      <div className="text-slate-400 text-[11px]">
                        {[item.sample_count, item.duration].filter(Boolean).join(' • ') || 'No size stats'}
                      </div>
                    </div>
                  </td>

                  {/* Public Status */}
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => handleToggleVisibility(item)}
                      title={item.is_public ? 'Click to hide' : 'Click to make public'}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                        item.is_public
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                      {item.is_public ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{item.is_public ? 'Public' : 'Hidden'}</span>
                    </button>
                  </td>

                  {/* Featured Status */}
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => handleToggleFeatured(item)}
                      title={item.is_featured ? 'Click to unfeature' : 'Click to feature'}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        item.is_featured
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                          : 'bg-slate-800/50 border-white/10 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${item.is_featured ? 'fill-purple-400 text-purple-400' : ''}`} />
                    </button>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="View Sample Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                        title="Edit Dataset Metadata"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                        title="Delete Metadata"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Dataset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-[#0d1424] to-slate-900">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                {editingItem ? 'Edit Dataset Metadata' : 'Add New Dataset'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Form Row 1: Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Dataset Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Odia Speech Corpus"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as DatasetCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form Row 2: Language & Format */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Language <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Format</label>
                  <input
                    type="text"
                    placeholder="e.g. WAV 24kHz / JSON / PNG"
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  placeholder="Detailed dataset overview, speaker demographics, dialect info, source context..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 resize-y"
                />
              </div>

              {/* Form Row 3: Stats (Sample Count, Duration, Resolution) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Sample Count</label>
                  <input
                    type="text"
                    placeholder="e.g. 1,200 Clips"
                    value={formSampleCount}
                    onChange={(e) => setFormSampleCount(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 20+ Hours"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Resolution</label>
                  <input
                    type="text"
                    placeholder="e.g. 300 DPI / 1080p"
                    value={formResolution}
                    onChange={(e) => setFormResolution(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Use Case & Quality Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Use Case</label>
                  <input
                    type="text"
                    placeholder="e.g. ASR, Voice Assistants, MT"
                    value={formUseCase}
                    onChange={(e) => setFormUseCase(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Quality Information</label>
                  <input
                    type="text"
                    placeholder="e.g. Human Reviewed (99%+ accuracy)"
                    value={formQualityInfo}
                    onChange={(e) => setFormQualityInfo(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Thumbnail URL & Cover Image */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Thumbnail Cover Image</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formThumbnailUrl}
                    onChange={(e) => setFormThumbnailUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
                  />
                  <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-medium cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingThumbnail ? 'Uploading...' : 'Upload Image'}</span>
                    <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Sample File URL (Optional preview link) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Sample Preview Media URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://... (Direct sample link for audio/video/image preview)"
                  value={formFileUrl}
                  onChange={(e) => setFormFileUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {/* Real Google Drive File Upload Interface */}
              <div className="p-4 rounded-2xl bg-[#091122] border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <Cloud className="w-4 h-4" />
                    <span>Google Drive Storage Integration</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    Auto-Folder: PUBLIC_SAMPLES / {formCategory.toUpperCase()}
                  </span>
                </div>

                {editingItem && !isReplacingFile ? (
                  <div className="p-3.5 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block text-[10px]">Current Google Drive File ID</span>
                      <span className="text-white font-mono text-xs">{formStorageFileId || 'No Drive File attached'}</span>
                      {formFileName && <span className="text-cyan-300 block text-[11px] font-mono">File: {formFileName}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReplacingFile(true)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold transition-all"
                    >
                      Replace File
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      Select File to Upload <span className="text-slate-400 font-normal">(MP3, WAV, MP4, PNG, JSON, CSV, PDF - Max 100MB)</span>
                    </label>

                    <div className="relative border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl p-4 text-center bg-slate-900/60 hover:bg-cyan-950/20 transition-all cursor-pointer group">
                      <input
                        type="file"
                        accept=".mp3,.wav,.m4a,.mp4,.mov,.webm,.jpg,.jpeg,.png,.webp,.json,.csv,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 100 * 1024 * 1024) {
                              addToast('File Too Large', `File size is ${(file.size / (1024 * 1024)).toFixed(2)}MB. Limit is 100MB.`, 'warning');
                              return;
                            }
                            setSelectedDriveFile(file);
                            if (!formFileName) setFormFileName(file.name);
                            if (!formFormat) {
                              const ext = file.name.split('.').pop()?.toUpperCase();
                              if (ext) setFormFormat(ext);
                            }
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />

                      <div className="flex flex-col items-center justify-center space-y-1.5">
                        <Upload className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
                        {selectedDriveFile ? (
                          <div className="text-xs font-mono">
                            <span className="text-cyan-300 font-bold block">{selectedDriveFile.name}</span>
                            <span className="text-slate-400 font-normal block">
                              {(selectedDriveFile.size / (1024 * 1024)).toFixed(2)} MB • Click to change file
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-300">
                            <span className="text-cyan-400 font-semibold underline">Click to choose dataset file</span> or drag & drop here
                          </div>
                        )}
                      </div>
                    </div>

                    {isReplacingFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsReplacingFile(false);
                          setSelectedDriveFile(null);
                        }}
                        className="text-[11px] text-slate-400 hover:text-white underline font-mono"
                      >
                        Cancel Replacing File
                      </button>
                    )}
                  </div>
                )}

                {/* Upload Progress Bar & Status Messages */}
                {uploadStage !== 'idle' && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-cyan-300 font-semibold">{uploadStageText}</span>
                      <span className="text-slate-300 font-bold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Toggles: Public & Featured */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 border border-white/10">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-200">
                  <input
                    type="checkbox"
                    checked={formIsPublic}
                    onChange={(e) => setFormIsPublic(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-900 border-white/20"
                  />
                  <span>Publicly Visible on /ai-data</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-purple-300">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-500 focus:ring-purple-400 bg-slate-900 border-white/20"
                  />
                  <span>Mark as Featured</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all"
                >
                  {isSaving ? 'Saving...' : editingItem ? 'Update Dataset' : 'Create Dataset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dataset Sample Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {previewItem.category} • {previewItem.language}
                </span>
                <h3 className="font-bold text-white text-base truncate max-w-xs">{previewItem.title}</h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {previewItem.description && (
                <p className="text-xs text-slate-300 leading-relaxed">{previewItem.description}</p>
              )}

              {/* Metadata Badges Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-800/60 p-3 rounded-xl border border-white/10">
                <div>
                  <span className="text-slate-500 block text-[10px]">Format</span>
                  <span className="text-slate-200 font-mono">{previewItem.format || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Sample Count</span>
                  <span className="text-slate-200 font-mono">{previewItem.sample_count || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Duration</span>
                  <span className="text-slate-200 font-mono">{previewItem.duration || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Resolution</span>
                  <span className="text-slate-200 font-mono">{previewItem.resolution || 'N/A'}</span>
                </div>
              </div>

              {previewItem.use_case && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Use Case</span>
                  <p className="text-xs text-cyan-300 bg-cyan-950/30 p-2.5 rounded-xl border border-cyan-500/20">
                    {previewItem.use_case}
                  </p>
                </div>
              )}

              {previewItem.quality_info && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Quality Certification</span>
                  <p className="text-xs text-emerald-300 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/20">
                    {previewItem.quality_info}
                  </p>
                </div>
              )}

              {/* Media Preview Player */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-xs font-semibold text-slate-300 block">Sample Media Preview</span>
                {previewItem.file_url ? (
                  previewItem.category === 'Audio' ? (
                    <audio controls src={previewItem.file_url} className="w-full rounded-xl" />
                  ) : previewItem.category === 'Video' ? (
                    <video controls src={previewItem.file_url} className="w-full max-h-56 rounded-xl bg-black" />
                  ) : previewItem.category === 'Image' ? (
                    <img src={previewItem.file_url} alt="Sample preview" className="w-full max-h-56 object-contain rounded-xl bg-black" />
                  ) : (
                    <a
                      href={previewItem.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-cyan-400 underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Sample Resource</span>
                    </a>
                  )
                ) : (
                  <div className="p-4 text-center rounded-xl bg-slate-800/40 border border-white/10 text-xs text-slate-400 italic">
                    Sample preview unavailable.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
