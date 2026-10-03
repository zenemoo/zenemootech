/**
 * Local IndexedDB Storage Engine for Zenemoo QR Payout & Payment Management Workspace
 * 
 * Features:
 * - 100% Client-Side Persistence (Zero server DB requirements / Zero server egress)
 * - Data survives logout, page refresh, token expiration, and browser restarts
 * - Robust ACID transaction handling via standard HTML5 IndexedDB API
 * - Stores: paymentBatches, paymentRecords, paymentSettings, paymentBackups
 * - Full backup export (JSON) and validated restore capabilities
 */

export interface LocalPaymentRecord {
  id: string;
  batchId: string;
  name: string;
  upiId: string;
  email: string;
  amount: number;
  currency: string;
  workType: string;
  status: 'Pending' | 'Processing' | 'Paid' | 'Issue' | 'Cancelled';
  utr?: string | null;
  paymentDate?: string | null;
  issueType?: string | null;
  issueNotes?: string | null;
  sourceFileName?: string;
  sourceRowNumber?: number;
  originalRowData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface LocalPaymentBatch {
  id: string;
  name: string;
  sourceFileName: string;
  uploadDate: string;
  totalWorkers: number;
  totalAmount: number;
  statusCounts: {
    Pending: number;
    Processing: number;
    Paid: number;
    Issue: number;
    Cancelled: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LocalPaymentSummary {
  totalBatches: number;
  totalRecords: number;
  totalAmount: number;
  totalPaidAmount: number;
  statusCounts: {
    Pending: number;
    Processing: number;
    Paid: number;
    Issue: number;
    Cancelled: number;
  };
}

export interface LocalBackupPayload {
  version: string;
  exportedAt: string;
  system: string;
  batches: LocalPaymentBatch[];
  records: LocalPaymentRecord[];
  settings?: Record<string, any>;
}

const DB_NAME = 'ZenemooLocalPaymentDB';
const DB_VERSION = 1;

class LocalPaymentDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this browser environment.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. paymentBatches Store
        if (!db.objectStoreNames.contains('paymentBatches')) {
          const batchStore = db.createObjectStore('paymentBatches', { keyPath: 'id' });
          batchStore.createIndex('createdAt', 'createdAt', { unique: false });
          batchStore.createIndex('uploadDate', 'uploadDate', { unique: false });
        }

        // 2. paymentRecords Store
        if (!db.objectStoreNames.contains('paymentRecords')) {
          const recordStore = db.createObjectStore('paymentRecords', { keyPath: 'id' });
          recordStore.createIndex('batchId', 'batchId', { unique: false });
          recordStore.createIndex('status', 'status', { unique: false });
          recordStore.createIndex('email', 'email', { unique: false });
          recordStore.createIndex('upiId', 'upiId', { unique: false });
          recordStore.createIndex('paymentDate', 'paymentDate', { unique: false });
          recordStore.createIndex('utr', 'utr', { unique: false });
          recordStore.createIndex('createdAt', 'createdAt', { unique: false });
          recordStore.createIndex('workType', 'workType', { unique: false });
        }

        // 3. paymentSettings Store
        if (!db.objectStoreNames.contains('paymentSettings')) {
          db.createObjectStore('paymentSettings', { keyPath: 'key' });
        }

        // 4. paymentBackups Store
        if (!db.objectStoreNames.contains('paymentBackups')) {
          const backupStore = db.createObjectStore('paymentBackups', { keyPath: 'id' });
          backupStore.createIndex('exportedAt', 'exportedAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this.dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error || new Error('Failed to open Zenemoo IndexedDB'));
      };

      request.onblocked = () => {
        console.warn('[IndexedDB] Database upgrade blocked by another open tab.');
      };
    });

    return this.dbPromise;
  }

  // --- BATCH MANAGEMENT ---

