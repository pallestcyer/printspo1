import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { PrintBoardPreview } from './PrintBoardPreview';
import { ImageSelectionSection } from './ImageSelectionSection';
import { PRINT_SIZES } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import Image from 'next/image';
import { type PrintSize as ImportedPrintSize } from '@/app/types/order';
import { cn } from '@/lib/utils';

interface LocalPrintSize {
  width: number;
  height: number;
  price: number;
  name: string;
}

interface Board {
  id: string;
  url: string;
  name: string;
  scrapedImages: Array<{
    url: string;
    alt: string;
    width?: number;
    height?: number;
    id?: string;
  }>;
  selectedIndices: number[];
  printSize: LocalPrintSize;
  spacing: number;
  containMode: boolean;
  isPortrait: boolean;
  cornerRounding: number;
  loading?: boolean;
  progress?: number;
}

interface MultiBoardPreviewProps {
  scrapedImages: Array<{ url: string; alt?: string }>;
  selectedBoards: Array<{
    selectedIndices: number[];
    printSize: ImportedPrintSize;
    spacing: number;
    containMode: boolean;
    isPortrait: boolean;
    cornerRounding: number;
  }>;
  onBoardsChange: (boards: Array<{
    selectedIndices: number[];
    printSize: ImportedPrintSize;
    spacing: number;
    containMode: boolean;
    isPortrait: boolean;
    cornerRounding: number;
  }>) => void;
  className?: string;
}

interface Image {
  url: string;
  alt?: string;
  // Add other properties as needed
}

