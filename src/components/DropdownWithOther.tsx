import { useState } from 'react';
import { Plus } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  allowAddNew?: boolean;
  onAddNew?: (v: string) => void;
}

/**
 * Dropdown with built-in "Other" option that shows an inline text input.
 * Also supports "Add New" for user-managed lists.
 */
export default function DropdownWithOther({
  value, onChange, options, label, placeholder, required, className = '', allowAddNew, onAddNew,
}: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newValue, setNewValue] = useState('');

  const isOther = value && !options.includes(value) && value !== '';

  const handleSelect = (v: string) => {
    if (v === '__other__') {
      setShowCustom(true);
      setCustomValue(value && !options.includes(value) ? value : '');
    } else if (v === '__add_new__') {
      setAddingNew(true);
      setNewValue('');
    } else {
      setShowCustom(false);
      onChange(v);
    }
  };

  const confirmCustom = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setShowCustom(false);
    }
  };

  const confirmAddNew = () => {
    if (newValue.trim()) {
      onAddNew?.(newValue.trim());
      onChange(newValue.trim());
      setAddingNew(false);
      setNewValue('');
    }
  };

  if (addingNew) {
    return (
      <div className={className}>
        <label className="text-xs text-muted-foreground">{label} {required && <span className="text-destructive">*</span>}</label>
        <div className="flex gap-1 mt-1">
          <input
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            placeholder={`New ${label.toLowerCase()}...`}
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && confirmAddNew()}
          />
          <button onClick={confirmAddNew} className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">Add</button>
          <button onClick={() => setAddingNew(false)} className="rounded-md border px-2 py-1 text-xs">✕</button>
        </div>
      </div>
    );
  }

  if (showCustom || isOther) {
    return (
      <div className={className}>
        <label className="text-xs text-muted-foreground">{label} {required && <span className="text-destructive">*</span>}</label>
        <div className="flex gap-1 mt-1">
          <input
            value={isOther && !showCustom ? value : customValue}
            onChange={e => { setCustomValue(e.target.value); if (isOther && !showCustom) onChange(e.target.value); }}
            placeholder="Type custom value..."
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && confirmCustom()}
          />
          {showCustom && <button onClick={confirmCustom} className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">OK</button>}
          <button onClick={() => { setShowCustom(false); onChange(options[0] || ''); }} className="rounded-md border px-2 py-1 text-xs">✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="text-xs text-muted-foreground">{label} {required && <span className="text-destructive">*</span>}</label>
      <select
        value={value}
        onChange={e => handleSelect(e.target.value)}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {allowAddNew && (
          <option value="__add_new__">＋ Add New {label}</option>
        )}
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
        <option value="__other__">Other...</option>
      </select>
    </div>
  );
}
