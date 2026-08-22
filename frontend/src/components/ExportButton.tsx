import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { ExportModal } from './ExportModal';

export interface ExportButtonProps {
  sectionId: string;
  sectionName?: string;
  dataset: any[];
  filteredDataset?: any[];
  showToast?: (msg: string, type?: any) => void;
  className?: string;
  label?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  sectionId,
  sectionName,
  dataset = [],
  filteredDataset,
  showToast,
  className = '',
  label = 'Export Data',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeCount =
    Array.isArray(filteredDataset) && filteredDataset.length > 0
      ? filteredDataset.length
      : Array.isArray(dataset)
      ? dataset.length
      : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0 hover:shadow-md hover:shadow-cyan-500/10 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${className}`}
        aria-label={`Export data for ${sectionId}`}
      >
        <Download className="w-4 h-4 text-cyan-400" />
        <span>{label}</span>
        <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-200 text-[10px] font-bold">
          {activeCount}
        </span>
      </button>

      <ExportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sectionId={sectionId}
        sectionName={sectionName}
        dataset={dataset}
        filteredDataset={filteredDataset}
        showToast={showToast}
      />
    </>
  );
};
