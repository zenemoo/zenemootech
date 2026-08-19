import { supabase } from '../config/supabase.js';
import { googleAppsScriptService } from '../services/googleAppsScriptService.js';

// In-memory fallback store when Supabase tables are being initialized
const fallbackDatasets = [
  {
    id: 'ds_odia_speech_01',
    name: 'Odia Speech Dataset',
    slug: 'odia-speech-dataset',
    description: 'High-quality Odia speech recordings collected from various native speakers across different age groups for ASR model training.',
    language: 'Odia',
    drive_folder_id: 'drive_folder_odia_01',
    status: 'active',
    total_files: 91,
    total_size_bytes: 19864223744, // 18.5 GB
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 'ds_hindi_speech_02',
    name: 'Hindi Speech Dataset',
    slug: 'hindi-speech-dataset',
    description: 'Conversational Hindi audio clips with accurate phonetic transcriptions and speaker demographic data.',
    language: 'Hindi',
    drive_folder_id: 'drive_folder_hindi_02',
    status: 'active',
    total_files: 86,
    total_size_bytes: 15032385536, // 14.0 GB
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    id: 'ds_agri_video_03',
    name: 'Agricultural Videos',
    slug: 'agricultural-videos',
    description: 'Farming, crop disease inspection, and agricultural tractor machinery video footage for vision AI models.',
    language: 'Multilingual',
    drive_folder_id: 'drive_folder_agri_03',
    status: 'active',
    total_files: 240,
    total_size_bytes: 16965120000, // 15.8 GB
    created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 'ds_financial_csv_04',
    name: 'Financial CSV Records',
    slug: 'financial-csv-records',
    description: 'Structured banking, microfinance transactions, and crop loan analytics datasets for AI evaluation.',
    language: 'English',
    drive_folder_id: 'drive_folder_csv_04',
    status: 'active',
    total_files: 320,
    total_size_bytes: 7194070220, // 6.7 GB
    created_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 86400 * 1000).toISOString(),
  },
  {
    id: 'ds_image_class_05',
    name: 'Image Classification Set',
    slug: 'image-classification-set',
    description: 'Diverse high-resolution Indian street view and retail product images annotated for object recognition.',
    language: 'Multilingual',
    drive_folder_id: 'drive_folder_img_05',
    status: 'active',
    total_files: 1200,
    total_size_bytes: 19971597926, // 18.6 GB
    created_at: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
  },
  {
    id: 'ds_research_pdf_06',
    name: 'Research Papers Collection',
    slug: 'research-papers-collection',
    description: 'Peer-reviewed academic research PDFs and NLP survey papers on Indic LLMs.',
    language: 'English',
    drive_folder_id: 'drive_folder_pdf_06',
    status: 'active',
    total_files: 75,
    total_size_bytes: 3543348020, // 3.3 GB
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
  },
];

