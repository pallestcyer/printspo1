import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('YOUR_RAILWAY_URL/api/scrape-pinterest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      setImages(data.images);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Pinterest Board to Print</h1>
        
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-4 max-w-2xl mx-auto">
            <input
              type="url"
              placeholder="Enter Pinterest board URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300"
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:bg-blue-300"
            >
              {loading ? 'Loading...' : 'Generate'}
            </button>
          </div>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="aspect-[3/4] relative overflow-hidden rounded-lg">
              <Image
                src={image.url}
                alt={image.alt || 'Pinterest image'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}