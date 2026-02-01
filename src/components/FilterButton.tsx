'use client';

interface FilterButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  hint?: string;
}

export function FilterButton({ label, active, onClick, hint }: FilterButtonProps) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`px-4 py-2 text-xs tracking-wider uppercase rounded transition-all duration-200 ${
          active
            ? 'bg-white text-black font-bold'
            : 'bg-black text-slate-500 border border-slate-700 hover:border-slate-500 hover:text-slate-300'
        }`}
      >
        {label}
      </button>
      
      {hint && (
        <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-900 border border-slate-700 rounded text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {hint}
          <div className="absolute top-full left-4 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 transform rotate-45 -translate-y-1" />
        </div>
      )}
    </div>
  );
}
