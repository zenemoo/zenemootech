/**
 * ZENEMOO DATA PORTFOLIO - Google Apps Script Drive Bridge
 * Version: 2.2
 *
 * Folder Structure:
 * 📁 ZENEMOO_DATA_PORTFOLIO / <Dataset Name> / AUDIO | VIDEO | IMAGE | JSON | CSV | PDF
 */

const ROOT_FOLDER_NAME = "ZENEMOO_DATA_PORTFOLIO";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ success: false, error: "No post data received" }, 400);
    }

    let postData;
    try {
      postData = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return responseJSON({ success: false, error: "Invalid JSON format" }, 400);
    }

    const action = postData.action;

    switch (action) {
      case "healthCheck":
        return responseJSON({ success: true, message: "Zenemoo Apps Script Drive Bridge is ONLINE" });

      case "createDataset":
        return handleCreateDataset(postData);

      case "createFolder":
        return handleCreateFolder(postData);

      case "uploadFile":
        return handleUploadFile(postData);

      case "uploadChunk":
        return handleUploadChunk(postData);

      case "deleteFile":
        return handleDeleteFile(postData);

      case "deleteFolder":
        return handleDeleteFolder(postData);

      case "listFiles":
        return handleListFiles(postData);

      case "listFolders":
        return handleListFolders(postData);

      default:
        return responseJSON({ success: false, error: "Unknown action requested: " + action }, 400);
    }
  } catch (err) {
    return responseJSON({ success: false, error: err.toString(), stack: err.stack }, 500);
  }
}

function doGet(e) {
  return responseJSON({
    status: "ONLINE",
    service: "Zenemoo Drive Bridge Apps Script v2.2",
    timestamp: new Date().toISOString()
  });
}

/**
 * Ensures the root ZENEMOO_DATA_PORTFOLIO folder exists
 */
function getOrCreateRootFolder() {
  const folders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(ROOT_FOLDER_NAME);
}

/**
 * Create Dataset Root Folder + 6 Category Subfolders
 */
function handleCreateDataset(data) {
  const datasetName = data.datasetName || "Untitled Dataset";
  const rootFolder = getOrCreateRootFolder();

  let datasetFolder;
  const existing = rootFolder.getFoldersByName(datasetName);
  if (existing.hasNext()) {
    datasetFolder = existing.next();
  } else {
    datasetFolder = rootFolder.createFolder(datasetName);
  }

  const categoryFolders = {};
  const categories = ["AUDIO", "VIDEO", "IMAGE", "JSON", "CSV", "PDF"];

  for (let i = 0; i < categories.length; i++) {
    const catName = categories[i];
    const catSearch = datasetFolder.getFoldersByName(catName);
    let subFolder;
    if (catSearch.hasNext()) {
      subFolder = catSearch.next();
    } else {
      subFolder = datasetFolder.createFolder(catName);
    }
    categoryFolders[catName] = subFolder.getId();
  }

  return responseJSON({
    success: true,
    dataset: {
      id: datasetFolder.getId(),
      name: datasetFolder.getName(),
      driveFolderId: datasetFolder.getId(),
      url: datasetFolder.getUrl(),
      categoryFolders: categoryFolders
    }
  });
}

/**
 * Create custom subfolder inside dataset
 */
function handleCreateFolder(data) {
  const folderName = data.folderName;
  const parentFolderId = data.parentFolderId;

  if (!folderName) {
    return responseJSON({ success: false, error: "Missing folderName" }, 400);
  }

  let parentFolder;
  if (parentFolderId && parentFolderId !== "root") {
    try {
      parentFolder = DriveApp.getFolderById(parentFolderId);
    } catch (e) {
      parentFolder = getOrCreateRootFolder();
    }
  } else {
    parentFolder = getOrCreateRootFolder();
  }

  let newFolder;
  const existing = parentFolder.getFoldersByName(folderName);
  if (existing.hasNext()) {
    newFolder = existing.next();
  } else {
    newFolder = parentFolder.createFolder(folderName);
  }

  return responseJSON({
    success: true,
    folder: {
      id: newFolder.getId(),
      name: newFolder.getName(),
      parentFolderId: parentFolder.getId(),
      url: newFolder.getUrl()
    }
  });
}

/**
 * Upload single file into target dataset & category subfolder
 */
function handleUploadFile(data) {
  let targetFolderId = data.targetFolderId;
  const category = data.category || "AUDIO";
  const fileName = data.fileName;
  const mimeType = data.mimeType || "application/octet-stream";
  const base64Data = data.base64Data;

  if (!fileName || !base64Data) {
    return responseJSON({ success: false, error: "Missing fileName or base64Data" }, 400);
  }

  let parentFolder;
  if (targetFolderId && targetFolderId !== "root") {
    try {
      parentFolder = DriveApp.getFolderById(targetFolderId);
    } catch (e) {
      parentFolder = getOrCreateRootFolder();
    }
  } else {
    parentFolder = getOrCreateRootFolder();
  }

  // Ensure file is placed inside the category subfolder (AUDIO, VIDEO, IMAGE, JSON, CSV, PDF)
  if (category) {
    const existingCat = parentFolder.getFoldersByName(category);
    if (existingCat.hasNext()) {
      parentFolder = existingCat.next();
    } else {
      parentFolder = parentFolder.createFolder(category);
    }
  }

  const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
  const file = parentFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId = file.getId();
  const downloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;
  const viewUrl = "https://drive.google.com/file/d/" + fileId + "/view";

  return responseJSON({
    success: true,
    file: {
      id: fileId,
      name: file.getName(),
      size: file.getSize(),
      mimeType: file.getMimeType(),
      url: downloadUrl,
      downloadUrl: downloadUrl,
      viewUrl: viewUrl,
      thumbnailUrl: downloadUrl
    }
  });
}

