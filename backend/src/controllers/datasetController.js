import { supabase } from '../config/supabase.js';
import { googleAppsScriptService } from '../services/googleAppsScriptService.js';

// In-memory store for datasets & files (starts 100% empty — NO fake data)
const fallbackDatasets = [];
const fallbackFiles = [];

// Chunk store map for multi-part large file uploads: uploadId -> { chunks, fileName, ... }
const chunkStore = new Map();

// Permanent sequence counter in-memory fallback map: key = `${datasetId}_${fileType}` -> number
const memoryFileCounters = new Map();

/**
 * Get next permanent sequential number for a given dataset and file category (Never-reused)
 */
async function getNextSequenceNumber(datasetId, fileType) {
  let nextNum = 1;

  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('dataset_file_counters')
        .select('last_number')
        .eq('dataset_id', datasetId)
        .eq('file_type', fileType)
        .maybeSingle();

      if (existing && typeof existing.last_number === 'number') {
        nextNum = existing.last_number + 1;
        await supabase
          .from('dataset_file_counters')
          .update({ last_number: nextNum })
          .eq('dataset_id', datasetId)
          .eq('file_type', fileType);
      } else {
        nextNum = 1;
        await supabase
          .from('dataset_file_counters')
          .insert({ dataset_id: datasetId, file_type: fileType, last_number: nextNum });
      }

      const memKey = `${datasetId}_${fileType}`;
      memoryFileCounters.set(memKey, Math.max(nextNum, memoryFileCounters.get(memKey) || 0));
      return nextNum;
    } catch (e) {
      console.warn('Supabase sequence counter skipped, using memory counter:', e.message);
    }
  }

  const memKey = `${datasetId}_${fileType}`;
  const curr = memoryFileCounters.get(memKey) || 0;
  nextNum = curr + 1;
  memoryFileCounters.set(memKey, nextNum);
  return nextNum;
}

/**
 * Generate standard Zenemoo filename: Zenemoo ({Language/Dataset}_{TYPE}) Sample File {NUMBER}.{EXT}
 */
function generateZenemooFileName(datasetName, language, fileType, originalName, seqNum) {
  const categoryType = fileType || 'AUDIO';
  let tag = (language && language !== 'Multilingual' && language.trim()) ? language : datasetName;
  tag = tag.trim().replace(/[^a-zA-Z0-9\s_-]/g, '').replace(/\s+/g, '_');
  if (!tag) tag = 'AI';

  let ext = '';
  const dotIdx = originalName.lastIndexOf('.');
  if (dotIdx !== -1) {
    ext = originalName.substring(dotIdx).toLowerCase();
  } else {
    const defaultExts = { AUDIO: '.wav', VIDEO: '.mp4', IMAGE: '.jpg', JSON: '.json', CSV: '.csv', PDF: '.pdf' };
    ext = defaultExts[categoryType] || '';
  }

  const paddedNum = String(seqNum).padStart(3, '0');
  const zenemooFileName = `Zenemoo (${tag}_${categoryType}) Sample File ${paddedNum}${ext}`;

  return {
    zenemooFileName,
    originalFileName: originalName,
  };
}

