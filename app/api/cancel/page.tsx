export default function CancelPage() {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">Order Cancelled</h1>
            <p className="text-gray-600 mb-6">
              Your order has been cancelled and no payment has been processed.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Home
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }