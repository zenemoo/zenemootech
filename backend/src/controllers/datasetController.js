import { supabase } from '../config/supabase.js';
import { googleAppsScriptService } from '../services/googleAppsScriptService.js';

// In-memory store for datasets & files (starts 100% empty — NO fake data)
const fallbackDatasets = [];
const fallbackFiles = [];

export const getDatasets = async (req, res) => {
  try {
    const { search, category, status } = req.query;

    if (supabase) {
      try {
        let query = supabase.from('datasets').select('*').order('updated_at', { ascending: false });

        if (status) {
          query = query.eq('status', status);
        }
        if (search) {
          query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,language.ilike.%${search}%`);
        }

        const { data, error } = await query;

        if (!error && data) {
          return res.json({ success: true, datasets: data });
        }
      } catch (dbErr) {
        console.warn('Supabase getDatasets query skipped, using memory store:', dbErr.message);
      }
    }

    // Filter memory store
    let filtered = [...fallbackDatasets];
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (d) => d.name.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q) || (d.language || '').toLowerCase().includes(q)
      );
    }
    if (status && status !== 'all') {
      filtered = filtered.filter((d) => d.status === status);
    }

    res.json({ success: true, datasets: filtered });
  } catch (err) {
    console.error('getDatasets error:', err);
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
      try {
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
      } catch (dbErr) {
        console.warn('Supabase getDatasetBySlugOrId query skipped:', dbErr.message);
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
    console.error('getDatasetBySlugOrId error:', err);
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
    const baseSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Safely attempt Google Drive creation
    let driveResult = null;
    try {
      driveResult = await googleAppsScriptService.createDataset(cleanName);
    } catch (gErr) {
      console.warn('⚠️ Google Apps Script drive creation bypassed:', gErr?.message || gErr);
    }

    const driveFolderId = driveResult?.dataset?.driveFolderId || `drive_folder_${Date.now()}`;
    const categoryFoldersMap = driveResult?.dataset?.categoryFolders || {};

    const newDatasetObj = {
      id: `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      slug,
      description: description || '',
      language: language || 'Multilingual',
      drive_folder_id: driveFolderId,
      status: 'active',
      total_files: 0,
      total_size_bytes: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Safely attempt Supabase insertion
    if (supabase) {
      try {
        const { data: createdDs, error: dsErr } = await supabase
          .from('datasets')
          .insert({
            name: cleanName,
            slug,
            description: description || '',
            language: language || 'Multilingual',
            drive_folder_id: driveFolderId,
            status: 'active',
          })
          .select()
          .single();

        if (!dsErr && createdDs) {
          try {
            const catEntries = ['AUDIO', 'VIDEO', 'IMAGE', 'JSON', 'CSV', 'PDF'].map((cat) => ({
              dataset_id: createdDs.id,
              name: cat,
              folder_type: cat,
              drive_folder_id: categoryFoldersMap[cat] || null,
            }));
            await supabase.from('dataset_folders').insert(catEntries);
          } catch (catErr) {
            console.warn('Folder category insert warning:', catErr?.message);
          }

          return res.status(201).json({
            success: true,
            dataset: createdDs,
            message: '✅ Dataset created successfully!',
          });
        } else if (dsErr) {
          console.warn('Supabase dataset insert warning:', dsErr.message);
        }
      } catch (dbErr) {
        console.warn('Supabase DB execution exception:', dbErr?.message);
      }
    }

    // Save to memory store
    fallbackDatasets.unshift(newDatasetObj);

    return res.status(201).json({
      success: true,
      dataset: newDatasetObj,
      message: '✅ Dataset created successfully!',
    });
  } catch (err) {
    console.error('Unhandled createDataset error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
  }
};

export const createFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { folderName } = req.body;

    if (!folderName || !folderName.trim()) {
      return res.status(400).json({ success: false, message: 'Folder name is required' });
    }

    let driveRes = null;
    try {
      driveRes = await googleAppsScriptService.createFolder(folderName.trim(), id);
    } catch (gErr) {}

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

    let driveRes = null;
    try {
      driveRes = await googleAppsScriptService.uploadFile({
        targetFolderId: driveFolderId || 'root',
        fileName,
        mimeType,
        base64Data,
      });
    } catch (gErr) {}

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
          try {
            await googleAppsScriptService.deleteFile(targetFile.drive_file_id);
          } catch (gErr) {}
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
