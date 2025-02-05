const checkBuildRequirements = () => {
  const requiredForBuild = [
    'NEXT_PUBLIC_BASE_URL',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'RESEND_API_KEY'
  ];

  const missing = requiredForBuild.filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }

  console.log('✅ Build requirements met');
}

checkBuildRequirements();

module.exports = checkBuildRequirements; 