export function MultiBoardPreview({
  scrapedImages,
  selectedBoards,
  onBoardsChange,
  className
}: MultiBoardPreviewProps) {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([{
    id: Date.now().toString(),
    url: '',
    name: '',
    scrapedImages: [],
    selectedIndices: [],
    printSize: PRINT_SIZES[0],
    spacing: 0.5,
    containMode: false,
    isPortrait: true,
    cornerRounding: 0
  }]);
  const [activeBoardIndex, setActiveBoardIndex] = useState(0);
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState(PRINT_SIZES[0]);
  const [loadingStates, setLoadingStates] = useState<Record<string, number>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // Save boards state to localStorage whenever it changes
  useEffect(() => {
    saveToLocalStorage(boards);
  }, [boards]);

  // Load boards from localStorage on initial mount
  useEffect(() => {
    try {
      const savedBoards = localStorage.getItem('printBoards');
      if (savedBoards) {
        setBoards(JSON.parse(savedBoards));
      }
    } catch (e) {
      console.error('Failed to load boards from localStorage:', e);
    }
  }, []);

  // Validate active board index whenever boards array changes
  useEffect(() => {
    if (activeBoardIndex >= boards.length) {
      setActiveBoardIndex(Math.max(0, boards.length - 1));
    }
  }, [boards.length, activeBoardIndex]);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      // Adjust image grid layout for mobile
      setIsMultiMode(!isMobile);
      
      // Handle orientation changes
      if (isMobile && window.innerHeight > window.innerWidth) {
        boards.forEach(board => {
          if (!board.isPortrait) {
            const newBoards = [...boards];
            board.isPortrait = true;
            setBoards(newBoards);
          }
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, [boards]);

  const hasAnyScrapedImages = (boards: Board[]) => {
    return boards.some(board => board.scrapedImages.length > 0);
  };

  const handleSubmit = async (boardIndex: number) => {
    const board = boards[boardIndex];
    setLoadingStates(prev => ({ ...prev, [board.id]: 5 }));
    
    try {
      // Add connection check
      if (!navigator.onLine) {
        throw new Error('Please check your internet connection');
      }

      // Add image preload check
      const imageLoadPromises = board.scrapedImages.map((img: Image) => 
        new Promise<void>((resolve, reject) => {
          const image = new window.Image();
          image.onload = () => resolve();
          image.onerror = () => reject(new Error(`Failed to load image: ${img.url}`));
          image.src = img.url;
        })
      );

      await Promise.all(imageLoadPromises);

      // Show initial loading progress
      setLoadingStates(prev => ({ ...prev, [board.id]: 30 }));
      
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: board.url }),
      });

      if (!response.ok) throw new Error('Failed to fetch');
      
      // Update progress as we start receiving data
      setLoadingStates(prev => ({ ...prev, [board.id]: 60 }));
      
      const data = await response.json();
      
      // Update board with initial images
      const newBoards = [...boards];
      newBoards[boardIndex] = {
        ...board,
        scrapedImages: data.images,
        selectedIndices: data.images.length >= 4 
          ? [0, 1, 2, 3] 
          : data.images.map((image: { url: string; alt: string }, i: number) => i)
      };
      setBoards(newBoards);

      // Show completion progress
      setLoadingStates(prev => ({ ...prev, [board.id]: 100 }));
      
      // If we got partial results, we can handle additional loading here
      if (data.status === 'partial') {
        // Additional loading logic if needed
      }
      
      // Clear loading state after animation
      setTimeout(() => {
        setLoadingStates(prev => {
          const newState = { ...prev };
          delete newState[board.id];
          return newState;
        });
      }, 500);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      setLoadingStates(prev => ({ ...prev, [board.id]: -1 }));
    }
  };

  const handleRemoveBoard = (index: number) => {
    if (boards.length > 1) {
      setBoards(prevBoards => prevBoards.filter((_, i) => i !== index));
      if (activeBoardIndex >= boards.length - 1) {
        setActiveBoardIndex(prev => Math.max(0, prev - 1)); // Adjust active index if needed
      }
    }
  };

  const handleCheckout = async () => {
    try {
      setError(null);
      
      // Save current state to sessionStorage before checkout
      sessionStorage.setItem('printspo_boards', JSON.stringify({
        boards,
        activeBoardIndex,
        timestamp: new Date().getTime()
      }));

      // Validate boards first
      const invalidBoards = boards.map(validateBoard).filter(Boolean);
      if (invalidBoards.length > 0) {
        setError(invalidBoards[0]);
        return;
      }

      // Initialize Stripe checkout directly
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boards: boards.map((board) => ({
            previewUrl: board.scrapedImages[board.selectedIndices[0]]?.url,
            printSize: {
              ...board.printSize,
              price: Number(board.printSize.price)
            },
            settings: {
              selectedIndices: board.selectedIndices,
              spacing: board.spacing,
              containMode: board.containMode,
              isPortrait: board.isPortrait,
              cornerRounding: board.cornerRounding,
              scrapedImages: board.scrapedImages
            }
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initialize payment');
      }

      const { sessionId } = await response.json();
      
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) {
        throw new Error('Failed to load payment processor');
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) {
        throw error;
      }

    } catch (error) {
      console.error('Checkout error:', error);
      setError('An error occurred during checkout. Please try again.');
    }
  };

  const handlePreviewDownload = async () => {
    const board = boards[activeBoardIndex];
    try {
      setLoading(true);
      const response = await fetch('/api/prints/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: board.selectedIndices.map(index => ({
            url: board.scrapedImages[index].url,
            alt: board.scrapedImages[index].alt,
            position: { x: 0, y: 0, w: 1, h: 1 },
            rotation: 0,
            containMode: true // Ensure image is contained within its area
          })),
          printSize: board.printSize,
          spacing: board.spacing,
          containMode: board.containMode,
          isPreview: true,
          dpi: 300 // Higher DPI for better preview quality
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const data = await response.json();
      
      // Create blob from the URL
      const previewResponse = await fetch(data.images[0].previewUrl);
      const blob = await previewResponse.blob();
      
      // Create object URL for the blob
      const objectUrl = URL.createObjectURL(blob);
      
      // Create and trigger download
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `print-preview-${board.printSize.name}.jpg`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Preview generation error:', error);
      setError('Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleReorderImages = (boardIndex: number, newOrder: number[]) => {
    const newBoards = [...boards];
    const board = newBoards[boardIndex];
    
    // Reorder the selectedIndices array based on the new order
    board.selectedIndices = newOrder.map(index => board.selectedIndices[index]);
    setBoards(newBoards);
  };

  const handleBoardSelect = (index: number) => {
    if (index >= 0 && index < boards.length) {
      setActiveBoardIndex(index);
    }
  };

  const handleBoardDelete = (indexToDelete: number) => {
    setBoards(prevBoards => {
      const newBoards = prevBoards.filter((_, index) => index !== indexToDelete);
      if (newBoards.length === 0) {
        // If we deleted the last board, create a new empty one
        return [{
          id: Date.now().toString(),
          url: '',
          name: '',
          scrapedImages: [],
          selectedIndices: [],
          printSize: PRINT_SIZES[0],
          spacing: 0.5,
          containMode: false,
          isPortrait: true,
          cornerRounding: 0
        }];
      }
      return newBoards;
    });
    
    // Adjust active index if necessary
    if (indexToDelete <= activeBoardIndex) {
      setActiveBoardIndex(prev => Math.max(0, prev - 1));
    }
  };

  const generateBoardPrintFile = async (board: Board, retries = 2) => {
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch('/api/prints/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: board.selectedIndices.map(index => ({
              url: board.scrapedImages[index].url,
              alt: board.scrapedImages[index].alt,
              position: { x: 0, y: 0, w: 1, h: 1 },
              rotation: 0,
              containMode: true, // Ensure image is contained
              objectFit: 'contain', // Maintain aspect ratio
              quality: 100 // Ensure high quality
            })),
            printSize: board.printSize,
            spacing: board.spacing,
            containMode: board.containMode,
            isPreview: false,
            dpi: 300
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate print file');
        }

        const data = await response.json();
        return {
          printFile: data.images[0].printUrl,
          previewUrl: data.images[0].previewUrl,
          printSize: board.printSize
        };
      } catch (error) {
        if (i === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };

  const saveToLocalStorage = (boards: Board[]) => {
    try {
      const serialized = JSON.stringify(boards);
      if (serialized.length > 5000000) { // 5MB limit
        throw new Error('Too many boards to save locally');
      }
      localStorage.setItem('printBoards', serialized);
    } catch (e) {
      console.error('Failed to save boards to localStorage:', e);
      // Fallback: save only essential data
      const essentialData = boards.map(board => ({
        id: board.id,
        url: board.url,
        selectedIndices: board.selectedIndices,
        printSize: board.printSize
      }));
      localStorage.setItem('printBoards', JSON.stringify(essentialData));
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 1) {
      e.preventDefault(); // Prevent pinch zoom during image selection
    }
  };

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => document.removeEventListener('touchstart', handleTouchStart);
  }, []);

  const loadBoardImages = async (board: Board) => {
    const loadedImages = await Promise.all(
      board.scrapedImages.map(async (img) => {
        try {
          // Generate thumbnail first
          const thumbnailResponse = await fetch(`/api/optimize-image?url=${encodeURIComponent(img.url)}&width=100`);
          const thumbnailData = await thumbnailResponse.json();
          
          // Load full resolution in background
          const fullImage = new window.Image();
          fullImage.src = img.url;
          
          return {
            ...img,
            thumbnailUrl: thumbnailData.url,
            loaded: true
          };
        } catch (error) {
          console.error('Image load error:', error);
          return { ...img, error: true };
        }
      })
    );

    const newBoards = [...boards];
    newBoards[activeBoardIndex].scrapedImages = loadedImages;
    setBoards(newBoards);
  };

  const validateBoard = (board: Board): string | null => {
    // Check if URL is already imported in another board
    const isDuplicate = boards.some(
      existingBoard => 
        existingBoard.id !== board.id && 
        existingBoard.url === board.url
    );

    if (isDuplicate) {
      return 'This board has already been imported';
    }

    if (!board.selectedIndices.length) {
      return 'Please select at least one image';
    }

    return null;
  };

  useEffect(() => {
    const savedState = sessionStorage.getItem('printspo_boards');
    if (savedState) {
      try {
        const { boards: savedBoards, activeBoardIndex: savedIndex, timestamp } = JSON.parse(savedState);
        // Only restore if the saved state is less than 1 hour old
        if (Date.now() - timestamp < 3600000) {
          setBoards(savedBoards);
          setActiveBoardIndex(savedIndex);
        } else {
          sessionStorage.removeItem('printspo_boards');
        }
      } catch (error) {
        console.error('Error restoring saved state:', error);
      }
    }
  }, []);

  const handleImageSwap = (sourceIndex: number, targetIndex: number) => {
    setBoards(prevBoards => {
      const newBoards = [...prevBoards];
      const currentBoard = {...newBoards[activeBoardIndex]};
      
      // Swap the indices
      const newSelectedIndices = [...currentBoard.selectedIndices];
      [newSelectedIndices[sourceIndex], newSelectedIndices[targetIndex]] = 
      [newSelectedIndices[targetIndex], newSelectedIndices[sourceIndex]];
      
      currentBoard.selectedIndices = newSelectedIndices;
      newBoards[activeBoardIndex] = currentBoard;
      
      return newBoards;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (gridRef.current?.offsetLeft || 0));
    setScrollLeft(gridRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (gridRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (gridRef.current) {
      gridRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleImageSelect = (index: number) => {
    const newBoards = [...selectedBoards];
    if (!newBoards[activeBoardIndex].selectedIndices.includes(index)) {
      newBoards[activeBoardIndex].selectedIndices.push(index);
      onBoardsChange(newBoards);
    }
  };

  const handleImageRemove = (boardIndex: number, imageIndex: number) => {
    const newBoards = [...boards];
    newBoards[boardIndex].selectedIndices = newBoards[boardIndex].selectedIndices.filter(
      (_, i) => i !== imageIndex
    );
    setBoards(newBoards);
  };

  const handleAddBoard = () => {
    const newBoards = [...boards];
    newBoards.push({
      id: Date.now().toString(),
      url: '',
      name: '',
      scrapedImages: [],
      selectedIndices: [],
      printSize: PRINT_SIZES[0],
      spacing: 0.5,
      containMode: false,
      isPortrait: true,
      cornerRounding: 0
    });
    setBoards(newBoards);
    setActiveBoardIndex(newBoards.length - 1);
  };

  const myPrintSize: LocalPrintSize = {
    width: 8.5,
    height: 11,
    price: 6,
    name: "8.5x11"
  };

  return (
    <main className={cn('min-h-screen bg-gray-50', className)}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* URL Input Section */}
        <div className="bg-white rounded-xl p-6 shadow-lg max-w-3xl mx-auto mb-8">
          <div className="mb-4 flex items-center justify-end gap-2">
            <span className="text-sm text-[#2C2C2C]">Creating multiple boards?</span>
            <button
              onClick={() => setIsMultiMode(!isMultiMode)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                isMultiMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {isMultiMode ? 'Multi-Board Mode' : 'Single Board'}
            </button>
          </div>

          {/* URL inputs */}
          <div className="space-y-4">
            {boards.map((board, index) => (
              <div key={board.id} className="space-y-2">
                <div className="relative flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Paste your Pinterest board URL"
                    value={board.url}
                    onChange={(e) => {
                      const newBoards = [...boards];
                      newBoards[index].url = e.target.value;
                      setBoards(newBoards);
                    }}
                    className="flex-1 p-4 border rounded-lg"
                  />
                  {boards.length > 1 && (
                    <button
                      onClick={() => handleRemoveBoard(index)}
                      className="p-2 text-red-600 hover:text-red-800"
                      aria-label="Remove board"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleSubmit(index)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Import Board
                  </button>
                </div>
                {/* Loading Progress Bar */}
                {loadingStates[board.id] !== undefined && loadingStates[board.id] !== -1 && (
                  <div className="h-1 bg-gray-200 rounded overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${loadingStates[board.id]}%` }}
                    />
                  </div>
                )}
                {/* Error State */}
                {loadingStates[board.id] === -1 && (
                  <p className="text-sm text-red-600">Failed to import board</p>
                )}
              </div>
            ))}
          </div>

          {isMultiMode && (
            <button
              onClick={() => setBoards([...boards, {
                id: Date.now().toString(),
                url: '',
                name: '',
                scrapedImages: [],
                selectedIndices: [],
                printSize: PRINT_SIZES[0],
                spacing: 0.5,
                containMode: false,
                isPortrait: true,
                cornerRounding: 0
              }])}
              className="mt-4 w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add Another Board
            </button>
          )}
        </div>

        {/* Board Navigation */}
        {isMultiMode && boards.length > 1 && hasAnyScrapedImages(boards) && (
          <div className="flex justify-between items-center mb-4 max-w-3xl mx-auto">
            <button
              onClick={() => setActiveBoardIndex(prev => Math.max(0, prev - 1))}
              disabled={activeBoardIndex === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-[#2C2C2C]">
              Board {activeBoardIndex + 1} of {boards.length}
            </span>
            <button
              onClick={() => setActiveBoardIndex(prev => Math.min(boards.length - 1, prev + 1))}
              disabled={activeBoardIndex === boards.length - 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Active Board Preview */}
        {boards[activeBoardIndex]?.scrapedImages.length > 0 && (
          <div className="space-y-8">
            {/* Image Selection Grid */}
            <section className="bg-white rounded-lg shadow-lg p-4 max-w-3xl mx-auto">
              <h2 className="text-xl font-semibold mb-4 text-[#2C2C2C] text-center">Select Images</h2>
              <ImageSelectionSection
                images={boards[activeBoardIndex].scrapedImages}
                selectedIndices={boards[activeBoardIndex].selectedIndices}
                onSelect={handleImageSelect}
                onRemove={(imageIndex) => handleImageRemove(activeBoardIndex, imageIndex)}
                isMultiBoard={true}
                boardIndex={activeBoardIndex}
              />
            </section>

            {/* Print Board Preview with Controls */}
            <section className="bg-white rounded-lg shadow-lg p-4 max-w-3xl mx-auto">
              <PrintBoardPreview
                layout={{
                  images: boards[activeBoardIndex].selectedIndices.map(index => ({
                    url: boards[activeBoardIndex].scrapedImages[index].url,
                    alt: boards[activeBoardIndex].scrapedImages[index].alt,
                    position: { x: 0, y: 0, w: 1, h: 1 },
                    rotation: 0
                  })),
                  size: {
                    width: boards[activeBoardIndex].printSize.width,
                    height: boards[activeBoardIndex].printSize.height
                  }
                }}
                images={boards[activeBoardIndex].scrapedImages}
                printSize={boards[activeBoardIndex].printSize}
                spacing={boards[activeBoardIndex].spacing}
                containMode={boards[activeBoardIndex].containMode}
                isPortrait={boards[activeBoardIndex].isPortrait}
                cornerRounding={boards[activeBoardIndex].cornerRounding}
                onRemoveImage={(index) => {
                  const newBoards = [...boards];
                  newBoards[activeBoardIndex].selectedIndices = 
                    newBoards[activeBoardIndex].selectedIndices.filter((_, i) => i !== index);
                  setBoards(newBoards);
                }}
                onImageSwap={(sourceIndex, targetIndex) => handleImageSwap(sourceIndex, targetIndex)}
                index={activeBoardIndex}
              />

              {/* Layout Controls - Responsive Grid */}
              <div className="mt-4 w-full max-w-2xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mb-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Spacing</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={boards[activeBoardIndex].spacing}
                      onChange={(e) => {
                        const newBoards = [...boards];
                        newBoards[activeBoardIndex].spacing = parseFloat(e.target.value);
                        setBoards(newBoards);
                      }}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Rounding</label>
                    <input
                      type="range"
                      min="0"
                      max="12"
                      value={boards[activeBoardIndex].cornerRounding}
                      onChange={(e) => {
                        const newBoards = [...boards];
                        newBoards[activeBoardIndex].cornerRounding = parseInt(e.target.value);
                        setBoards(newBoards);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      const newBoards = [...boards];
                      newBoards[activeBoardIndex].containMode = !newBoards[activeBoardIndex].containMode;
                      setBoards(newBoards);
                    }}
                    className={`flex-1 h-10 px-4 rounded-lg border transition-colors max-w-[200px] ${
                      boards[activeBoardIndex].containMode
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {boards[activeBoardIndex].containMode ? 'Cover' : 'Contain'}
                  </button>

                  <button
                    onClick={() => {
                      const newBoards = [...boards];
                      newBoards[activeBoardIndex].isPortrait = !newBoards[activeBoardIndex].isPortrait;
                      setBoards(newBoards);
                    }}
                    className={`flex-1 h-10 px-4 rounded-lg border transition-colors max-w-[200px] ${
                      boards[activeBoardIndex].isPortrait
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {boards[activeBoardIndex].isPortrait ? 'Portrait' : 'Landscape'}
                  </button>
                </div>
              </div>

              {/* Print Size Selection */}
              <div className="mt-6 border-t pt-6 max-w-2xl mx-auto">
                <div className="text-sm font-medium text-gray-700 mb-3 text-center">Print Size</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {PRINT_SIZES.map((size) => (
                    <button
                      key={`${size.width}x${size.height}`}
                      onClick={() => {
                        const newBoards = [...boards];
                        newBoards[activeBoardIndex].printSize = size;
                        setBoards(newBoards);
                      }}
                      className={`p-3 rounded-lg border text-sm transition-all w-[140px] ${
                        boards[activeBoardIndex].printSize.width === size.width &&
                        boards[activeBoardIndex].printSize.height === size.height
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-medium">{size.width}" × {size.height}"</div>
                      <div className="text-gray-500">${size.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Checkout Section */}
        {boards.some(board => board.selectedIndices.length > 0) && (
          <div className="mt-8 max-w-3xl mx-auto">
            <button 
              onClick={handleCheckout}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              {isMultiMode ? 'Checkout All Boards' : 'Checkout'}
            </button>
          </div>
        )}

        {error && (
          <div className="fixed top-4 right-4 left-4 sm:left-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

export default MultiBoardPreview; 