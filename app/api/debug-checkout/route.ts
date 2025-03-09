import { NextResponse } from 'next/server';

interface _CheckoutRequest {
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    name: string;
  }>;
  customerInfo?: {
    email: string;
    name: string;
  };
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

interface CheckoutResponse {
  success: boolean;
  data: {
    sessionId: string;
    url: string;
  };
}

interface Board {
  printSize: {
    price: number;
  };
}

export async function POST(request: Request) {
  try {
    console.log("Debug checkout endpoint called");
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await request.json() as any;
    console.log("Received data:", JSON.stringify(data).substring(0, 500) + "...");
    
    // Simulate a successful response
    const result = {
      success: true,
      message: "Debug checkout successful",
      timestamp: new Date().toISOString(),
      receivedBoards: data.boards.length,
      totalPrice: data.boards.reduce((sum: number, board: Board) => sum + board.printSize.price, 0)
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.timestamp || 'debug-session',
        url: '/checkout/success?debug=true'
      }
    } as CheckoutResponse);
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Debug checkout error:", errorMessage);
    return NextResponse.json({
      error: "Debug checkout failed",
      details: errorMessage
    }, { status: 500 });
  }
} 