export const getDatasets = async (req, res) => {
  try {
    const { search, category, status } = req.query;

    if (supabase) {
      try {
        let query = supabase.from('datasets').select('*').order('created_at', { ascending: false });

        if (status && status !== 'all') {
          query = query.eq('status', status);
        }
        if (search) {
          query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,language.ilike.%${search}%`);
        }

        const { data, error } = await query;

        if (!error && data) {
          const normalized = data.map((d) => ({
            ...d,
            status: d.status || 'active',
            total_files: d.total_files || 0,
            total_size_bytes: d.total_size_bytes || 0,
          }));
          return res.json({ success: true, datasets: normalized });
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
            supabase
              .from('dataset_files')
              .select('id, dataset_id, file_name, original_file_name, file_type, mime_type, file_size, drive_file_id, drive_folder_id, drive_url, thumbnail_url, status, created_at, updated_at')
              .eq('dataset_id', dataset.id)
              .order('created_at', { ascending: false }),
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
    const { fileName, fileType, mimeType, fileSize, base64Data, driveUrl, driveFolderId } = req.body;

    if (!fileName || (!base64Data && !driveUrl)) {
      return res.status(400).json({ success: false, message: 'Missing fileName, base64Data, or driveUrl' });
    }

    const categoryType = fileType || 'AUDIO';

    // 1. Fetch Dataset details to get language and name
    let datasetName = 'Dataset';
    let datasetLang = 'Multilingual';
    let targetFolder = driveFolderId;

    if (supabase) {
      try {
        const { data: ds } = await supabase.from('datasets').select('name, language, drive_folder_id').eq('id', id).maybeSingle();
        if (ds) {
          datasetName = ds.name || 'Dataset';
          datasetLang = ds.language || 'Multilingual';
          if (!targetFolder || targetFolder === 'root') targetFolder = ds.drive_folder_id;
        }
      } catch (e) {}
    }

    if (datasetName === 'Dataset') {
      const memDs = fallbackDatasets.find((d) => d.id === id);
      if (memDs) {
        datasetName = memDs.name;
        datasetLang = memDs.language || 'Multilingual';
        if (!targetFolder || targetFolder === 'root') targetFolder = memDs.drive_folder_id;
      }
    }

    // 2. Generate Permanent Sequential Zenemoo Filename
    const seqNum = await getNextSequenceNumber(id, categoryType);
    const { zenemooFileName, originalFileName } = generateZenemooFileName(datasetName, datasetLang, categoryType, fileName, seqNum);

    let finalDriveUrl = driveUrl || null;
    let finalDriveFileId = `drive_${Date.now()}`;
    let computedSize = fileSize || 0;

    if (driveUrl) {
      const fileIdMatch = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        finalDriveFileId = fileIdMatch[1];
        finalDriveUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
      } else {
        finalDriveUrl = driveUrl;
      }
    }

    if (base64Data) {
      computedSize = fileSize || Math.round(base64Data.length * 0.75);
      const fallbackDataUrl = computedSize < 1024 * 1024 ? `data:${mimeType || 'application/octet-stream'};base64,${base64Data}` : null;
      if (!finalDriveUrl) finalDriveUrl = fallbackDataUrl;
    }

    // Memory Guard: Extract raw text ONLY for small text/JSON/CSV files (< 1MB)
    let rawContent = null;
    if (base64Data && computedSize < 1024 * 1024) {
      try {
        if (categoryType === 'JSON' || categoryType === 'CSV' || (mimeType && (mimeType.includes('json') || mimeType.includes('text') || mimeType.includes('csv')))) {
          rawContent = Buffer.from(base64Data, 'base64').toString('utf-8');
        }
      } catch (e) {}
    }

    const fileRecord = {
      id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      dataset_id: id,
      file_name: zenemooFileName,
      original_file_name: originalFileName,
      file_type: categoryType,
      mime_type: mimeType || 'application/octet-stream',
      file_size: computedSize,
      drive_file_id: finalDriveFileId,
      drive_folder_id: targetFolder || 'root',
      drive_url: finalDriveUrl,
      thumbnail_url: categoryType === 'IMAGE' ? finalDriveUrl : null,
      raw_content: rawContent,
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let insertedDbFile = null;

    if (supabase) {
      try {
        const { data: dbFile } = await supabase
          .from('dataset_files')
          .insert({
            dataset_id: id,
            file_name: zenemooFileName,
            original_file_name: originalFileName,
            file_type: categoryType,
            mime_type: mimeType,
            file_size: fileRecord.file_size,
            drive_file_id: fileRecord.drive_file_id,
            drive_folder_id: targetFolder || 'root',
            drive_url: fileRecord.drive_url,
            thumbnail_url: fileRecord.thumbnail_url,
            raw_content: rawContent,
            status: 'ready',
          })
          .select()
          .single();

        if (dbFile) {
          insertedDbFile = dbFile;
        }
      } catch (dbErr) {
        console.error('Error writing file record to Supabase:', dbErr);
      }
    }

    if (!insertedDbFile) {
      fallbackFiles.unshift(fileRecord);
      const parentDataset = fallbackDatasets.find((d) => d.id === id);
      if (parentDataset) {
        parentDataset.total_files += 1;
        parentDataset.total_size_bytes += fileRecord.file_size;
        parentDataset.updated_at = new Date().toISOString();
      }
    }

    // ⚡ Respond to client immediately (< 500ms)
    res.status(201).json({ success: true, file: insertedDbFile || fileRecord });

    // If base64Data was provided, run background Google Drive upload with zenemooFileName
    if (base64Data) {
      (async () => {
        try {
          const driveRes = await googleAppsScriptService.uploadFile({
            targetFolderId: targetFolder || 'root',
            category: categoryType,
            fileName: zenemooFileName,
            mimeType,
            base64Data,
          });

          if (driveRes?.file?.url) {
            const driveUrlRes = driveRes.file.url;
            const driveFileIdRes = driveRes.file.id;
            const thumbnailUrlRes = driveRes.file.thumbnailUrl;

            if (supabase && insertedDbFile?.id) {
              await supabase
                .from('dataset_files')
                .update({
                  drive_url: driveUrlRes,
                  drive_file_id: driveFileIdRes,
                  thumbnail_url: thumbnailUrlRes || insertedDbFile.thumbnail_url,
                })
                .eq('id', insertedDbFile.id);
            } else {
              const memFile = fallbackFiles.find((f) => f.id === fileRecord.id);
              if (memFile) {
                memFile.drive_url = driveUrlRes;
                memFile.drive_file_id = driveFileIdRes;
                if (thumbnailUrlRes) memFile.thumbnail_url = thumbnailUrlRes;
              }
            }
            console.log(`✅ Background Google Drive upload completed for ${zenemooFileName}`);
          }
        } catch (bgErr) {
          console.warn(`⚠️ Background Google Drive upload warning for ${zenemooFileName}:`, bgErr?.message || bgErr);
        }
      })();
    }

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const fetchLinkMetadata = async (req, res) => {
  try {
    const { driveUrl } = req.body;
    if (!driveUrl) {
      return res.status(400).json({ success: false, message: 'Missing driveUrl' });
    }

    const fileIdMatch = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (!fileIdMatch || !fileIdMatch[1]) {
      return res.json({
        success: true,
        fileName: 'External_File_' + Date.now().toString(36),
        fileType: 'VIDEO',
        fileSize: 10 * 1024 * 1024,
      });
    }

    const fileId = fileIdMatch[1];
    const scriptRes = await googleAppsScriptService.getFileMetadata(fileId);

    if (scriptRes && scriptRes.success && scriptRes.file) {
      return res.json({
        success: true,
        fileId,
        fileName: scriptRes.file.name,
        fileType: scriptRes.file.category || 'VIDEO',
        fileSize: scriptRes.file.size,
        mimeType: scriptRes.file.mimeType,
      });
    }

    // Fallback: Query Google Drive direct export headers via fetch/axios HEAD
    try {
      const axios = (await import('axios')).default;
      const headRes = await axios.head(`https://drive.google.com/uc?export=download&id=${fileId}`, {
        maxRedirects: 5,
        timeout: 5000,
      });

      const contentLength = parseInt(headRes.headers['content-length'] || '0', 10);
      const disposition = headRes.headers['content-disposition'] || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const extractedName = filenameMatch ? filenameMatch[1] : null;

      return res.json({
        success: true,
        fileId,
        fileName: extractedName || `Google_Drive_File_${fileId.substring(0, 6)}`,
        fileType: 'VIDEO',
        fileSize: contentLength || 10 * 1024 * 1024,
      });
    } catch (headErr) {}

    res.json({
      success: true,
      fileId,
      fileName: `Google_Drive_File_${fileId.substring(0, 6)}`,
      fileType: 'VIDEO',
      fileSize: 10 * 1024 * 1024,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const uploadChunk = async (req, res) => {
  try {
    const { id } = req.params;
    const { uploadId, chunkIndex, totalChunks, fileName, fileType, mimeType, fileSize, chunkData, driveFolderId } = req.body;

    if (!uploadId || chunkIndex === undefined || !chunkData) {
      return res.status(400).json({ success: false, message: 'Missing uploadId or chunkData' });
    }

    if (!chunkStore.has(uploadId)) {
      chunkStore.set(uploadId, {
        chunks: new Array(totalChunks),
        fileName,
        fileType,
        mimeType,
        fileSize,
        driveFolderId,
        receivedCount: 0,
      });
    }

    const session = chunkStore.get(uploadId);
    session.chunks[chunkIndex] = chunkData;
    session.receivedCount += 1;

    // Check if all chunks received
    if (session.receivedCount >= totalChunks) {
      const fullBase64 = session.chunks.join('');
      chunkStore.delete(uploadId);

      req.body = {
        fileName: session.fileName,
        fileType: session.fileType,
        mimeType: session.mimeType,
        fileSize: session.fileSize,
        base64Data: fullBase64,
        driveFolderId: session.driveFolderId,
      };

      return await uploadFile(req, res);
    }

    res.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} received`,
      progress: Math.round((session.receivedCount / totalChunks) * 100),
    });
  } catch (err) {
    console.error('uploadChunk error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (supabase) {
      try {
        const { data: targetFile } = await supabase.from('dataset_files').select('*').eq('id', fileId).maybeSingle();
        if (targetFile?.drive_file_id && !targetFile.drive_file_id.startsWith('drive_')) {
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
      if (removed.drive_file_id && !removed.drive_file_id.startsWith('drive_')) {
        try {
          await googleAppsScriptService.deleteFile(removed.drive_file_id);
        } catch (gErr) {}
      }
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

    let targetFolderId = null;

    if (supabase) {
      try {
        const { data: ds } = await supabase.from('datasets').select('drive_folder_id').eq('id', id).maybeSingle();
        if (ds?.drive_folder_id) targetFolderId = ds.drive_folder_id;

        // Delete all files in Google Drive associated with this dataset
        const { data: files } = await supabase.from('dataset_files').select('drive_file_id').eq('dataset_id', id);
        if (files) {
          for (const f of files) {
            if (f.drive_file_id && !f.drive_file_id.startsWith('drive_')) {
              try {
                await googleAppsScriptService.deleteFile(f.drive_file_id);
              } catch (gErr) {}
            }
          }
        }

        if (targetFolderId && !targetFolderId.startsWith('drive_folder_') && !targetFolderId.startsWith('mock_')) {
          try {
            await googleAppsScriptService.deleteFolder(targetFolderId);
          } catch (gErr) {}
        }

        await supabase.from('datasets').delete().eq('id', id);
        return res.json({ success: true, message: 'Dataset and associated Google Drive files deleted' });
      } catch (err) {}
    }

    const idx = fallbackDatasets.findIndex((d) => d.id === id);
    if (idx !== -1) {
      const removedDs = fallbackDatasets.splice(idx, 1)[0];
      if (removedDs?.drive_folder_id && !removedDs.drive_folder_id.startsWith('drive_folder_')) {
        try {
          await googleAppsScriptService.deleteFolder(removedDs.drive_folder_id);
        } catch (gErr) {}
      }
    }

    res.json({ success: true, message: 'Dataset deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
