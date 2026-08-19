/**
 * ZENEMOO AI Data Portfolio — Google Apps Script Drive Bridge
 * Deployed as a Web App (Execute as me, Access: Anyone)
 * 
 * Configured with secret verification token for server-to-server security.
 */

const SECRET_TOKEN = "ZENEMOO_DRIVE_SECRET_2026_PORTFOLIO";
const ROOT_FOLDER_NAME = "ZENEMOO_DATA_PORTFOLIO";
const CATEGORIES = ["AUDIO", "VIDEO", "IMAGE", "JSON", "CSV", "PDF"];

/**
 * Handle HTTP POST requests from Zenemoo Backend API
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents || "{}");
    const authHeader = postData.secret || postData.token;

    if (authHeader !== SECRET_TOKEN) {
      return responseJSON({ success: false, error: "Unauthorized: Invalid secret token" }, 401);
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
    service: "Zenemoo Drive Bridge Apps Script",
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
 * Creates dataset folder and default category subfolders
 */
function handleCreateDataset(data) {
  const datasetName = data.datasetName;
  if (!datasetName) {
    return responseJSON({ success: false, error: "Missing datasetName" }, 400);
  }

  const rootFolder = getOrCreateRootFolder();
  let datasetFolder;

  const existingFolders = rootFolder.getFoldersByName(datasetName);
  if (existingFolders.hasNext()) {
    datasetFolder = existingFolders.next();
  } else {
    datasetFolder = rootFolder.createFolder(datasetName);
  }

  const categoryFolders = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    const subFolders = datasetFolder.getFoldersByName(cat);
    if (subFolders.hasNext()) {
      categoryFolders[cat] = subFolders.next().getId();
    } else {
      categoryFolders[cat] = datasetFolder.createFolder(cat).getId();
    }
  }

  return responseJSON({
    success: true,
    dataset: {
      name: datasetName,
      driveFolderId: datasetFolder.getId(),
      driveUrl: datasetFolder.getUrl(),
      categoryFolders: categoryFolders
    }
  });
}

/**
 * Creates custom folder inside a parent folder
 */
function handleCreateFolder(data) {
  const folderName = data.folderName;
  const parentFolderId = data.parentFolderId;

  if (!folderName || !parentFolderId) {
    return responseJSON({ success: false, error: "Missing folderName or parentFolderId" }, 400);
  }

  const parentFolder = DriveApp.getFolderById(parentFolderId);
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
      parentFolderId: parentFolderId,
      url: newFolder.getUrl()
    }
  });
}

/**
 * Upload single file into target dataset & category subfolder
 */
function handleUploadFile(data) {
  let targetFolderId = data.targetFolderId;
  const category = data.category;
  const fileName = data.fileName;
  const mimeType = data.mimeType || "application/octet-stream";
  const base64Data = data.base64Data;

  if (!targetFolderId || !fileName || !base64Data) {
    return responseJSON({ success: false, error: "Missing targetFolderId, fileName, or base64Data" }, 400);
  }

  let parentFolder = DriveApp.getFolderById(targetFolderId);

  // Automatically place file inside category folder (AUDIO, VIDEO, IMAGE, JSON, CSV, PDF)
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
  const directViewUrl = "https://lh3.googleusercontent.com/d/" + fileId;
  const downloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;

  return responseJSON({
    success: true,
    file: {
      id: fileId,
      name: file.getName(),
      mimeType: file.getMimeType(),
      size: file.getSize(),
      folderId: parentFolder.getId(),
      url: directViewUrl,
      downloadUrl: downloadUrl,
      thumbnailUrl: directViewUrl
    }
  });
}

/**
 * Upload chunked file payload for large files
 */
function handleUploadChunk(data) {
  return handleUploadFile(data);
}

/**
 * Deletes file by ID
 */
function handleDeleteFile(data) {
  const fileId = data.fileId;
  if (!fileId) {
    return responseJSON({ success: false, error: "Missing fileId" }, 400);
  }

  const file = DriveApp.getFileById(fileId);
  file.setTrashed(true);

  return responseJSON({ success: true, fileId: fileId, message: "File trashed successfully" });
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
    fileList.push({
      id: f.getId(),
      name: f.getName(),
      mimeType: f.getMimeType(),
      size: f.getSize(),
      url: "https://lh3.googleusercontent.com/d/" + f.getId(),
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
