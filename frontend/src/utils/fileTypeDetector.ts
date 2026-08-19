export type DatasetCategoryType = 'AUDIO' | 'VIDEO' | 'IMAGE' | 'JSON' | 'CSV' | 'PDF' | 'OTHER';

export interface FileCategoryInfo {
  category: DatasetCategoryType;
  extension: string;
  iconName: string;
  badgeBg: string;
  badgeText: string;
}

export function detectFileType(fileName: string, mimeType?: string): FileCategoryInfo {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  // Audio files
  if (
    ['mp3', 'wav', 'm4a', 'flac', 'aac', 'ogg', 'opus', 'wma', 'aiff'].includes(ext) ||
    mime.startsWith('audio/')
  ) {
    return {
      category: 'AUDIO',
      extension: ext || 'mp3',
      iconName: 'Volume2',
      badgeBg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
      badgeText: 'AUDIO',
    };
  }

  // Video files
  if (
    ['mp4', 'mov', 'webm', 'mkv', 'avi', 'wmv', 'flv', 'm4v', '3gp'].includes(ext) ||
    mime.startsWith('video/')
  ) {
    return {
      category: 'VIDEO',
      extension: ext || 'mp4',
      iconName: 'Video',
      badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
      badgeText: 'VIDEO',
    };
  }

  // Image files
  if (
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tiff', 'ico', 'heic'].includes(ext) ||
    mime.startsWith('image/')
  ) {
    return {
      category: 'IMAGE',
      extension: ext || 'png',
      iconName: 'Image',
      badgeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
      badgeText: 'IMAGE',
    };
  }

  // JSON files
  if (
    ['json', 'jsonl', 'geojson'].includes(ext) ||
    mime.includes('json')
  ) {
    return {
      category: 'JSON',
      extension: ext || 'json',
      iconName: 'FileCode',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      badgeText: 'JSON',
    };
  }

  // CSV files
  if (
    ['csv', 'tsv'].includes(ext) ||
    mime.includes('csv') ||
    mime.includes('tab-separated-values')
  ) {
    return {
      category: 'CSV',
      extension: ext || 'csv',
      iconName: 'FileSpreadsheet',
      badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      badgeText: 'CSV',
    };
  }

  // PDF files
  if (
    ext === 'pdf' ||
    mime.includes('pdf')
  ) {
    return {
      category: 'PDF',
      extension: 'pdf',
      iconName: 'FileText',
      badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      badgeText: 'PDF',
    };
  }

  return {
    category: 'OTHER',
    extension: ext || 'file',
    iconName: 'File',
    badgeBg: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
    badgeText: 'FILE',
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
