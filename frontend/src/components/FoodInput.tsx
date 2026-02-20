import { useState } from 'react';

interface FoodInputProps {
  onSubmit: (input: string) => void;
  loading: boolean;
  disabled: boolean;
}

export default function FoodInput({ onSubmit, loading, disabled }: FoodInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe what you ate..."
        disabled={disabled || loading}
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
      />
      <button
        type="submit"
        disabled={disabled || loading || !value.trim()}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {loading ? 'Parsing...' : 'Log'}
      </button>
    </form>
  );
}
