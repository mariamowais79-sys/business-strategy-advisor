
import React from 'react';
import { Upload } from 'lucide-react';
import { SalesRecord } from '../types';

interface DataUploaderProps {
  onDataLoaded: (data: SalesRecord[]) => void;
}

const DataUploader: React.FC<DataUploaderProps> = ({ onDataLoaded }) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Simple CSV parsing simulation
      const rows = text.split('\n').slice(1);
      const parsedData: SalesRecord[] = rows.map((row, i) => {
        const cols = row.split(',');
        return {
          date: cols[0] || '2024-01-01',
          invoiceNo: cols[1] || `INV-${i}`,
          customerName: cols[2] || 'New Customer',
          distributor: cols[3] || 'Default Distro',
          product: cols[4] || 'Misc SKU',
          quantity: parseInt(cols[5]) || 0,
          revenue: parseFloat(cols[6]) || 0,
          discount: parseFloat(cols[7]) || 0,
          cost: parseFloat(cols[8]) || 0,
          creditDays: parseInt(cols[9]) || 30,
          outstandingAmount: parseFloat(cols[10]) || 0,
          region: cols[11] || 'Global',
          salesRep: cols[12] || 'System',
        };
      });
      if (parsedData.length > 0) onDataLoaded(parsedData);
    };
    reader.readAsText(file);
  };

  return (
    <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg cursor-pointer transition-colors">
      <Upload className="w-4 h-4" />
      <span>Import ERP Export</span>
      <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
    </label>
  );
};

export default DataUploader;
