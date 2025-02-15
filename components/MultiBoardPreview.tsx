import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { PrintBoardPreview } from './PrintBoardPreview';
import { ImageSelectionSection } from './ImageSelectionSection';
import { PRINT_SIZES } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import Image from 'next/image';
import { type PrintSize as ImportedPrintSize } from '@/app/types/order';
import { cn } from '@/lib/utils';
import { Board, BoardsState, BoardsStateSetter } from '@/app/types';

interface LocalPrintSize {
  width: number;
  height: number;
  price: number;
  name: string;
}

interface MultiBoardPreviewProps {
  isMultiMode: boolean;
  onMultiModeChange: (value: boolean) => void;
  selectedBoards: BoardsState;
  onBoardsChange: BoardsStateSetter;
  className?: string;
}

interface Image {
  url: string;
  alt?: string;
  // Add other properties as needed
}

const calculateOrderTotal = (boards: Board[]) => {
  return boards.reduce((total, board) => total + board.printSize.price, 0);
};

const generatePreview = async (board: Board) => {
  try {
    const response = await fetch('/api/prints/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: board.selectedIndices.map(index => ({
          url: board.scrapedImages[index].url,
          alt: board.scrapedImages[index].alt || '',
          position: { x: 0, y: 0, w: 1, h: 1 },
          rotation: 0,
          containMode: board.containMode,
          objectFit: 'contain',
          quality: 90
        })),
        printSize: board.printSize,
        spacing: board.spacing,
        containMode: board.containMode,
        isPreview: true,
        dpi: 72 // Lower DPI for preview
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate preview');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Preview generation error:', error);
    throw new Error('Failed to generate preview. Please try again.');
  }
};

