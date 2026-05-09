'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

/**
 * SearchableSelect - iOS-style combobox dropdown
 *
 * Props:
 *  - options: [{ value, label, description?, icon? }]
 *  - value: current selected value
 *  - onChange: (value) => void
 *  - placeholder: string
 *  - name: string (for hidden input, form compat)
 *  - required: bool
 *  - disabled: bool
 *  - className: extra wrapper classes
 */
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  name,
  required,
  disabled,
  className = '',
  onCreate,
  createLabel = 'Create',
}) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef           = useRef(null);
  const inputRef          = useRef(null);

  const selected = options.find(o => o.value === value);

  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.description || '').toLowerCase().includes(query.toLowerCase())
      )
    : options;

  /* close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* focus search when opening */
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const handleSelect = (opt) => {
    onChange?.(opt.value);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Hidden native input for form submission */}
      {name && (
        <input type="hidden" name={name} value={value ?? ''} required={required} />
      )}

      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`
          input w-full flex items-center justify-between gap-2 text-left
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${open ? 'ring-[3px] ring-primary/20 border-primary' : ''}
        `}
      >
        <span className={selected ? 'font-medium' : 'text-muted'}>
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.icon && <span>{selected.icon}</span>}
              {selected.label}
            </span>
          ) : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="
          absolute z-50 top-full left-0 right-0 mt-2
          bg-surface border border-border rounded-[16px] shadow-card-hover
          overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150
        ">
          {/* Search box */}
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background">
              <Search size={14} className="text-muted flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type to search..."
                className="bg-transparent flex-1 text-sm outline-none placeholder-muted"
              />
            </div>
          </div>

          {/* Options list */}
          <ul className="max-h-52 overflow-y-auto py-1.5">
            {filtered.length === 0 && !onCreate ? (
              <li className="px-4 py-3 text-sm text-muted text-center">
                No results for "{query}"
              </li>
            ) : (
              filtered.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(opt)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left
                        transition-colors duration-100
                        ${isSelected
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'hover:bg-background text-slate-100'}
                      `}
                    >
                      {opt.icon && <span className="text-base">{opt.icon}</span>}
                      <span className="flex-1">
                        <span className="block font-medium">{opt.label}</span>
                        {opt.description && (
                          <span className="block text-xs text-muted mt-0.5">{opt.description}</span>
                        )}
                      </span>
                      {isSelected && <Check size={14} className="text-primary flex-shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {/* + Create button */}
          {onCreate && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setQuery('');
                  onCreate(query);
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                <span className="text-lg leading-none">+</span>
                {query ? `${createLabel} "${query}"` : createLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
