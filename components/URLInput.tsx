import { Loader2 } from 'lucide-react';
import { theme } from '@/components/ui/theme';

interface URLInputProps {
  url: string;
  setUrl: (url: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
}

export const URLInput = ({ url, setUrl, onSubmit, loading, error }: URLInputProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter Pinterest board URL"
          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          required
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url}
          className={`
            ${theme.components.button.base}
            ${theme.components.button.primary}
            px-6 py-2
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2
          `}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Importing...</span>
            </>
          ) : (
            <span>Import Images</span>
          )}
        </button>
      </div>
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
    </form>
  );
}; 