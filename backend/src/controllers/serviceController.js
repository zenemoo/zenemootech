import { supabaseService } from '../services/supabaseService.js';

const INITIAL_SERVICES = [
  {
    id: '1',
    title: 'Audio Transcription',
    subtitle: 'Clean Verbatim & Timestamps',
    description: 'Speech-to-text transcription with segmentation, speaker labeling, and timestamping according to strict project guidelines.',
    features: ['Clean, verbatim, and timestamped transcription', 'Multi-speaker and utterance segmentation', 'TXT, DOCX, SRT or custom formats'],
    tag: 'Core Speech Service',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    id: '2',
    title: 'AI Data Collection',
    subtitle: 'Voice, Image & Video Datasets',
    description: 'Multilingual data collection services for AI and machine learning model datasets.',
    features: ['Voice data collection in multiple languages', 'Image and video data collection projects', 'Metadata and labeling support'],
    tag: 'AI Dataset Engine',
    color: 'from-purple-500 to-pink-600',
  },
];

let memoryServices = [...INITIAL_SERVICES];

export const getServices = async (req, res, next) => {
  try {
    const data = await supabaseService.selectAll('services');
    if (data && data.length > 0) return res.json({ success: true, data });
    res.json({ success: true, data: memoryServices });
  } catch (err) {
    res.json({ success: true, data: memoryServices });
  }
};

export const createService = async (req, res, next) => {
  try {
    const newService = { id: Date.now().toString(), ...req.body };
    try {
      const created = await supabaseService.insert('services', newService);
      if (created) return res.status(201).json({ success: true, data: created });
    } catch (e) {}

    memoryServices.unshift(newService);
    res.status(201).json({ success: true, data: newService });
  } catch (err) {
    next(err);
  }
};

export const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedData = { ...req.body };
    try {
      const updated = await supabaseService.update('services', id, updatedData);
      if (updated) return res.json({ success: true, data: updated });
    } catch (e) {}

    memoryServices = memoryServices.map((s) => (s.id === id ? { ...s, ...updatedData } : s));
    res.json({ success: true, data: { id, ...updatedData } });
  } catch (err) {
    next(err);
  }
};

export const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await supabaseService.delete('services', id);
    } catch (e) {}

    memoryServices = memoryServices.filter((s) => s.id !== id);
    res.json({ success: true, message: 'Service deleted' });
  } catch (err) {
    next(err);
  }
};
