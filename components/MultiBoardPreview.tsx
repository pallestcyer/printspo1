import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { PrintBoardPreview } from './PrintBoardPreview';
import { ImageSelectionSection } from './ImageSelectionSection';
import { PRINT_SIZES } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import _Image from 'next/image';
import { type Board } from '@/app/types';
import { cn } from '@/lib/utils';

interface MultiBoardPreviewProps {
  isMultiMode: boolean;
  onMultiModeChange: Dispatch<SetStateAction<boolean>>;
  _selectedBoards: Board[];
  _onBoardsChange: Dispatch<SetStateAction<Board[]>>;
  className?: string;
}

interface LoadingStates {
  [key: string]: number | undefined;
}

interface ErrorStates {
  [key: string]: string | null;
}

interface _DragItem {
  index: number;
  type: string;
}

const calculateOrderTotal = (boards: Board[]) => {
  return boards.reduce((total, board) => total + board.printSize.price, 0);
};

const _generatePreview = async (board: Board) => {
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
  _selectedBoards,
  _onBoardsChange,
  className 
}: MultiBoardPreviewProps) {
  const _router = useRouter();
  const [_boards, setBoards] = useState<Board[]>([{
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
  const [_activeBoardIndex, setActiveBoardIndex] = useState(0);
  const [_loading, setLoading] = useState(false);
  const [_errors, setErrors] = useState<ErrorStates>({});
  const [_error, setError] = useState<string | null>(null);
  const [_loadingStates, setLoadingStates] = useState<LoadingStates>({});
  const [_isReturningFromCheckout, _setIsReturningFromCheckout] = useState(false);

  // Add missing state variables for drag functionality
  const [_isDragging, setIsDragging] = useState(false);
  const [_startX, setStartX] = useState(0);
  const [_scrollLeft, setScrollLeft] = useState(0);
  const _gridRef = useRef<HTMLDivElement>(null);

  // Save boards state to localStorage whenever it changes
  useEffect(() => {
    saveToLocalStorage(_boards);
  }, [_boards]);

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
    if (_activeBoardIndex >= _boards.length) {
      setActiveBoardIndex(Math.max(0, _boards.length - 1));
    }
  }, [_boards.length, _activeBoardIndex]);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      
      // Only handle orientation changes
      if (isMobile && window.innerHeight > window.innerWidth) {
        _boards.forEach(board => {
          if (!board.isPortrait) {
            const newBoards = [..._boards];
            board.isPortrait = true;
            setBoards(newBoards);
          }
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [_boards]);

  const hasAnyScrapedImages = (boards: Board[]) => {
    return boards.some(board => board.scrapedImages.length > 0);
  };

  const _validateBoard = (board: Board): string | null => {
    // Only check for duplicate URLs during import
    const isDuplicate = _boards.some(
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
    const board = _boards[boardIndex];
    
    try {
      if (!url.trim()) {
        throw new Error('Please enter a Pinterest URL');
      }

      // Start loading state
      setLoadingStates(prev => ({ ...prev, [board.id]: 0 }));
      setErrors(prev => ({ ...prev, [board.id]: null }));

      // Show initial loading progress
      setLoadingStates(prev => ({ ...prev, [board.id]: 30 }));

      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000/api/scrape'
        : '/api/scrape';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          url: url.trim() 
        })
      }).catch(error => {
        console.error('Fetch error:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
          throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
        }
        throw error;
      });

      setLoadingStates(prev => ({ ...prev, [board.id]: 60 }));

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Scrape API error:', errorData);
        throw new Error(errorData.details || 'Failed to import from Pinterest. Please check the URL and try again.');
      }

      const data = await response.json();
      
      if (!data.images || !Array.isArray(data.images)) {
        console.error('Invalid response format:', data);
        throw new Error('Received invalid data from Pinterest. Please try again.');
      }

      if (data.images.length === 0) {
        throw new Error('No images found. Please check if the URL is correct and the board is public.');
      }

      // Process the successful response
      const initialSelectedIndices = data.images.length >= 4 
        ? [0, 1, 2, 3] 
        : data.images.map((_: any, index: number) => index);

      setBoards(prevBoards => {
        const newBoards = [...prevBoards];
        newBoards[boardIndex] = {
          ...board,
          url,
          name: data.name || url.split('/').pop() || '',
          scrapedImages: data.images,
          selectedIndices: initialSelectedIndices
        };
        return newBoards;
      });

      setActiveBoardIndex(boardIndex);
      setLoadingStates(prev => ({ ...prev, [board.id]: 100 }));
      
      setTimeout(() => {
        setLoadingStates(prev => {
          const newStates = { ...prev };
          delete newStates[board.id];
          return newStates;
        });
      }, 500);

    } catch (error) {
      console.error('Board import error:', error);
      setLoadingStates(prev => {
        const newStates = { ...prev };
        delete newStates[board.id];
        return newStates;
      });

      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to import from Pinterest. Please try again.';
      
      setErrors(prev => ({ ...prev, [board.id]: errorMessage }));
      setError(errorMessage);
    }
  };

  // Add cleanup when switching boards
  useEffect(() => {
    // Clear any stale selections when switching boards
    setBoards(prevBoards => {
      const newBoards = [...prevBoards];
      newBoards[_activeBoardIndex] = {
        ...newBoards[_activeBoardIndex],
        selectedIndices: [...newBoards[_activeBoardIndex].selectedIndices] // Create fresh array
      };
      return newBoards;
    });
  }, [_activeBoardIndex]);

  const handleRemoveBoard = (index: number) => {
    if (_boards.length > 1) {
      setBoards(prevBoards => prevBoards.filter((_, i) => i !== index));
      if (_activeBoardIndex >= _boards.length - 1) {
        setActiveBoardIndex(prev => Math.max(0, prev - 1)); // Adjust active index if needed
      }
    }
  };

  const handleCheckout = async () => {
    try {
      // Validate that we have boards with selected images
      const validBoards = _boards.filter(board => board.selectedIndices.length > 0);
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

  const _handlePreviewDownload = async () => {
    const board = _boards[_activeBoardIndex];
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

  const _handleReorderImages = (boardIndex: number, newOrder: number[]) => {
    const newBoards = [..._boards];
    const board = newBoards[boardIndex];
    
    // Reorder the selectedIndices array based on the new order
    board.selectedIndices = newOrder.map(index => board.selectedIndices[index]);
    setBoards(newBoards);
  };

  const _handleBoardSelect = (index: number) => {
    if (index >= 0 && index < _boards.length) {
      setActiveBoardIndex(index);
    }
  };

  const _handleBoardDelete = (indexToDelete: number) => {
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
    if (indexToDelete <= _activeBoardIndex) {
      setActiveBoardIndex(prev => Math.max(0, prev - 1));
    }
  };

  const _generateBoardPrintFile = async (board: Board, retries = 2) => {
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

  const _loadBoardImages = async (board: Board) => {
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

    const newBoards = [..._boards];
    newBoards[_activeBoardIndex].scrapedImages = loadedImages;
    setBoards(newBoards);
  };

  const handleImageSwap = (sourceIndex: number, targetIndex: number) => {
    setBoards(prevBoards => {
      const newBoards = [...prevBoards];
      const currentBoard = {...newBoards[_activeBoardIndex]};
      
      // Swap the indices
      const newSelectedIndices = [...currentBoard.selectedIndices];
      [newSelectedIndices[sourceIndex], newSelectedIndices[targetIndex]] = 
      [newSelectedIndices[targetIndex], newSelectedIndices[sourceIndex]];
      
      currentBoard.selectedIndices = newSelectedIndices;
      newBoards[_activeBoardIndex] = currentBoard;
      
      return newBoards;
    });
  };

  const _handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (_gridRef.current?.offsetLeft || 0));
    setScrollLeft(_gridRef.current?.scrollLeft || 0);
  };

  const _handleMouseMove = (e: React.MouseEvent) => {
    if (!_isDragging) return;
    e.preventDefault();
    const x = e.pageX - (_gridRef.current?.offsetLeft || 0);
    const walk = (x - _startX) * 2;
    if (_gridRef.current) {
      _gridRef.current.scrollLeft = _scrollLeft - walk;
    }
  };

  const _handleMouseUp = () => {
    setIsDragging(false);
  };

  const _handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleImageSelect = (index: number) => {
    setBoards(prevBoards => {
      const newBoards = [...prevBoards];
      const currentBoard = {...newBoards[_activeBoardIndex]};
      
      // Clear any invalid indices that might be stuck
      currentBoard.selectedIndices = currentBoard.selectedIndices.filter(
        idx => idx < currentBoard.scrapedImages.length
      );
      
      // Add new selection if it doesn't exist
      if (!currentBoard.selectedIndices.includes(index)) {
        currentBoard.selectedIndices.push(index);
      }
      
      newBoards[_activeBoardIndex] = currentBoard;
      return newBoards;
    });
  };

  const handleImageRemove = (boardIndex: number, imageIndex: number) => {
    const newBoards = [..._boards];
    newBoards[boardIndex].selectedIndices = newBoards[boardIndex].selectedIndices.filter(
      (_, i) => i !== imageIndex
    );
    setBoards(newBoards);
  };

  const _handleAddBoard = () => {
    const newBoards = [..._boards];
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

  const FREE_SHIPPING_THRESHOLD = 59;

  const orderTotal = calculateOrderTotal(_boards);
  const _amountToFreeShipping = FREE_SHIPPING_THRESHOLD - orderTotal;

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
            {_boards.map((board, index) => (
              <div key={board.id} className="space-y-2">
                <div className="relative flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Paste your Pinterest board URL"
                    value={board.url}
                    onChange={(e) => {
                      const newBoards = [..._boards];
                      newBoards[index].url = e.target.value;
                      setBoards(newBoards);
                    }}
                    className="flex-1 p-2 border rounded-lg focus:border-[#D4A5A5] focus:outline-none transition-colors"
                  />
                  {_boards.length > 1 && (
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
                    {_loadingStates[board.id] !== undefined && _loadingStates[board.id] !== -1 && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </button>
                </div>
                {/* Loading Progress Bar */}
                {_loadingStates[board.id] !== undefined && _loadingStates[board.id] !== -1 && (
                  <div className="h-1 bg-gray-200 rounded overflow-hidden">
                    <div 
                      className="h-full bg-[#D4A5A5] transition-all duration-300"
                      style={{ width: `${_loadingStates[board.id]}%` }}
                    />
                  </div>
                )}
                {/* Board-specific error messages */}
                {_errors[board.id] && (
                  <p className="text-sm text-[#D4A5A5] mt-2">{_errors[board.id]}</p>
                )}
              </div>
            ))}
          </div>

          {isMultiMode && (
            <button
              onClick={() => setBoards([..._boards, {
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
        {isMultiMode && _boards.length > 1 && hasAnyScrapedImages(_boards) && (
          <div className="flex justify-between items-center mb-4 max-w-3xl mx-auto">
            <button
              onClick={() => setActiveBoardIndex(prev => Math.max(0, prev - 1))}
              disabled={_activeBoardIndex === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-[#2C2C2C]">
              Board {_activeBoardIndex + 1} of {_boards.length}
            </span>
            <button
              onClick={() => setActiveBoardIndex(prev => Math.min(_boards.length - 1, prev + 1))}
              disabled={_activeBoardIndex === _boards.length - 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Main Content Panel */}
        {_boards[_activeBoardIndex]?.scrapedImages.length > 0 && (
          <div className="bg-white rounded-xl p-8 max-w-3xl mx-auto space-y-8">
            {/* Image Selection Grid */}
            <section>
              <h2 className="text-xl font-normal mb-4 text-[#4D4D4D] text-center"><i>Select</i> <b>Images</b></h2>
              <ImageSelectionSection
                images={_boards[_activeBoardIndex].scrapedImages}
                selectedIndices={_boards[_activeBoardIndex].selectedIndices}
                onSelect={handleImageSelect}
                _onRemove={(imageIndex: number) => handleImageRemove(_activeBoardIndex, imageIndex)}
                _isMultiBoard={true}
                _boardIndex={_activeBoardIndex}
              />
            </section>

            {/* Print Board Preview with Controls */}
            <section>
              <PrintBoardPreview
                layout={{
                  images: _boards[_activeBoardIndex].selectedIndices
                    .map(index => ({
                      url: _boards[_activeBoardIndex].scrapedImages[index].url,
                      alt: _boards[_activeBoardIndex].scrapedImages[index].alt,
                      position: { x: 0, y: 0, w: 1, h: 1 },
                      rotation: 0
                    })),
                  size: {
                    width: _boards[_activeBoardIndex].printSize.width,
                    height: _boards[_activeBoardIndex].printSize.height
                  }
                }}
                printSize={_boards[_activeBoardIndex].printSize}
                spacing={_boards[_activeBoardIndex].spacing}
                containMode={_boards[_activeBoardIndex].containMode}
                isPortrait={_boards[_activeBoardIndex].isPortrait}
                cornerRounding={_boards[_activeBoardIndex].cornerRounding}
                onRemoveImage={(index) => handleImageRemove(_activeBoardIndex, index)}
                onImageSwap={(sourceIndex: number, targetIndex: number) => {
                  handleImageSwap(sourceIndex, targetIndex);
                }}
                _index={_activeBoardIndex}
                images={_boards[_activeBoardIndex].scrapedImages}
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
                      value={_boards[_activeBoardIndex].spacing}
                      onChange={(e) => {
                        const newBoards = [..._boards];
                        newBoards[_activeBoardIndex].spacing = parseFloat(e.target.value);
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
                      value={_boards[_activeBoardIndex].cornerRounding}
                      onChange={(e) => {
                        const newBoards = [..._boards];
                        newBoards[_activeBoardIndex].cornerRounding = parseInt(e.target.value);
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
                      const newBoards = [..._boards];
                      newBoards[_activeBoardIndex].containMode = !newBoards[_activeBoardIndex].containMode;
                      setBoards(newBoards);
                    }}
                    className={`w-[210px] h-10 px-4 rounded-lg border transition-colors ${
                      _boards[_activeBoardIndex].containMode
                        ? 'border-[#4D4D4D] bg-[rgba(77,77,77,0.05)] text-[#4D4D4D]'
                        : 'border-gray-200 text-[#4D4D4D]'
                    }`}
                  >
                    {_boards[_activeBoardIndex].containMode ? 'Cover' : 'Contain'}
                  </button>

                  <button
                    onClick={() => {
                      const newBoards = [..._boards];
                      newBoards[_activeBoardIndex].isPortrait = !newBoards[_activeBoardIndex].isPortrait;
                      setBoards(newBoards);
                    }}
                    className={`w-[210px] h-10 px-4 rounded-lg border transition-colors ${
                      _boards[_activeBoardIndex].isPortrait
                        ? 'border-[#4D4D4D] bg-[rgba(77,77,77,0.05)] text-[#4D4D4D]'
                        : 'border-gray-200 text-[#4D4D4D]'
                    }`}
                  >
                    {_boards[_activeBoardIndex].isPortrait ? 'Portrait' : 'Landscape'}
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
                        const newBoards = [..._boards];
                        newBoards[_activeBoardIndex].printSize = size;
                        setBoards(newBoards);
                      }}
                      className={`p-3 rounded-lg border text-sm transition-all w-[150px] ${
                        _boards[_activeBoardIndex].printSize.width === size.width &&
                        _boards[_activeBoardIndex].printSize.height === size.height
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
                    ? `Checkout ${_boards.filter(board => board.selectedIndices.length > 0).length} Boards`
                    : 'Checkout Board'
                  }
                </button>
              </section>
            )}
          </div>
        )}

        {/* General error message */}
        {_error && (
          <div className="fixed top-4 right-4 left-4 sm:left-auto bg-[#D4A5A5]/10 border border-[#D4A5A5] text-[#D4A5A5] px-4 py-3 rounded">
            {_error}
          </div>
        )}
      </div>
    </main>
  );
}

export default MultiBoardPreview;