export function MultiBoardPreview({ 
  isMultiMode,
  onMultiModeChange,
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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, number>>({});
  const [isReturningFromCheckout, setIsReturningFromCheckout] = useState(false);
  
  // Add drag-related state
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
      const urlParams = new URLSearchParams(window.location.search);
      const isFromStripe = urlParams.has('stripe');

      if (isFromStripe) {
        // If returning from Stripe, load from sessionStorage and preserve multi-board state
        const savedState = sessionStorage.getItem('printspo_boards');
        if (savedState) {
          const { boards: savedBoards, activeBoardIndex: savedIndex, isMultiMode: savedMode } = JSON.parse(savedState);
          setBoards(savedBoards);
          setActiveBoardIndex(savedIndex);
          onMultiModeChange(savedMode);
          // Clear the session storage after restoring
          sessionStorage.removeItem('printspo_boards');
        }
      } else {
        // Normal page load - enforce single board mode
        const savedBoards = localStorage.getItem('printBoards');
        if (savedBoards) {
          const parsedBoards = JSON.parse(savedBoards);
          if (parsedBoards.length > 1) {
            onMultiModeChange(false); // Force single board mode
            setBoards([parsedBoards[0]]); // Only take the first board
          } else {
            setBoards(parsedBoards);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load boards:', e);
    }
  }, [onMultiModeChange]);

  // Validate active board index whenever boards array changes
  useEffect(() => {
    if (activeBoardIndex >= boards.length) {
      setActiveBoardIndex(Math.max(0, boards.length - 1));
    }
  }, [boards.length, activeBoardIndex]);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      
      // Only handle orientation changes
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
    return () => window.removeEventListener('resize', handleResize);
  }, [boards]);

  const hasAnyScrapedImages = (boards: Board[]) => {
    return boards.some(board => board.scrapedImages.length > 0);
  };

  const validateBoard = (board: Board): string | null => {
    // Only check for duplicate URLs during import
    const isDuplicate = boards.some(
      existingBoard => 
        existingBoard.id !== board.id && 
        existingBoard.url === board.url
    );

    if (isDuplicate) {
      return 'This board has already been imported';
    }

    // Only check for selected images during checkout
    if (board.scrapedImages.length > 0 && !board.selectedIndices.length) {
      return 'Please select at least one image';
    }

    return null;
  };

  const handleBoardImport = async (url: string, boardIndex: number) => {
    const board = selectedBoards[boardIndex];
    
    try {
      setLoadingStates(prev => ({ ...prev, [board.id]: 0 }));
      setErrors(prev => ({ ...prev, [board.id]: null }));

      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error('Failed to import board');
      }

      const data = await response.json();
      
      // Clear any existing selections and set initial selections
      const initialSelectedIndices = data.images && data.images.length >= 4 
        ? [0, 1, 2, 3] 
        : [];

      onBoardsChange(prevBoards => {
        const newBoards = [...prevBoards];
        newBoards[boardIndex] = {
          ...board,
          url,
          name: data.name || '',
          scrapedImages: data.images || [],
          selectedIndices: initialSelectedIndices
        };
        return newBoards;
      });

      // Set the active board to the newly imported one
      setActiveBoardIndex(boardIndex);
      
      // Clear loading state after successful import
      setLoadingStates(prev => {
        const newStates = { ...prev };
        delete newStates[board.id];
        return newStates;
      });
      
    } catch (error) {
      console.error('Board import error:', error);
      setErrors(prev => ({ 
        ...prev, 
        [board.id]: error instanceof Error ? error.message : 'Failed to import board' 
      }));
      // Clear loading state on error
      setLoadingStates(prev => {
        const newStates = { ...prev };
        delete newStates[board.id];
        return newStates;
      });
    }
  };

  // Add cleanup when switching boards
  useEffect(() => {
    // Clear any stale selections when switching boards
    setBoards(prevBoards => {
      const newBoards = [...prevBoards];
      newBoards[activeBoardIndex] = {
        ...newBoards[activeBoardIndex],
        selectedIndices: [...newBoards[activeBoardIndex].selectedIndices] // Create fresh array
      };
      return newBoards;
    });
  }, [activeBoardIndex]);

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
      // Validate that we have boards with selected images
      const validBoards = boards.filter(board => board.selectedIndices.length > 0);
      if (validBoards.length === 0) {
        setError('Please select at least one image before checkout');
        return;
      }

      // Create the order data structure
      const orderData = {
        boards: validBoards.map(board => ({
          settings: {
            selectedIndices: board.selectedIndices,
            scrapedImages: board.scrapedImages,
            spacing: board.spacing,
            containMode: board.containMode,
            isPortrait: board.isPortrait,
            cornerRounding: board.cornerRounding
          },
          printSize: board.printSize,
          name: board.name || `${board.printSize.width}x${board.printSize.height}" Print`
        }))
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error('Failed to create order');
      }

      const { sessionId } = await response.json();
      if (!sessionId) {
        throw new Error('No session ID received');
      }

      // Load Stripe and redirect
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) {
        throw new Error('Failed to load payment processor');
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create checkout session');
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
    setBoards(prevBoards => {
      const newBoards = [...prevBoards];
      const currentBoard = {...newBoards[activeBoardIndex]};
      
      // Clear any invalid indices that might be stuck
      currentBoard.selectedIndices = currentBoard.selectedIndices.filter(
        idx => idx < currentBoard.scrapedImages.length
      );
      
      // Add new selection if it doesn't exist
      if (!currentBoard.selectedIndices.includes(index)) {
        currentBoard.selectedIndices.push(index);
      }
      
      newBoards[activeBoardIndex] = currentBoard;
      return newBoards;
    });
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

  const FREE_SHIPPING_THRESHOLD = 59;

  const orderTotal = calculateOrderTotal(boards);
  const amountToFreeShipping = FREE_SHIPPING_THRESHOLD - orderTotal;

  return (
    <main className={cn('min-h-screen', className)}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* URL Input Section */}
        <div className="bg-white rounded-xl p-6 max-w-3xl mx-auto mb-8">
          <div className="relative">
            {/* Step indicator */}
            <div className="absolute -left-12 -top-10 w-12 h-12 bg-[#D4A5A5] rounded-full flex items-center justify-center">
              <span className="font-serif font-[200] italic text-white text-5xl -mt-2">1</span>
            </div>
            
            {/* Existing header content */}
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-3xl text-[#4D4D4D]"><i>Link your</i> <b>Board</b></h2> 
              </div>
              {/* Multi-board toggle */}
              <div className="flex items-center justify-end gap-2">
                <span className="font-serif font-light italic text-[#D4A5A5]">Want multiple boards?</span>
                <button
                  onClick={() => onMultiModeChange(!isMultiMode)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    isMultiMode 
                      ? 'border-2 border-[#D4A5A5] bg-[#D4A5A5]/10 text-[#2C2C2C]' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {isMultiMode ? 'Multi-Board' : 'Single Board'}
                </button>
              </div>
            </div>
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
                    className="flex-1 p-2 border rounded-lg focus:border-[#D4A5A5] focus:outline-none transition-colors"
                  />
                  {boards.length > 1 && (
                    <button
                      onClick={() => handleRemoveBoard(index)}
                      className="p-2 text-[#D4A5A5] hover:text-[#b38989] transition-colors"
                      aria-label="Remove board"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleBoardImport(board.url, index)}
                    className="px-6 py-2.5 bg-[#D4A5A5] hover:bg-[#b38989] text-white rounded-lg font-light transition-all duration-200 flex items-center gap-2"
                  >
                    <span>Import Board</span>
                    {loadingStates[board.id] !== undefined && loadingStates[board.id] !== -1 && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </button>
                </div>
                {/* Loading Progress Bar */}
                {loadingStates[board.id] !== undefined && loadingStates[board.id] !== -1 && (
                  <div className="h-1 bg-gray-200 rounded overflow-hidden">
                    <div 
                      className="h-full bg-[#D4A5A5] transition-all duration-300"
                      style={{ width: `${loadingStates[board.id]}%` }}
                    />
                  </div>
                )}
                {/* Board-specific error messages */}
                {errors[board.id] && (
                  <p className="text-sm text-[#D4A5A5] mt-2">{errors[board.id]}</p>
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
              className="mt-4 w-full p-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-[#D4A5A5]"
            >
              <Plus className="w-3 h-4 inline mr-2" />
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

        {/* Main Content Panel */}
        {boards[activeBoardIndex]?.scrapedImages.length > 0 && (
          <div className="bg-white rounded-xl p-8 max-w-3xl mx-auto space-y-8">
            {/* Image Selection Grid */}
            <section>
              <h2 className="text-xl font-normal mb-4 text-[#4D4D4D] text-center"><i>Select</i> <b>Images</b></h2>
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
            <section>
              <PrintBoardPreview
                layout={{
                  images: boards[activeBoardIndex].selectedIndices
                    .map(index => ({
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
                printSize={boards[activeBoardIndex].printSize}
                spacing={boards[activeBoardIndex].spacing}
                containMode={boards[activeBoardIndex].containMode}
                isPortrait={boards[activeBoardIndex].isPortrait}
                cornerRounding={boards[activeBoardIndex].cornerRounding}
                onRemoveImage={(index) => handleImageRemove(activeBoardIndex, index)}
                onImageSwap={(sourceIndex, targetIndex) => handleImageSwap(sourceIndex, targetIndex)}
                index={activeBoardIndex}
                images={boards[activeBoardIndex].scrapedImages}
              />

              {/* Layout Controls */}
              <div className="mt-8 max-w-2xl mx-auto">
                <div className="flex flex-wrap justify-center gap-2 max-w-[440px] mx-auto">
                  {/* Spacing and Rounding Controls */}
                  <div className="w-[210px]">
                    <label className="text-sm font-medium text-[#4D4D4D] mb-1 block">Spacing</label>
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
                      className="w-full accent-[#4D4D4D]"
                    />
                  </div>

                  <div className="w-[210px]">
                    <label className="text-sm font-medium text-[#4D4D4D] mb-1 block">Rounding</label>
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
                      className="w-full accent-[#4D4D4D]"
                    />
                  </div>
                </div>

                {/* Cover/Portrait Controls */}
                <div className="flex flex-wrap justify-center gap-2 max-w-[440px] mx-auto mt-2">
                  <button
                    onClick={() => {
                      const newBoards = [...boards];
                      newBoards[activeBoardIndex].containMode = !newBoards[activeBoardIndex].containMode;
                      setBoards(newBoards);
                    }}
                    className={`w-[210px] h-10 px-4 rounded-lg border transition-colors ${
                      boards[activeBoardIndex].containMode
                        ? 'border-[#4D4D4D] bg-[rgba(77,77,77,0.05)] text-[#4D4D4D]'
                        : 'border-gray-200 text-[#4D4D4D]'
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
                    className={`w-[210px] h-10 px-4 rounded-lg border transition-colors ${
                      boards[activeBoardIndex].isPortrait
                        ? 'border-[#4D4D4D] bg-[rgba(77,77,77,0.05)] text-[#4D4D4D]'
                        : 'border-gray-200 text-[#4D4D4D]'
                    }`}
                  >
                    {boards[activeBoardIndex].isPortrait ? 'Portrait' : 'Landscape'}
                  </button>
                </div>
              </div>

              {/* Print Size Selection */}
              <div className="mt-8">
                <div className="flex flex-wrap justify-center gap-2">
                  {PRINT_SIZES.map((size) => (
                    <button
                      key={`${size.width}x${size.height}`}
                      onClick={() => {
                        const newBoards = [...boards];
                        newBoards[activeBoardIndex].printSize = size;
                        setBoards(newBoards);
                      }}
                      className={`p-3 rounded-lg border text-sm transition-all w-[150px] ${
                        boards[activeBoardIndex].printSize.width === size.width &&
                        boards[activeBoardIndex].printSize.height === size.height
                          ? 'border-[#4D4D4D] bg-[rgba(77,77,77,0.05)] text-[#4D4D4D]'
                          : 'border-gray-200 text-[#4D4D4D]'
                      }`}
                    >
                      <div className="font-medium text-[#4D4D4D]">{size.width}" × {size.height}"</div>
                      <div className="text-[#D4A5A5]">${size.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Pricing and Checkout Section */}
            {orderTotal > 0 && (
              <section className="border-t border-gray-100 pt-8">
                <div className="bg-[#F7F7F7] rounded-lg p-4 mb-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[#4D4D4D]">
                      <span className="font-light">Subtotal</span>
                      <span className="font-serif">${orderTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#4D4D4D]">
                      <span className="font-light">Shipping</span>
                      {orderTotal >= FREE_SHIPPING_THRESHOLD ? (
                        <span className="font-serif italic text-[#D4A5A5]">Free</span>
                      ) : (
                        <span className="font-serif">$9.99</span>
                      )}
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between text-[#4D4D4D]">
                      <span className="font-serif">Total</span>
                      <span className="font-serif text-lg">
                        ${(orderTotal + (orderTotal >= FREE_SHIPPING_THRESHOLD ? 0 : 9.99)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {orderTotal < FREE_SHIPPING_THRESHOLD && (
                    <p className="text-center text-[#4D4D4D] font-light text-sm mt-4">
                      Add <span className="font-serif italic text-[#D4A5A5]">${(FREE_SHIPPING_THRESHOLD - orderTotal).toFixed(2)}</span> more for free shipping
                    </p>
                  )}
                </div>

                <button 
                  onClick={handleCheckout}
                  className="w-full bg-[#D4A5A5] text-white px-6 py-3 rounded-lg hover:bg-[#b38989] transition-colors"
                >
                  {isMultiMode 
                    ? `Checkout ${boards.filter(board => board.selectedIndices.length > 0).length} Boards`
                    : 'Checkout Board'
                  }
                </button>
              </section>
            )}
          </div>
        )}

        {/* General error message */}
        {error && (
          <div className="fixed top-4 right-4 left-4 sm:left-auto bg-[#D4A5A5]/10 border border-[#D4A5A5] text-[#D4A5A5] px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

export default MultiBoardPreview; 