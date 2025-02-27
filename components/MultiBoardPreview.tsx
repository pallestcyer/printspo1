import React, { useState, useEffect, useRef, Dispatch, SetStateAction, useCallback } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Loader2, Download } from 'lucide-react';
import { PrintBoardPreview } from './PrintBoardPreview';
import { ImageSelectionSection } from './ImageSelectionSection';
import { PRINT_SIZES } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import _Image from 'next/image';
import { type Board, ScrapedImage } from '@/app/types';
import { cn } from '@/lib/utils';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DraggableImage } from './DraggableImage';
import update from 'immutability-helper';

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

interface EnhancedScrapedImage extends ScrapedImage {
  id?: string;
}

type EnhancedBoard = Omit<Board, 'scrapedImages'> & {
  scrapedImages: EnhancedScrapedImage[];
};

const calculateOrderTotal = (boards: Board[]) => {
  return boards.reduce((total, board) => {
    // Only add to total if board has selected images
    return total + (board.selectedIndices.length > 0 ? board.printSize.price : 0);
  }, 0);
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
  const router = useRouter();
  const [boards, setBoards] = useState<EnhancedBoard[]>([{
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
  const [_loading, _setLoading] = useState(false);
  const [_errors, setErrors] = useState<ErrorStates>({});
  const [_error, setError] = useState<string | null>(null);
  const [_loadingStates, setLoadingStates] = useState<LoadingStates>({});
  const [_isReturningFromCheckout, _setIsReturningFromCheckout] = useState(false);

  // Add missing state variables for drag functionality
  const [_isDragging, _setIsDragging] = useState(false);
  const [_startX, _setStartX] = useState(0);
  const [_scrollLeft, _setScrollLeft] = useState(0);
  const _gridRef = useRef<HTMLDivElement>(null);

  // Add state for selected images
  const [_selectedImages, _setSelectedImages] = useState<string[]>([]);

  // Add this with the other state variables at the top of the component
  const [isLoading, setIsLoading] = useState(false);

  // Add success state
  const [_success, _setSuccess] = useState(false);

  // Save boards state to localStorage whenever it changes
  const saveToLocalStorage = (boards: Board[]) => {
    localStorage.setItem('boards', JSON.stringify(boards));
  };

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

  const _validateBoard = (board: Board): string | null => {
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
    const board = boards[boardIndex];
    
    try {
      if (!url.trim()) {
        throw new Error('Please enter a Pinterest URL');
      }

      // Start loading state
      setLoadingStates(prev => ({ ...prev, [board.id]: 0 }));
      setErrors(prev => ({ ...prev, [board.id]: null }));

      // Show initial loading progress
      setLoadingStates(prev => ({ ...prev, [board.id]: 30 }));

      // Use relative URL instead of hardcoded localhost
      const apiUrl = '/api/scrape';

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
      setIsLoading(true);
      
      // Filter boards that have selected images
      const boardsToOrder = boards.filter(board => board.selectedIndices.length > 0);
      
      if (boardsToOrder.length === 0) {
        setError("Please select at least one image for your board");
        setIsLoading(false);
        return;
      }
      
      // Prepare the order data
      const orderData = {
        boards: boardsToOrder.map(board => ({
          printSize: board.printSize,
          settings: {
            selectedIndices: board.selectedIndices,
            scrapedImages: board.scrapedImages.map(img => ({
              url: img.url,
              alt: img.alt || ''
            })),
            spacing: board.spacing,
            containMode: board.containMode,
            isPortrait: board.isPortrait,
            cornerRounding: board.cornerRounding
          }
        }))
      };
      
      console.log("Sending order data:", orderData);
      
      // Use the real checkout endpoint
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const { sessionId } = await response.json();
      
      // Redirect to Stripe Checkout
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) {
        throw error;
      }

    } catch (error) {
      console.error('Checkout error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process checkout');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewDownload = async (board: Board) => {
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
          cornerRounding: board.cornerRounding,
          isPortrait: board.isPortrait,
          isPreview: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate preview');
      }

      // Get the image URL from the response
      const data = await response.json();
      
      // Fetch the image from Cloudinary
      const imageResponse = await fetch(data.images[0].previewUrl);
      if (!imageResponse.ok) throw new Error('Failed to fetch preview image');
      
      // Get the blob from the response
      const blob = await imageResponse.blob();
      
      // Create a download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `print-preview-${Date.now()}.jpg`; // Set filename
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      console.error('Preview download error:', error);
      throw new Error('Failed to generate preview');
    }
  };

  const _handleReorderImages = (boardIndex: number, newOrder: number[]) => {
    const newBoards = [...boards];
    const board = newBoards[boardIndex];
    
    // Reorder the selectedIndices array based on the new order
    board.selectedIndices = newOrder.map(index => board.selectedIndices[index]);
    setBoards(newBoards);
  };

  const _handleBoardSelect = (index: number) => {
    if (index >= 0 && index < boards.length) {
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
    if (indexToDelete <= activeBoardIndex) {
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

    const newBoards = [...boards];
    newBoards[activeBoardIndex].scrapedImages = loadedImages;
    setBoards(newBoards);
  };

  const handleImageSelect = (boardId: string, imageUrl: string) => {
    _setSelectedImages(prev => [...prev, imageUrl]);
  };

  const handleImageRemove = (boardId: string, imageUrl: string) => {
    _setSelectedImages(prev => prev.filter(url => url !== imageUrl));
  };

  const _handleAddBoard = () => {
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

  const FREE_SHIPPING_THRESHOLD = 59;

  const orderTotal = calculateOrderTotal(boards);
  const _amountToFreeShipping = FREE_SHIPPING_THRESHOLD - orderTotal;

  // Initialize selected images for each board
  useEffect(() => {
    const initialSelectedImages = boards[activeBoardIndex]?.selectedIndices?.map(String) || [];
    _setSelectedImages(initialSelectedImages);
  }, [boards, activeBoardIndex]);

  // Handle image reordering
  const moveImage = useCallback((dragIndex: number, hoverIndex: number) => {
    const activeBoard = boards[activeBoardIndex];
    const draggedImageIndex = activeBoard.selectedIndices[dragIndex];
    
    // Create a new array of selected indices with the reordered items
    const newSelectedIndices = [...activeBoard.selectedIndices];
    newSelectedIndices.splice(dragIndex, 1);
    newSelectedIndices.splice(hoverIndex, 0, draggedImageIndex);
    
    // Update the boards state with the new order
    setBoards(prevBoards => {
      const newBoards = [...prevBoards];
      newBoards[activeBoardIndex] = {
        ...newBoards[activeBoardIndex],
        selectedIndices: newSelectedIndices
      };
      return newBoards;
    });
  }, [boards, activeBoardIndex]);

  const handleBoardRemove = (boardId: string) => {
    setBoards(prev => prev.filter(board => board.id !== boardId));
    _setSelectedImages(prev => prev.filter(url => !url.includes(boardId)));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <main className={cn('min-h-screen', className)}>
        <div className="container mx-auto px-4 py-4 max-w-6xl">

          {/* URL Input Section */}
          <div className="bg-white rounded-xl p-6 max-w-3xl mx-auto mb-4">
            <div className="relative">
              {/* Step indicator */}
              <div className="absolute -left-12 -top-10 w-12 h-12 bg-[#D4A5A5] rounded-full flex items-center justify-center">
                <span className="font-serif font-[200] italic text-white text-5xl -mt-2">1</span>
              </div>
              
              {/* Existing header content */}
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h2 className="text-2xl text-[#4D4D4D] font-[500]"><b>Import </b>your Board</h2> 
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
                      <span>Create</span>
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
            <div className="bg-white rounded-xl p-6 max-w-3xl mx-auto space-y-6">
              {/* Image Selection Carousel */}
              <section>
                <h2 className="text-2xl font-normal mb-6 text-[#4D4D4D] text-center">Curate your <b>Images</b></h2>
                <div className="relative">
                  <div className="overflow-x-auto pb-2 hide-scrollbar">
                    <div className="flex space-x-3 px-2">
                      {boards[activeBoardIndex].scrapedImages
                        // Filter out images that are already in the print board
                        .filter((_, index) => !boards[activeBoardIndex].selectedIndices.includes(index))
                        .map((image, _filteredIndex) => {
                          // Find the original index in the scrapedImages array
                          const originalIndex = boards[activeBoardIndex].scrapedImages.findIndex(
                            (img, idx) => img.url === image.url && !boards[activeBoardIndex].selectedIndices.includes(idx)
                          );
                          
                          return (
                            <div 
                              key={`image-${originalIndex}`}
                              className="flex-shrink-0 w-20 h-20 relative overflow-hidden rounded-lg cursor-pointer hover:opacity-90"
                              onClick={() => {
                                // Add to print board selection
                                const newBoards = [...boards];
                                const currentBoard = newBoards[activeBoardIndex];
                                currentBoard.selectedIndices = [...currentBoard.selectedIndices, originalIndex];
                                setBoards(newBoards);
                              }}
                            >
                              <img
                                src={image.url}
                                alt={image.alt || ''}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          );
                        })}
                    </div>
                  </div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 rounded-r-full p-1 shadow-sm">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 rounded-l-full p-1 shadow-sm">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </section>

              {/* Print Board Preview */}
              <section className="mt-6">
                <h2 className="text-xl font-normal mb-4 text-[#4D4D4D] text-center">Print Preview</h2>
                <DndProvider backend={HTML5Backend}>
                  <PrintBoardPreview
                    layout={{
                      images: boards[activeBoardIndex].selectedIndices.map(index => ({
                        url: boards[activeBoardIndex].scrapedImages[index].url,
                        alt: boards[activeBoardIndex].scrapedImages[index].alt || '',
                        position: { x: 0, y: 0, w: 1, h: 1 },
                        rotation: 0
                      })),
                      size: { 
                        width: boards[activeBoardIndex].printSize?.width || 0, 
                        height: boards[activeBoardIndex].printSize?.height || 0 
                      }
                    }}
                    printSize={boards[activeBoardIndex].printSize}
                    spacing={boards[activeBoardIndex].spacing}
                    containMode={boards[activeBoardIndex].containMode}
                    isPortrait={boards[activeBoardIndex].isPortrait}
                    cornerRounding={boards[activeBoardIndex].cornerRounding}
                    onRemoveImage={(indexToRemove) => {
                      // When an image is removed from the print board, it should return to the selection panel
                      const newBoards = [...boards];
                      const newSelectedIndices = newBoards[activeBoardIndex].selectedIndices.filter(
                        (_, i) => i !== indexToRemove
                      );
                      newBoards[activeBoardIndex] = {
                        ...newBoards[activeBoardIndex],
                        selectedIndices: newSelectedIndices
                      };
                      setBoards(newBoards);
                    }}
                    onImageSwap={moveImage}
                    _index={activeBoardIndex}
                    images={boards[activeBoardIndex].selectedIndices.map(index => boards[activeBoardIndex].scrapedImages[index])}
                  />
                </DndProvider>
              </section>

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
            </div>
          )}

          {/* Checkout Section - Only show when there are selected images */}
          {boards.some(board => board.selectedIndices.length > 0) && (
            <div className="mt-8 p-6 bg-white rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-[#4D4D4D] mb-4">Order Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-[#4D4D4D]">
                  <span className="font-serif">Subtotal</span>
                  <span className="font-serif">${orderTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#4D4D4D]">
                  <span className="font-serif">Shipping</span>
                  {orderTotal >= FREE_SHIPPING_THRESHOLD ? (
                    <span className="font-serif text-green-600">FREE</span>
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
          )}

          {/* Checkout and Preview Section */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={handleCheckout}
              disabled={isLoading || !boards.some(board => board.selectedIndices.length > 0)}
              className={cn(
                "px-12 py-3 bg-[#D4A5A5] text-white rounded-lg font-medium transition-all duration-200 text-lg",
                "hover:bg-[#b38989] disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]",
                "flex items-center justify-center gap-2"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Complete Order
                  {orderTotal > 0 && ` • $${(orderTotal + (orderTotal >= FREE_SHIPPING_THRESHOLD ? 0 : 9.99)).toFixed(2)}`}
                </>
              )}
            </button>

            <button
              onClick={() => _generatePreview(boards[activeBoardIndex])}
              className="p-3 text-gray-600 hover:text-gray-800 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              title="Download Preview"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>

          {/* General error message */}
          {_error && (
            <div className="fixed top-4 right-4 left-4 sm:left-auto bg-[#D4A5A5]/10 border border-[#D4A5A5] text-[#D4A5A5] px-4 py-3 rounded">
              {_error}
            </div>
          )}

          {/* Success message */}
          {_success && (
            <div className="fixed top-4 right-4 left-4 sm:left-auto bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {_success}
            </div>
          )}
        </div>
      </main>
    </DndProvider>
  );
}

export default MultiBoardPreview;