const fallbackFiles = [
  {
    id: 'f_01',
    dataset_id: 'ds_odia_speech_01',
    file_name: 'sample_audio_01.wav',
    file_type: 'AUDIO',
    mime_type: 'audio/wav',
    file_size: 47395840, // 45.2 MB
    drive_file_id: 'drive_f_01',
    drive_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    status: 'ready',
    created_at: new Date(Date.now() - 120000).toISOString(),
    updated_at: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'f_02',
    dataset_id: 'ds_odia_speech_01',
    file_name: 'sample_audio_02.wav',
    file_type: 'AUDIO',
    mime_type: 'audio/wav',
    file_size: 40579891, // 38.7 MB
    drive_file_id: 'drive_f_02',
    drive_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    status: 'ready',
    created_at: new Date(Date.now() - 300000).toISOString(),
    updated_at: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'f_03',
    dataset_id: 'ds_odia_speech_01',
    file_name: 'sample_video_01.mp4',
    file_type: 'VIDEO',
    mime_type: 'video/mp4',
    file_size: 131072000, // 125 MB
    drive_file_id: 'drive_f_03',
    drive_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    status: 'ready',
    created_at: new Date(Date.now() - 900000).toISOString(),
    updated_at: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: 'f_04',
    dataset_id: 'ds_odia_speech_01',
    file_name: 'metadata_01.json',
    file_type: 'JSON',
    mime_type: 'application/json',
    file_size: 2457, // 2.4 KB
    drive_file_id: 'drive_f_04',
    drive_url: 'https://raw.githubusercontent.com/mdn/learning-area/main/javascript/oojs/json/superheroes.json',
    status: 'ready',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'f_05',
    dataset_id: 'ds_odia_speech_01',
    file_name: 'data_sheet.csv',
    file_type: 'CSV',
    mime_type: 'text/csv',
    file_size: 18432, // 18 KB
    drive_file_id: 'drive_f_05',
    drive_url: 'https://raw.githubusercontent.com/cs109/2014_data/master/countries.csv',
    status: 'ready',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

export const getDatasets = async (req, res) => {
  try {
    const { search, category, status } = req.query;

    if (supabase) {
      let query = supabase.from('datasets').select('*').order('updated_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,language.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return res.json({ success: true, datasets: data });
      }
    }

    // Fallback search filter
    let filtered = [...fallbackDatasets];
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (d) => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.language.toLowerCase().includes(q)
      );
    }
    res.json({ success: true, datasets: filtered });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getDatasetBySlugOrId = async (req, res) => {
  try {
    const { identifier } = req.params;

    let dataset = null;
    let files = [];
    let folders = [];

    if (supabase) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      let dsQuery = supabase.from('datasets').select('*');
      if (isUuid) {
        dsQuery = dsQuery.eq('id', identifier);
      } else {
        dsQuery = dsQuery.eq('slug', identifier);
      }

      const { data: dsData } = await dsQuery.maybeSingle();

      if (dsData) {
        dataset = dsData;
        const [filesRes, foldersRes] = await Promise.all([
          supabase.from('dataset_files').select('*').eq('dataset_id', dataset.id).order('created_at', { ascending: false }),
          supabase.from('dataset_folders').select('*').eq('dataset_id', dataset.id),
        ]);
        files = filesRes.data || [];
        folders = foldersRes.data || [];
      }
    }

    if (!dataset) {
      dataset = fallbackDatasets.find((d) => d.slug === identifier || d.id === identifier);
      if (dataset) {
        files = fallbackFiles.filter((f) => f.dataset_id === dataset.id);
        folders = [
          { id: `folder_audio_${dataset.id}`, name: 'AUDIO', folder_type: 'AUDIO' },
          { id: `folder_video_${dataset.id}`, name: 'VIDEO', folder_type: 'VIDEO' },
          { id: `folder_image_${dataset.id}`, name: 'IMAGE', folder_type: 'IMAGE' },
          { id: `folder_json_${dataset.id}`, name: 'JSON', folder_type: 'JSON' },
          { id: `folder_csv_${dataset.id}`, name: 'CSV', folder_type: 'CSV' },
          { id: `folder_pdf_${dataset.id}`, name: 'PDF', folder_type: 'PDF' },
        ];
      }
    }

    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found' });
    }

    res.json({
      success: true,
      dataset,
      files,
      folders,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createDataset = async (req, res) => {
  try {
    const { name, description, language } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Dataset name is required' });
    }

    const cleanName = name.trim();
    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Step 1: Create Google Drive Folders via Apps Script
    const driveResult = await googleAppsScriptService.createDataset(cleanName);
    const driveFolderId = driveResult?.dataset?.driveFolderId || `drive_folder_${Date.now()}`;
    const categoryFoldersMap = driveResult?.dataset?.categoryFolders || {};

    const newDatasetObj = {
      id: `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      slug: `${slug}-${Date.now().toString(36)}`,
      description: description || '',
      language: language || 'Multilingual',
      drive_folder_id: driveFolderId,
      status: 'active',
      total_files: 0,
      total_size_bytes: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data: createdDs, error: dsErr } = await supabase
          .from('datasets')
          .insert({
            name: cleanName,
            slug: newDatasetObj.slug,
            description: description || '',
            language: language || 'Multilingual',
            drive_folder_id: driveFolderId,
            status: 'active',
          })
          .select()
          .single();

        if (!dsErr && createdDs) {
          // Initialize category folders in database
          const catEntries = ['AUDIO', 'VIDEO', 'IMAGE', 'JSON', 'CSV', 'PDF'].map((cat) => ({
            dataset_id: createdDs.id,
            name: cat,
            folder_type: cat,
            drive_folder_id: categoryFoldersMap[cat] || null,
          }));

          await supabase.from('dataset_folders').insert(catEntries);

          return res.status(201).json({
            success: true,
            dataset: createdDs,
            message: '✅ Dataset and Google Drive folder structure created successfully!',
          });
        }
      } catch (dbErr) {
        console.error('Database insertion error, falling back to memory response:', dbErr);
      }
    }

    fallbackDatasets.unshift(newDatasetObj);

    res.status(201).json({
      success: true,
      dataset: newDatasetObj,
      message: '✅ Dataset created successfully!',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { folderName } = req.body;

    if (!folderName || !folderName.trim()) {
      return res.status(400).json({ success: false, message: 'Folder name is required' });
    }

    const driveRes = await googleAppsScriptService.createFolder(folderName.trim(), id);

    const folderObj = {
      id: `folder_custom_${Date.now()}`,
      dataset_id: id,
      name: folderName.trim(),
      folder_type: 'CUSTOM',
      drive_folder_id: driveRes?.folder?.id || null,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data: createdFolder } = await supabase
          .from('dataset_folders')
          .insert({
            dataset_id: id,
            name: folderName.trim(),
            folder_type: 'CUSTOM',
            drive_folder_id: driveRes?.folder?.id || null,
          })
          .select()
          .single();

        if (createdFolder) {
          return res.status(201).json({ success: true, folder: createdFolder });
        }
      } catch (err) {}
    }

    res.status(201).json({ success: true, folder: folderObj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const uploadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileName, fileType, mimeType, fileSize, base64Data, driveFolderId } = req.body;

    if (!fileName || !base64Data) {
      return res.status(400).json({ success: false, message: 'Missing fileName or base64Data' });
    }

    // Step 1: Upload to Drive via Apps Script
    const driveRes = await googleAppsScriptService.uploadFile({
      targetFolderId: driveFolderId || 'root',
      fileName,
      mimeType,
      base64Data,
    });

    const fileRecord = {
      id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      dataset_id: id,
      file_name: fileName,
      file_type: fileType || 'AUDIO',
      mime_type: mimeType || 'application/octet-stream',
      file_size: fileSize || Math.round(base64Data.length * 0.75),
      drive_file_id: driveRes?.file?.id || `drive_${Date.now()}`,
      drive_folder_id: driveFolderId,
      drive_url: driveRes?.file?.url || `https://drive.google.com/file/d/sample/view`,
      thumbnail_url: driveRes?.file?.thumbnailUrl || null,
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data: dbFile } = await supabase
          .from('dataset_files')
          .insert({
            dataset_id: id,
            file_name: fileName,
            file_type: fileType || 'AUDIO',
            mime_type: mimeType,
            file_size: fileRecord.file_size,
            drive_file_id: fileRecord.drive_file_id,
            drive_folder_id: driveFolderId,
            drive_url: fileRecord.drive_url,
            thumbnail_url: fileRecord.thumbnail_url,
            status: 'ready',
          })
          .select()
          .single();

        if (dbFile) {
          return res.status(201).json({ success: true, file: dbFile });
        }
      } catch (dbErr) {
        console.error('Error writing file record to Supabase:', dbErr);
      }
    }

    fallbackFiles.unshift(fileRecord);
    const parentDataset = fallbackDatasets.find((d) => d.id === id);
    if (parentDataset) {
      parentDataset.total_files += 1;
      parentDataset.total_size_bytes += fileRecord.file_size;
      parentDataset.updated_at = new Date().toISOString();
    }

    res.status(201).json({ success: true, file: fileRecord });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (supabase) {
      try {
        const { data: targetFile } = await supabase.from('dataset_files').select('*').eq('id', fileId).maybeSingle();
        if (targetFile?.drive_file_id) {
          await googleAppsScriptService.deleteFile(targetFile.drive_file_id);
        }
        await supabase.from('dataset_files').delete().eq('id', fileId);
        return res.json({ success: true, message: 'File deleted successfully' });
      } catch (err) {}
    }

    const idx = fallbackFiles.findIndex((f) => f.id === fileId);
    if (idx !== -1) {
      const removed = fallbackFiles.splice(idx, 1)[0];
      const ds = fallbackDatasets.find((d) => d.id === removed.dataset_id);
      if (ds) {
        ds.total_files = Math.max(0, ds.total_files - 1);
        ds.total_size_bytes = Math.max(0, ds.total_size_bytes - removed.file_size);
      }
    }

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteDataset = async (req, res) => {
  try {
    const { id } = req.params;

    if (supabase) {
      try {
        await supabase.from('datasets').delete().eq('id', id);
        return res.json({ success: true, message: 'Dataset deleted' });
      } catch (err) {}
    }

    const idx = fallbackDatasets.findIndex((d) => d.id === id);
    if (idx !== -1) {
      fallbackDatasets.splice(idx, 1);
    }

    res.json({ success: true, message: 'Dataset deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