  async createBatch(
    batchData: Omit<LocalPaymentBatch, 'id' | 'createdAt' | 'updatedAt' | 'totalWorkers' | 'totalAmount' | 'statusCounts'>,
    records: Array<Omit<LocalPaymentRecord, 'id' | 'batchId' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ batch: LocalPaymentBatch; recordsCount: number }> {
    const db = await this.openDb();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    let totalAmount = 0;
    const statusCounts = {
      Pending: 0,
      Processing: 0,
      Paid: 0,
      Issue: 0,
      Cancelled: 0,
    };

    const finalRecords: LocalPaymentRecord[] = records.map((rec, index) => {
      const recAmount = Number(rec.amount) || 0;
      totalAmount += recAmount;

      const recStatus = rec.status || 'Pending';
      if (statusCounts[recStatus] !== undefined) {
        statusCounts[recStatus]++;
      } else {
        statusCounts.Pending++;
      }

      return {
        ...rec,
        id: `rec_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
        batchId,
        amount: recAmount,
        currency: rec.currency || 'INR',
        status: recStatus,
        sourceFileName: rec.sourceFileName || batchData.sourceFileName,
        sourceRowNumber: rec.sourceRowNumber || index + 1,
        createdAt: now,
        updatedAt: now,
      };
    });

    const finalBatch: LocalPaymentBatch = {
      ...batchData,
      id: batchId,
      totalWorkers: finalRecords.length,
      totalAmount,
      statusCounts,
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['paymentBatches', 'paymentRecords'], 'readwrite');
      const batchStore = tx.objectStore('paymentBatches');
      const recordStore = tx.objectStore('paymentRecords');

      tx.onerror = () => reject(tx.error || new Error('Batch transaction failed'));
      tx.oncomplete = () => resolve({ batch: finalBatch, recordsCount: finalRecords.length });

      batchStore.add(finalBatch);
      for (const r of finalRecords) {
        recordStore.add(r);
      }
    });
  }

  async getBatches(): Promise<LocalPaymentBatch[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('paymentBatches', 'readonly');
      const store = tx.objectStore('paymentBatches');
      const request = store.getAll();

      request.onsuccess = () => {
        const list = (request.result || []) as LocalPaymentBatch[];
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getBatchById(id: string): Promise<LocalPaymentBatch | null> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('paymentBatches', 'readonly');
      const store = tx.objectStore('paymentBatches');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteBatch(batchId: string): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['paymentBatches', 'paymentRecords'], 'readwrite');
      const batchStore = tx.objectStore('paymentBatches');
      const recordStore = tx.objectStore('paymentRecords');
      const index = recordStore.index('batchId');

      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();

      batchStore.delete(batchId);

      const request = index.getAllKeys(batchId);
      request.onsuccess = () => {
        const keys = request.result || [];
        for (const k of keys) {
          recordStore.delete(k);
        }
      };
    });
  }

  // --- RECORD MANAGEMENT ---

  async getPaymentRecords(params: {
    batchId?: string;
    search?: string;
    status?: string;
    workType?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'amount' | 'paymentDate' | 'createdAt' | 'name';
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ records: LocalPaymentRecord[]; total: number; totalPages: number }> {
    const db = await this.openDb();
    const {
      batchId,
      search = '',
      status = 'All',
      workType = 'All',
      page = 1,
      pageSize = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = params;

    return new Promise((resolve, reject) => {
      const tx = db.transaction('paymentRecords', 'readonly');
      const store = tx.objectStore('paymentRecords');
      const request = batchId && batchId !== 'All' ? store.index('batchId').getAll(batchId) : store.getAll();

      request.onsuccess = () => {
        let allRecords = (request.result || []) as LocalPaymentRecord[];

        // Filter search term
        const cleanSearch = search.trim().toLowerCase();
        if (cleanSearch) {
          allRecords = allRecords.filter((r) => {
            const nameMatch = (r.name || '').toLowerCase().includes(cleanSearch);
            const upiMatch = (r.upiId || '').toLowerCase().includes(cleanSearch);
            const emailMatch = (r.email || '').toLowerCase().includes(cleanSearch);
            const utrMatch = (r.utr || '').toLowerCase().includes(cleanSearch);
            const workMatch = (r.workType || '').toLowerCase().includes(cleanSearch);
            return nameMatch || upiMatch || emailMatch || utrMatch || workMatch;
          });
        }

        // Filter status
        if (status && status !== 'All') {
          allRecords = allRecords.filter((r) => r.status === status);
        }

        // Filter work type
        if (workType && workType !== 'All') {
          allRecords = allRecords.filter((r) => r.workType === workType);
        }

        // Sort
        allRecords.sort((a, b) => {
          let valA: any = a[sortBy] ?? '';
          let valB: any = b[sortBy] ?? '';

          if (sortBy === 'amount') {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
          } else if (sortBy === 'paymentDate' || sortBy === 'createdAt') {
            valA = new Date(valA || 0).getTime();
            valB = new Date(valB || 0).getTime();
          } else {
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
          }

          if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
          if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
          return 0;
        });

        const total = allRecords.length;
        const totalPages = Math.ceil(total / pageSize) || 1;
        const startIndex = (page - 1) * pageSize;
        const paginated = allRecords.slice(startIndex, startIndex + pageSize);

        resolve({
          records: paginated,
          total,
          totalPages,
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAllPaymentRecordsForExport(batchId?: string): Promise<LocalPaymentRecord[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('paymentRecords', 'readonly');
      const store = tx.objectStore('paymentRecords');
      const request = batchId && batchId !== 'All' ? store.index('batchId').getAll(batchId) : store.getAll();

      request.onsuccess = () => {
        const records = (request.result || []) as LocalPaymentRecord[];
        records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPaymentRecordById(id: string): Promise<LocalPaymentRecord | null> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('paymentRecords', 'readonly');
      const store = tx.objectStore('paymentRecords');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async updatePaymentRecord(id: string, updates: Partial<LocalPaymentRecord>): Promise<LocalPaymentRecord> {
    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['paymentRecords', 'paymentBatches'], 'readwrite');
      const recordStore = tx.objectStore('paymentRecords');
      const batchStore = tx.objectStore('paymentBatches');

      const getReq = recordStore.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result as LocalPaymentRecord | undefined;
        if (!existing) {
          reject(new Error(`Payment record with ID "${id}" not found in IndexedDB.`));
          return;
        }

        const prevStatus = existing.status;
        const updatedRecord: LocalPaymentRecord = {
          ...existing,
          ...updates,
          id, // ensure ID cannot be altered
          updatedAt: new Date().toISOString(),
        };

        recordStore.put(updatedRecord);

        // Update batch counts if status changed
        if (updates.status && updates.status !== prevStatus && existing.batchId) {
          const batchReq = batchStore.get(existing.batchId);
          batchReq.onsuccess = () => {
            const batch = batchReq.result as LocalPaymentBatch | undefined;
            if (batch && batch.statusCounts) {
              if (batch.statusCounts[prevStatus] !== undefined) {
                batch.statusCounts[prevStatus] = Math.max(0, batch.statusCounts[prevStatus] - 1);
              }
              if (batch.statusCounts[updates.status!] !== undefined) {
                batch.statusCounts[updates.status!]++;
              }
              batch.updatedAt = new Date().toISOString();
              batchStore.put(batch);
            }
          };
        }
      };

      tx.oncomplete = () => {
        resolve(this.getPaymentRecordById(id) as Promise<LocalPaymentRecord>);
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  async deletePaymentRecord(id: string): Promise<void> {
    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['paymentRecords', 'paymentBatches'], 'readwrite');
      const recordStore = tx.objectStore('paymentRecords');
      const batchStore = tx.objectStore('paymentBatches');

      const getReq = recordStore.get(id);

      getReq.onsuccess = () => {
        const record = getReq.result as LocalPaymentRecord | undefined;
        if (record) {
          recordStore.delete(id);

          // Update batch totals
          if (record.batchId) {
            const batchReq = batchStore.get(record.batchId);
            batchReq.onsuccess = () => {
              const batch = batchReq.result as LocalPaymentBatch | undefined;
              if (batch) {
                batch.totalWorkers = Math.max(0, batch.totalWorkers - 1);
                batch.totalAmount = Math.max(0, batch.totalAmount - (record.amount || 0));
                if (batch.statusCounts && batch.statusCounts[record.status] !== undefined) {
                  batch.statusCounts[record.status] = Math.max(0, batch.statusCounts[record.status] - 1);
                }
                batch.updatedAt = new Date().toISOString();
                batchStore.put(batch);
              }
            };
          }
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- SUMMARY METRICS ---

  async getLocalSummary(batchId?: string): Promise<LocalPaymentSummary> {
    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['paymentBatches', 'paymentRecords'], 'readonly');
      const batchStore = tx.objectStore('paymentBatches');
      const recordStore = tx.objectStore('paymentRecords');

      let batches: LocalPaymentBatch[] = [];
      let records: LocalPaymentRecord[] = [];

      const batchReq = batchStore.getAll();
      batchReq.onsuccess = () => {
        batches = batchReq.result || [];
      };

      const recordReq = batchId && batchId !== 'All' ? recordStore.index('batchId').getAll(batchId) : recordStore.getAll();
      recordReq.onsuccess = () => {
        records = recordReq.result || [];
      };

      tx.oncomplete = () => {
        const statusCounts = {
          Pending: 0,
          Processing: 0,
          Paid: 0,
          Issue: 0,
          Cancelled: 0,
        };

        let totalAmount = 0;
        let totalPaidAmount = 0;

        for (const r of records) {
          const amt = Number(r.amount) || 0;
          totalAmount += amt;

          if (r.status === 'Paid') {
            totalPaidAmount += amt;
          }

          if (statusCounts[r.status] !== undefined) {
            statusCounts[r.status]++;
          } else {
            statusCounts.Pending++;
          }
        }

        resolve({
          totalBatches: batchId && batchId !== 'All' ? 1 : batches.length,
          totalRecords: records.length,
          totalAmount,
          totalPaidAmount,
          statusCounts,
        });
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  // --- BACKUP & RESTORE ---

  async exportLocalBackup(): Promise<LocalBackupPayload> {
    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['paymentBatches', 'paymentRecords', 'paymentSettings'], 'readonly');
      const batchStore = tx.objectStore('paymentBatches');
      const recordStore = tx.objectStore('paymentRecords');

      const bReq = batchStore.getAll();
      const rReq = recordStore.getAll();

      tx.oncomplete = () => {
        const backup: LocalBackupPayload = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          system: 'Zenemoo QR Payment Management',
          batches: bReq.result || [],
          records: rReq.result || [],
        };
        resolve(backup);
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  async restoreLocalBackup(backupData: any): Promise<{ batchesCount: number; recordsCount: number }> {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Invalid backup file: Root object missing.');
    }

    if (!Array.isArray(backupData.batches) || !Array.isArray(backupData.records)) {
      throw new Error('Invalid backup format: "batches" and "records" arrays are required.');
    }

    const db = await this.openDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['paymentBatches', 'paymentRecords'], 'readwrite');
      const batchStore = tx.objectStore('paymentBatches');
      const recordStore = tx.objectStore('paymentRecords');

      tx.onerror = () => reject(tx.error || new Error('Restore transaction failed'));
      tx.oncomplete = () => {
        resolve({
          batchesCount: backupData.batches.length,
          recordsCount: backupData.records.length,
        });
      };

      for (const batch of backupData.batches) {
        if (batch && batch.id) {
          batchStore.put(batch);
        }
      }

      for (const rec of backupData.records) {
        if (rec && rec.id) {
          recordStore.put(rec);
        }
      }
    });
  }

  async clearAllLocalData(): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['paymentBatches', 'paymentRecords', 'paymentBackups'], 'readwrite');
      tx.objectStore('paymentBatches').clear();
      tx.objectStore('paymentRecords').clear();
      tx.objectStore('paymentBackups').clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const localPaymentDb = new LocalPaymentDbService();
