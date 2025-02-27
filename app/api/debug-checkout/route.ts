import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log("Debug checkout endpoint called");
    
    const data = await request.json();
    console.log("Received data:", JSON.stringify(data).substring(0, 500) + "...");
    
    // Simulate a successful response
    return NextResponse.json({
      success: true,
      message: "Debug checkout successful",
      timestamp: new Date().toISOString(),
      receivedBoards: data.boards.length,
      totalPrice: data.boards.reduce((sum: number, board: any) => sum + board.printSize.price, 0)
    });
    
  } catch (error: any) {
    console.error("Debug checkout error:", error);
    return NextResponse.json({
      error: "Debug checkout failed",
      details: error.message || "Unknown error"
    }, { status: 500 });
  }
} 