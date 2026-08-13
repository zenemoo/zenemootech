/**
 * Utility to format raw custom application form answers cleanly for presentation.
 * Eliminates JSON array/object syntax (e.g., ["6+ Hours (Full-Time)"]) and formats arrays, booleans, and strings.
 */
export const formatApplicationAnswer = (value: any): string => {
  if (value === null || value === undefined || value === '') {
    return 'Not provided';
  }

  // Handle boolean values
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Handle arrays directly
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Not provided';
    return value.map((item) => formatApplicationAnswer(item)).join(', ');
  }

  // Handle string values (check if string contains JSON serialized array or object)
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Check for JSON array string e.g. ["6+ Hours (Full-Time)"] or ["Hindi", "Odia"]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return formatApplicationAnswer(parsed);
        }
      } catch (_) {}
    }

    // Check for JSON object string e.g. {"value":"Yes"}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          return formatApplicationAnswer(parsed);
        }
      } catch (_) {}
    }

    return trimmed;
  }

  // Handle objects
  if (typeof value === 'object') {
    if (value.value !== undefined) {
      return formatApplicationAnswer(value.value);
    }
    if (value.label !== undefined) {
      return formatApplicationAnswer(value.label);
    }
    if (value.answer !== undefined) {
      return formatApplicationAnswer(value.answer);
    }
    try {
      const vals = Object.values(value).filter((v) => v !== null && v !== undefined && v !== '');
      if (vals.length > 0) return vals.map((v) => formatApplicationAnswer(v)).join(', ');
    } catch (_) {}
    return JSON.stringify(value);
  }

  return String(value);
};
