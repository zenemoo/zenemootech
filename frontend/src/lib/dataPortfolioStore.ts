import { supabase } from './supabaseClient';
import { deleteDatasetFile } from './datasetStorage';

export type DatasetCategory =
  | 'Audio'
  | 'Video'
  | 'Image'
  | 'JSON'
  | 'CSV'
  | 'Transcription'
  | 'Annotation'
  | 'Other';

export type DatasetLanguage =
  | 'Odia'
  | 'Hindi'
  | 'English'
  | 'Bengali'
  | 'Telugu'
  | 'Tamil'
  | 'Other';

export interface DatasetItem {
  id: string;
  title: string;
  description?: string;
  category: DatasetCategory;
  language: DatasetLanguage | string;
  format?: string;
  file_name?: string;
  storage_provider: string;
  storage_file_id?: string;
  file_url?: string;
  thumbnail_url?: string;
  file_size?: string;
  duration?: string;
  sample_count?: string;
  resolution?: string;
  use_case?: string;
  quality_info?: string;
  is_public: boolean;
  is_featured: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = 'zenemoo_data_portfolio_db';

// Initial representative datasets for demonstration
const INITIAL_DEMO_DATASETS: DatasetItem[] = [
  {
    id: 'ds_demo_01',
    title: 'Odia Conversational Speech Corpus',
    description: 'High-fidelity multi-speaker Odia conversational speech dataset collected across coastal and western dialects for ASR & TTS training.',
    category: 'Audio',
    language: 'Odia',
    format: 'WAV 24kHz 16-bit PCM',
    file_name: 'odia_speech_corpus_v1.zip',
    storage_provider: 'google_drive',
    file_url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
    thumbnail_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80',
    file_size: '4.8 GB',
    duration: '25+ Hours',
    sample_count: '1,200 Audio Clips',
    resolution: 'N/A',
    use_case: 'Automatic Speech Recognition (ASR), Voice AI Assistants, Odia Dialect Modeling',
    quality_info: 'Human Validated & Native Speaker Reviewed (99.4% Phonetic Accuracy)',
    is_public: true,
    is_featured: true,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ds_demo_02',
    title: 'Odia Legal & Administrative Text Corpus',
    description: 'Structured parallel Odia-English text dataset extracted from government documents, acts, and court proceedings with sentence alignments.',
    category: 'JSON',
    language: 'Odia',
    format: 'JSON / JSONL',
    file_name: 'odia_legal_parallel_corpus.json',
    storage_provider: 'google_drive',
    file_url: '',
    thumbnail_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
    file_size: '180 MB',
    duration: 'N/A',
    sample_count: '45,000 Parallel Sentences',
    resolution: 'N/A',
    use_case: 'Machine Translation (MT), LLM Fine-Tuning, Domain-Specific Legal NLP',
    quality_info: 'Bilingual Legal Expert Verified & Formatted',
    is_public: true,
    is_featured: true,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ds_demo_03',
    title: 'Indic OCR Printed & Handwritten Document Dataset',
    description: 'Bilingual Odia and English scanned document pages with word-level bounding boxes and ground-truth Unicode text annotations.',
    category: 'Image',
    language: 'Odia',
    format: 'PNG + COCO JSON',
    file_name: 'indic_ocr_documents_pack.zip',
    storage_provider: 'google_drive',
    file_url: '',
    thumbnail_url: 'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=600&q=80',
    file_size: '2.1 GB',
    duration: 'N/A',
    sample_count: '3,500 High-Res Pages',
    resolution: '300 DPI (3508 x 2480)',
    use_case: 'Optical Character Recognition (OCR), Document AI, Text Line Detection',
    quality_info: 'Double-Annotated & Layout Verified',
    is_public: true,
    is_featured: false,
    display_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ds_demo_04',
    title: 'Odia Audio Transcription & Sentiment Annotations',
    description: 'Verbatim transcriptions of Odia customer support calls and news broadcasts with sentiment tagging, speaker labels, and timestamp markers.',
    category: 'Transcription',
    language: 'Odia',
    format: 'CSV / VTT',
    file_name: 'odia_audio_transcriptions_v2.csv',
    storage_provider: 'google_drive',
    file_url: '',
    thumbnail_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
    file_size: '64 MB',
    duration: '15+ Hours Annotated',
    sample_count: '800 Transcribed Segments',
    resolution: 'N/A',
    use_case: 'Call Analytics, Sentiment Analysis, Speaker Diarization',
    quality_info: 'Human Transcribed & Sentiment Audited by Native Odia Linguists',
    is_public: true,
    is_featured: false,
    display_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const getLocalDatasets = (): DatasetItem[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      }
    }
  } catch (e) {}
  
  // Save demo datasets to localStorage on initial boot
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_DATASETS));
  } catch (e) {}
  return INITIAL_DEMO_DATASETS;
};

const saveLocalDatasets = (list: DatasetItem[]): DatasetItem[] => {
  const sorted = [...list].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
  } catch (e) {}
  return sorted;
};

/**
 * Fetch public datasets for the public website page (/ai-data)
 * Strictly filters is_public = true.
 */
