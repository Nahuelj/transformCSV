'use client';

import { useState, useRef } from 'react';

export default function CsvTransformer() {
  const [status, setStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (!file) return;
    setIsProcessing(true);
    setStatus('Procesando...');

    const reader = new FileReader();
    reader.onload = function (e) {
      const text = e.target?.result as string;
      try {
        const csvData = transformData(text);
        downloadCSV(csvData, 'Para_Pegar_En_Total.csv');
        setStatus('¡Listo! Archivo descargado.');
        setIsProcessing(false);
      } catch (err) {
        console.error(err);
        setStatus('Error: El formato del archivo no coincide.');
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFile(file || null);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const normalizeValue = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const transformData = (csvText: string): string => {
    const delimiter = csvText.indexOf(';') > -1 ? ';' : ',';
    const lines = csvText.split(/\r\n|\n/);

    let headerIndex = -1;
    let headerRow: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const cells = line.split(delimiter).map((cell) => cell.trim());
      if (cells.length < 4) continue;

      const operatorCandidates = cells
        .slice(3)
        .filter((cell) => cell && /[a-zA-Z]/.test(cell));

      if (operatorCandidates.length) {
        headerIndex = i;
        headerRow = cells;
        break;
      }
    }

    if (headerIndex === -1) throw new Error('No encontré los encabezados');

    const operators: { name: string; index: number }[] = [];
    for (let i = 3; i < headerRow.length; i++) {
      const name = headerRow[i]?.trim();
      if (!name || /total/i.test(name)) continue;
      operators.push({ name, index: i });
    }

    if (!operators.length) throw new Error('No encontré los operadores');

    const output = ['Fecha,Línea,Operador,Cantidad'];
    let lastDate = '';
    let lastLine = '';

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const cells = line.split(delimiter).map((cell) => cell.trim());
      if (cells.length < 3) continue;

      const dateCell = cells[1] || '';
      const lineCell = cells[2] || '';
      const normalizedLine = normalizeValue(lineCell);
      const normalizedDate = normalizeValue(dateCell);

      if (normalizedLine.includes('total') || normalizedDate.includes('total')) {
        continue;
      }

      const currentDate = dateCell || lastDate;
      if (!currentDate) continue;
      lastDate = currentDate;

      const currentLine = lineCell || lastLine;
      if (!currentLine) continue;
      lastLine = currentLine;

      operators.forEach((operator) => {
        const value = cells[operator.index] || '';
        output.push(
          `${currentDate},${currentLine},${operator.name},${value}`
        );
      });
    }

    return output.join('\n');
  };

  const downloadCSV = (csvContent: string, fileName: string) => {
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f2f5]">
      <div className="bg-white rounded-xl shadow-lg p-10 text-center w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          Transformador Diario
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          Sube tu archivo "Mesa de corte" (.csv)
        </p>

        <div
          className="border-2 border-dashed border-gray-300 p-10 rounded-lg cursor-pointer transition-all duration-300 bg-gray-50 hover:border-blue-500 hover:bg-blue-50"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <span className="text-gray-600">
            Arrastra tu archivo aquí
            <br />
            o haz clic para buscar
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>

        {status && (
          <div
            className={`mt-5 font-semibold min-h-6 ${
              status.includes('Error')
                ? 'text-red-500'
                : status.includes('Listo')
                ? 'text-green-500'
                : 'text-blue-500'
            }`}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

