require('dotenv').config({ path: '.env.local' });

function checkBuildRequirements() {
  const requiredForBuild = [
    'NEXT_PUBLIC_BASE_URL',
  ];

  console.log('Current environment variables:', {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  });

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