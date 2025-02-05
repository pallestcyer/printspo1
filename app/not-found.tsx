export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <p className="text-gray-600 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <a 
          href="/" 
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Return Home
        </a>
      </div>
    </div>
  );
} 