export const theme = {
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      500: '#6b7280',
      700: '#374151',
    }
  },
  spacing: {
    container: 'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8',
    section: 'py-12',
    stack: 'space-y-6',
  },
  components: {
    card: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden',
    button: {
      base: 'rounded-lg font-medium transition-all',
      primary: 'bg-blue-500 text-white hover:bg-blue-600',
      secondary: 'border border-gray-200 hover:border-blue-300 hover:bg-gray-50',
    }
  }
}; 