export const getPublicDatasets = async (): Promise<DatasetItem[]> => {
  try {
    const { data, error } = await supabase
      .from('data_portfolio')
      .select('*')
      .eq('is_public', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data as DatasetItem[];
    }
  } catch (err: any) {
    console.warn('Supabase data_portfolio read error:', err.message);
  }

  // Fallback to local storage public datasets
  return getLocalDatasets().filter((d) => d.is_public);
};

/**
 * Admin method: Fetch all datasets (including hidden ones)
 */
export const getAllDatasetsAdmin = async (): Promise<DatasetItem[]> => {
  try {
    const { data, error } = await supabase
      .from('data_portfolio')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      saveLocalDatasets(data as DatasetItem[]);
      return data as DatasetItem[];
    }
  } catch (err: any) {
    console.warn('Supabase data_portfolio admin read error:', err.message);
  }

  return getLocalDatasets();
};

/**
 * Create or Update Dataset metadata
 */
export const saveDatasetToApi = async (dataset: Partial<DatasetItem>): Promise<DatasetItem[]> => {
  let localList = getLocalDatasets();
  const isUUID = dataset.id && dataset.id.includes('-');

  const payload: any = {
    title: dataset.title || 'Untitled Dataset',
    description: dataset.description || '',
    category: dataset.category || 'Other',
    language: dataset.language || 'Odia',
    format: dataset.format || '',
    file_name: dataset.file_name || '',
    storage_provider: dataset.storage_provider || 'google_drive',
    storage_file_id: dataset.storage_file_id || '',
    file_url: dataset.file_url || '',
    thumbnail_url: dataset.thumbnail_url || '',
    file_size: dataset.file_size || '',
    duration: dataset.duration || '',
    sample_count: dataset.sample_count || '',
    resolution: dataset.resolution || '',
    use_case: dataset.use_case || '',
    quality_info: dataset.quality_info || '',
    is_public: typeof dataset.is_public === 'boolean' ? dataset.is_public : true,
    is_featured: typeof dataset.is_featured === 'boolean' ? dataset.is_featured : false,
    display_order: typeof dataset.display_order === 'number' ? dataset.display_order : localList.length + 1,
    updated_at: new Date().toISOString(),
  };

  try {
    if (isUUID) {
      await supabase.from('data_portfolio').update(payload).eq('id', dataset.id);
    } else {
      await supabase.from('data_portfolio').insert([{ ...payload, created_at: new Date().toISOString() }]);
    }
    return await getAllDatasetsAdmin();
  } catch (err: any) {
    console.warn('Supabase dataset save error:', err.message);
  }

  // Update local storage fallback
  if (dataset.id) {
    localList = localList.map((d) => (d.id === dataset.id ? ({ ...d, ...payload } as DatasetItem) : d));
  } else {
    const newDs: DatasetItem = {
      id: `ds_${Date.now()}`,
      ...payload,
      created_at: new Date().toISOString(),
    };
    localList.push(newDs);
  }

  saveLocalDatasets(localList);
  return getAllDatasetsAdmin();
};

/**
 * Toggle dataset public visibility
 */
export const toggleDatasetVisibility = async (id: string, is_public: boolean): Promise<DatasetItem[]> => {
  try {
    if (id && id.includes('-')) {
      await supabase.from('data_portfolio').update({ is_public, updated_at: new Date().toISOString() }).eq('id', id);
    }
  } catch (e) {}

  const localList = getLocalDatasets().map((d) => (d.id === id ? { ...d, is_public, updated_at: new Date().toISOString() } : d));
  saveLocalDatasets(localList);

  return getAllDatasetsAdmin();
};

/**
 * Toggle dataset featured status
 */
export const toggleDatasetFeatured = async (id: string, is_featured: boolean): Promise<DatasetItem[]> => {
  try {
    if (id && id.includes('-')) {
      await supabase.from('data_portfolio').update({ is_featured, updated_at: new Date().toISOString() }).eq('id', id);
    }
  } catch (e) {}

  const localList = getLocalDatasets().map((d) => (d.id === id ? { ...d, is_featured, updated_at: new Date().toISOString() } : d));
  saveLocalDatasets(localList);

  return getAllDatasetsAdmin();
};

/**
 * Delete dataset metadata from Supabase
 * Trashes Google Drive file FIRST. If Drive deletion fails, Supabase deletion is aborted.
 */
export const deleteDatasetFromApi = async (id: string, storage_file_id?: string): Promise<DatasetItem[]> => {
  // 1. Delete associated Google Drive file if ID exists
  if (storage_file_id && storage_file_id.trim() !== '') {
    const driveResult = await deleteDatasetFile(storage_file_id);
    if (!driveResult.success) {
      throw new Error(`Google Drive deletion failed: ${driveResult.message}. Database metadata deletion was aborted.`);
    }
  }

  // 2. Delete Supabase metadata
  try {
    if (id && id.includes('-')) {
      const { error } = await supabase.from('data_portfolio').delete().eq('id', id);
      if (error) {
        throw new Error(`Supabase database deletion error: ${error.message}`);
      }
    }
  } catch (e: any) {
    if (e.message?.includes('database deletion error')) throw e;
  }

  const localList = getLocalDatasets().filter((d) => d.id !== id);
  saveLocalDatasets(localList);

  return getAllDatasetsAdmin();
};