/**
 * Handle chunked file uploads for large video/audio files (> 20 MB)
 */
function handleUploadChunk(data) {
  const uploadId = data.uploadId;
  const targetFolderId = data.targetFolderId;
  const category = data.category || "VIDEO";
  const fileName = data.fileName;
  const mimeType = data.mimeType || "application/octet-stream";
  const chunkIndex = data.chunkIndex;
  const totalChunks = data.totalChunks;
  const chunkData = data.chunkData;

  let parentFolder;
  if (targetFolderId && targetFolderId !== "root") {
    try {
      parentFolder = DriveApp.getFolderById(targetFolderId);
    } catch (e) {
      parentFolder = getOrCreateRootFolder();
    }
  } else {
    parentFolder = getOrCreateRootFolder();
  }

  if (category) {
    const existingCat = parentFolder.getFoldersByName(category);
    if (existingCat.hasNext()) {
      parentFolder = existingCat.next();
    } else {
      parentFolder = parentFolder.createFolder(category);
    }
  }

  // Find or create temporary file for this chunk upload
  const tempFileName = "_temp_" + uploadId + "_" + fileName;
  let tempFile;
  const tempFiles = parentFolder.getFilesByName(tempFileName);
  if (tempFiles.hasNext()) {
    tempFile = tempFiles.next();
  } else {
    tempFile = parentFolder.createFile(tempFileName, "", "text/plain");
  }

  // Append chunk base64 data to temporary file
  const existingContent = tempFile.getBlob().getDataAsString();
  tempFile.setContent(existingContent + chunkData);

  if (chunkIndex >= totalChunks - 1) {
    // Final chunk: decode accumulated base64 and build real file
    const fullBase64 = tempFile.getBlob().getDataAsString();
    tempFile.setTrashed(true); // Delete temp file

    const blob = Utilities.newBlob(Utilities.base64Decode(fullBase64), mimeType, fileName);
    const finalFile = parentFolder.createFile(blob);
    finalFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = finalFile.getId();
    const downloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;
    const viewUrl = "https://drive.google.com/file/d/" + fileId + "/view";

    return responseJSON({
      success: true,
      file: {
        id: fileId,
        name: finalFile.getName(),
        size: finalFile.getSize(),
        mimeType: finalFile.getMimeType(),
        url: downloadUrl,
        downloadUrl: downloadUrl,
        viewUrl: viewUrl,
        thumbnailUrl: downloadUrl
      }
    });
  }

  return responseJSON({
    success: true,
    message: "Chunk " + (chunkIndex + 1) + "/" + totalChunks + " written to Drive",
    progress: Math.round(((chunkIndex + 1) / totalChunks) * 100)
  });
}

/**
 * Move single file to Trash
 */
function handleDeleteFile(data) {
  const fileId = data.fileId;
  if (!fileId) {
    return responseJSON({ success: false, error: "Missing fileId" }, 400);
  }

  try {
    const file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
    return responseJSON({ success: true, message: "File trashed successfully" });
  } catch (e) {
    return responseJSON({ success: false, error: e.toString() }, 500);
  }
}

/**
 * Move folder and its content to Trash
 */
function handleDeleteFolder(data) {
  const folderId = data.folderId;
  if (!folderId) {
    return responseJSON({ success: false, error: "Missing folderId" }, 400);
  }

  try {
    const folder = DriveApp.getFolderById(folderId);
    folder.setTrashed(true);
    return responseJSON({ success: true, message: "Folder trashed successfully" });
  } catch (e) {
    return responseJSON({ success: false, error: e.toString() }, 500);
  }
}

/**
 * List files in folder
 */
function handleListFiles(data) {
  const folderId = data.folderId;
  if (!folderId) {
    return responseJSON({ success: false, error: "Missing folderId" }, 400);
  }

  const folder = DriveApp.getFolderById(folderId);
  const filesIter = folder.getFiles();
  const fileList = [];

  while (filesIter.hasNext()) {
    const f = filesIter.next();
    const fId = f.getId();
    fileList.push({
      id: fId,
      name: f.getName(),
      mimeType: f.getMimeType(),
      size: f.getSize(),
      url: "https://drive.google.com/uc?export=download&id=" + fId,
      created: f.getDateCreated().toISOString()
    });
  }

  return responseJSON({ success: true, files: fileList });
}

/**
 * List subfolders
 */
function handleListFolders(data) {
  const parentId = data.folderId || getOrCreateRootFolder().getId();
  const parentFolder = DriveApp.getFolderById(parentId);
  const subIter = parentFolder.getFolders();
  const folderList = [];

  while (subIter.hasNext()) {
    const sf = subIter.next();
    folderList.push({
      id: sf.getId(),
      name: sf.getName(),
      url: sf.getUrl()
    });
  }

  return responseJSON({ success: true, folders: folderList });
}

function responseJSON(obj, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
