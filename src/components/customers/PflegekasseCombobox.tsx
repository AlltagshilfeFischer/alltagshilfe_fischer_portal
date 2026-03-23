import { useState, useMemo, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Fuse from 'fuse.js';

const PFLEGEKASSEN = [
  'AOK Niedersachsen',
  'AOK Baden-Württemberg',
  'AOK Bayern',
  'AOK Nordost',
  'AOK Rheinland/Hamburg',
  'AOK PLUS',
  'AOK Sachsen-Anhalt',
  'AOK NordWest',
  'AOK Hessen',
  'AOK Bremen/Bremerhaven',
  'AOK Rheinland-Pfalz/Saarland',
  'Barmer',
  'DAK-Gesundheit',
  'Techniker Krankenkasse (TK)',
  'IKK classic',
  'IKK gesund plus',
  'KKH Kaufmännische Krankenkasse',
  'HEK Hanseatische Krankenkasse',
  'hkk',
  'Knappschaft',
  'Mobil Krankenkasse',
  'Viactiv Krankenkasse',
  'Novitas BKK',
  'Pronova BKK',
  'Audi BKK',
  'BMW BKK',
  'Bosch BKK',
  'BKK VBU',
  'Debeka BKK',
  'Privat versichert',
];

interface PflegekasseComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function PflegekasseCombobox({
  value,
  onValueChange,
  placeholder = 'Pflegekasse auswählen...',
}: PflegekasseComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = useMemo(() => {
    return new Fuse(PFLEGEKASSEN.map((name) => ({ name })), {
      keys: ['name'],
      threshold: 0.4,
      distance: 100,
      minMatchCharLength: 1,
    });
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return PFLEGEKASSEN;
    return fuse.search(searchQuery).map((result) => result.item.name);
  }, [searchQuery, fuse]);

  // Pruefen ob der Suchtext exakt einem Eintrag entspricht
  const isExactMatch = useMemo(() => {
    return PFLEGEKASSEN.some(
      (k) => k.toLowerCase() === searchQuery.toLowerCase()
    );
  }, [searchQuery]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  const selectItem = (item: string) => {
    onValueChange(item);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          !value && "text-muted-foreground"
        )}
        onClick={() => {
          setOpen(!open);
          if (open) setSearchQuery('');
        }}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+4px)] left-0 w-full z-[99999] bg-popover border border-border rounded-md shadow-lg overflow-hidden"
          onPointerDownCapture={(e) => e.stopPropagation()}
          onMouseDownCapture={(e) => e.stopPropagation()}
          onFocusCapture={(e) => e.stopPropagation()}
        >
          <div className="flex items-center border-b border-border px-3 py-2 gap-2">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Pflegekasse suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') {
                  setOpen(false);
                  setSearchQuery('');
                }
              }}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground min-w-0"
              autoComplete="off"
              spellCheck={false}
            />
            {searchQuery && (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto overscroll-contain">
            {/* Freitext-Option wenn Suche keinem Eintrag entspricht */}
            {searchQuery.trim() && !isExactMatch && (
              <div
                role="option"
                className="flex items-center w-full px-3 py-2 text-sm cursor-pointer transition-colors select-none hover:bg-accent hover:text-accent-foreground border-b border-border"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  selectItem(searchQuery.trim());
                }}
              >
                <span className="truncate">
                  &laquo;{searchQuery.trim()}&raquo; verwenden
                </span>
              </div>
            )}

            {filteredItems.length === 0 && !searchQuery.trim() ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Keine Einträge
              </p>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item}
                  role="option"
                  aria-selected={value === item}
                  className={cn(
                    "flex items-center w-full px-3 py-2 text-sm cursor-pointer transition-colors select-none",
                    "hover:bg-accent hover:text-accent-foreground",
                    value === item && "bg-accent/50"
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectItem(item);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 flex-shrink-0',
                      value === item ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{item}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
