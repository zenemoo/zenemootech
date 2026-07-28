import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFilePath = path.join(__dirname, '../../audit_logs.json');

/**
 * Record a security audit log event
 */
export function recordAuditLog(event, details = {}) {
  const logEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    event,
    timestamp: new Date().toISOString(),
    ip: details.ip || '127.0.0.1',
    user_agent: details.userAgent || 'Zenemoo-Admin-Client',
    email: details.email || 'admin@zenemoo.in',
    status: details.status || 'SUCCESS',
    message: details.message || '',
  };

  try {
    let logs = [];
    if (fs.existsSync(logFilePath)) {
      const data = fs.readFileSync(logFilePath, 'utf8');
      logs = JSON.parse(data || '[]');
    }
    logs.unshift(logEntry);
    if (logs.length > 500) logs = logs.slice(0, 500); // keep last 500 events
    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.error('Audit Logger error:', err.message);
  }

  return logEntry;
}

/**
 * Retrieve recent audit logs
 */
export function getAuditLogs(limit = 50) {
  try {
    if (fs.existsSync(logFilePath)) {
      const data = fs.readFileSync(logFilePath, 'utf8');
      const logs = JSON.parse(data || '[]');
      return logs.slice(0, limit);
    }
  } catch (err) {
    console.error('Audit Log read error:', err.message);
  }
  return [];
}
