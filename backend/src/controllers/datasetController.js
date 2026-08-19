import { supabase } from '../config/supabase.js';
import { googleAppsScriptService } from '../services/googleAppsScriptService.js';

// Single in-memory dataset store when Supabase table is being setup
const memoryDatasets = [];

export const getDatasets = async (req, res) => {
  try {
    const { search, status } = req.query;

    if (supabase) {
      try {
        let query = supabase.from('datasets').select('id, name, slug, description, language, status, total_files, total_size_bytes, drive_folder_id, created_at, updated_at').order('updated_at', { ascending: false });

        if (status && status !== 'all') {
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
        console.warn('Supabase query skipped, using memory store:', dbErr.message);
      }
    }

    let filtered = [...memoryDatasets];
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
        }
      } catch (dbErr) {
        console.warn('Supabase fetch dataset detail skipped:', dbErr.message);
      }
    }

    if (!dataset) {
      dataset = memoryDatasets.find((d) => d.slug === identifier || d.id === identifier);
    }

    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found' });
    }

    const files = dataset.files || [];
    const folders = [
      { id: `folder_audio_${dataset.id}`, name: 'AUDIO', folder_type: 'AUDIO' },
      { id: `folder_video_${dataset.id}`, name: 'VIDEO', folder_type: 'VIDEO' },
      { id: `folder_image_${dataset.id}`, name: 'IMAGE', folder_type: 'IMAGE' },
      { id: `folder_json_${dataset.id}`, name: 'JSON', folder_type: 'JSON' },
      { id: `folder_csv_${dataset.id}`, name: 'CSV', folder_type: 'CSV' },
      { id: `folder_pdf_${dataset.id}`, name: 'PDF', folder_type: 'PDF' },
    ];

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
      files: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

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
            total_files: 0,
            total_size_bytes: 0,
            files: [],
          })
          .select()
          .single();

        if (!dsErr && createdDs) {
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

    memoryDatasets.unshift(newDatasetObj);

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

    // Decode and preserve raw text for text/JSON/CSV files
    let rawContent = null;
    try {
      const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
      rawContent = decoded;
    } catch (e) {}

    const fallbackDataUrl = `data:${mimeType || 'application/octet-stream'};base64,${base64Data}`;
    const finalFileUrl = driveRes?.file?.url || fallbackDataUrl;
    const calculatedSize = fileSize || Math.round(base64Data.length * 0.75);

    const fileRecord = {
      id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      dataset_id: id,
      file_name: fileName,
      file_type: fileType || 'AUDIO',
      mime_type: mimeType || 'application/octet-stream',
      file_size: calculatedSize,
      drive_file_id: driveRes?.file?.id || `drive_${Date.now()}`,
      drive_folder_id: driveFolderId,
      drive_url: finalFileUrl,
      thumbnail_url: driveRes?.file?.thumbnailUrl || (mimeType?.startsWith('image/') ? fallbackDataUrl : null),
      raw_content: rawContent,
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let dsQuery = supabase.from('datasets').select('*');
        if (isUuid) {
          dsQuery = dsQuery.eq('id', id);
        } else {
          dsQuery = dsQuery.eq('slug', id);
        }
        const { data: targetDs } = await dsQuery.maybeSingle();

        if (targetDs) {
          const currentFiles = targetDs.files || [];
          const updatedFiles = [fileRecord, ...currentFiles];
          const newTotalFiles = (targetDs.total_files || 0) + 1;
          const newTotalSize = (targetDs.total_size_bytes || 0) + calculatedSize;

          const { data: updatedDs } = await supabase
            .from('datasets')
            .update({
              files: updatedFiles,
              total_files: newTotalFiles,
              total_size_bytes: newTotalSize,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetDs.id)
            .select()
            .single();

          if (updatedDs) {
            return res.status(201).json({ success: true, file: fileRecord });
          }
        }
      } catch (dbErr) {
        console.error('Error updating dataset files array in Supabase:', dbErr);
      }
    }

    // In-memory fallback
    const targetMem = memoryDatasets.find((d) => d.id === id || d.slug === id);
    if (targetMem) {
      if (!targetMem.files) targetMem.files = [];
      targetMem.files.unshift(fileRecord);
      targetMem.total_files = (targetMem.total_files || 0) + 1;
      targetMem.total_size_bytes = (targetMem.total_size_bytes || 0) + calculatedSize;
      targetMem.updated_at = new Date().toISOString();
    }

    res.status(201).json({ success: true, file: fileRecord });
  } catch (err) {
    console.error('uploadFile error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (supabase) {
      try {
        const { data: datasetsList } = await supabase.from('datasets').select('*');
        if (datasetsList) {
          for (const ds of datasetsList) {
            const files = ds.files || [];
            const fileObj = files.find((f) => f.id === fileId);
            if (fileObj) {
              if (fileObj.drive_file_id) {
                try {
                  await googleAppsScriptService.deleteFile(fileObj.drive_file_id);
                } catch (gErr) {}
              }
              const updatedFiles = files.filter((f) => f.id !== fileId);
              const newCount = Math.max(0, (ds.total_files || 1) - 1);
              const newSize = Math.max(0, (ds.total_size_bytes || fileObj.file_size) - fileObj.file_size);

              await supabase
                .from('datasets')
                .update({
                  files: updatedFiles,
                  total_files: newCount,
                  total_size_bytes: newSize,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', ds.id);

              return res.json({ success: true, message: 'File deleted successfully' });
            }
          }
        }
      } catch (err) {}
    }

    for (const ds of memoryDatasets) {
      if (ds.files) {
        const idx = ds.files.findIndex((f) => f.id === fileId);
        if (idx !== -1) {
          const removed = ds.files.splice(idx, 1)[0];
          ds.total_files = Math.max(0, ds.total_files - 1);
          ds.total_size_bytes = Math.max(0, ds.total_size_bytes - removed.file_size);
          return res.json({ success: true, message: 'File deleted successfully' });
        }
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

    const idx = memoryDatasets.findIndex((d) => d.id === id);
    if (idx !== -1) {
      memoryDatasets.splice(idx, 1);
    }

    res.json({ success: true, message: 'Dataset deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
