'use client';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const COLOR_PRESETS = [
  { name: '墨绿', value: '#044332' },
  { name: '深蓝', value: '#1e3a5f' },
  { name: '酒红', value: '#7c2d3a' },
  { name: '紫黑', value: '#2d1b3d' },
  { name: '靛蓝', value: '#1e3a8a' },
  { name: '森林', value: '#166534' },
];

interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorPickerField({ label, value, onChange }: ColorPickerFieldProps) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {COLOR_PRESETS.map((c) => {
          const active = value.toLowerCase() === c.value.toLowerCase();
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange(c.value)}
              className={cn(
                'group flex items-center gap-1.5 px-2 py-1 border rounded text-xs transition-all',
                active
                  ? 'border-[#044332] bg-[#044332]/5 text-[#044332] ring-1 ring-[#044332]/30 font-medium'
                  : 'border-gray-200 text-gray-700 hover:border-[#044332]/60 hover:bg-[#044332]/5'
              )}
            >
              <div
                className="h-4 w-4 rounded ring-1 ring-black/5"
                style={{ backgroundColor: c.value }}
              />
              <span>{c.name}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 border border-gray-300 bg-white rounded cursor-pointer transition-all hover:border-[#044332]/60"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'flex-1 font-mono text-sm',
            'border-gray-300 bg-white',
            'hover:border-[#044332]/60 hover:bg-[#044332]/5',
            'focus-visible:!border-[#044332] focus-visible:!ring-2 focus-visible:!ring-[#044332]/25',
            'focus:!border-[#044332] focus:!ring-2 focus:!ring-[#044332]/25 focus:bg-[#044332]/5',
            'placeholder:text-gray-400',
            'transition-all duration-150'
          )}
          maxLength={7}
          pattern="^#[0-9a-fA-F]{6}$"
        />
      </div>
    </div>
  );
}