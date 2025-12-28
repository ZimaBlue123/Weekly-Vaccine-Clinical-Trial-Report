import React from 'react';

interface ReportPreviewProps {
  content: string;
}

const ReportPreview: React.FC<ReportPreviewProps> = ({ content }) => {
  if (!content) return null;

  // Render logic for WeCom-compatible HTML
  // We strictly look for <font color="warning"> for titles
  // And simple text for the rest, preserving line breaks
  const createMarkup = (html: string) => {
    let formatted = html
      // Render the Title Red/Orange
      .replace(/<font color="warning">/g, '<div class="text-orange-600 font-bold text-lg mt-6 mb-2">')
      .replace(/<\/font>/g, '</div>')
      // Ensure we clean up any accidental bold tags if the model slipped up, though prompt forbids it
      .replace(/<b>/g, '')
      .replace(/<\/b>/g, '')
      .replace(/\*\*/g, '')
      // Convert newlines to breaks for HTML display
      .replace(/\n/g, '<br />');

    return { __html: formatted };
  };

  return (
    <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-semibold text-slate-700">Latest Report Preview</h3>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">WeCom Format</span>
      </div>
      <div 
        className="p-6 text-sm text-slate-700 leading-relaxed font-sans"
        dangerouslySetInnerHTML={createMarkup(content)}
      />
    </div>
  );
};

export default ReportPreview;