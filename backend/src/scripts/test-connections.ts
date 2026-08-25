import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import dns from 'dns';

// Configure DNS servers if standard SRV lookup fails (common on Windows)
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

// Load .env explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

function maskUri(uri: string): string {
  if (!uri) return '(not set)';
  try {
    return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/, '$1******$3');
  } catch {
    return '***';
  }
}

function maskKey(key: string): string {
  if (!key) return '(not set)';
  if (key.length <= 8) return '********';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

async function testMongoDB(): Promise<boolean> {
  console.log('\n========================================');
  console.log('1. Testing MongoDB Connection');
  console.log('========================================');
  console.log(`URI: ${maskUri(MONGODB_URI)}`);

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in backend/.env');
    return false;
  }

  const startTime = Date.now();
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });

    const duration = Date.now() - startTime;
    console.log(`✅ MongoDB Connected Successfully! (${duration}ms)`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database Name: ${conn.connection.name || '(default)'}`);
    console.log(`   Ready State: Connected (state: ${conn.connection.readyState})`);
    
    await mongoose.disconnect();
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ MongoDB Connection Failed (${duration}ms):`);
    console.error(`   Error: ${message}`);
    return false;
  }
}

async function testGeminiAPI(): Promise<boolean> {
  console.log('\n========================================');
  console.log('2. Testing Gemini API Key');
  console.log('========================================');
  console.log(`API Key: ${maskKey(GEMINI_API_KEY)}`);

  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set in backend/.env');
    return false;
  }

  const startTime = Date.now();
  try {
    // 1. Try listing models first to inspect key permissions
    const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
    const listRes = await fetch(listModelsUrl);
    const listData = await listRes.json();

    if (!listRes.ok) {
      console.error(`❌ Gemini API Authentication Failed with HTTP ${listRes.status}:`);
      console.error(`   Message: ${listData?.error?.message || JSON.stringify(listData)}`);
      return false;
    }

    const availableModels: string[] = (listData.models || [])
      .filter((m: { supportedGenerationMethods?: string[] }) => 
        m.supportedGenerationMethods?.includes('generateContent')
      )
      .map((m: { name: string }) => m.name.replace('models/', ''));

    console.log(`✅ Gemini API Key Authenticated!`);
    console.log(`   Available models: ${availableModels.join(', ')}`);

    // Prioritize working standard models: gemini-3.6-flash, gemini-3.5-flash, gemini-flash-latest, etc.
    const priorityModels = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest', ...availableModels];
    const targetModel = priorityModels.find(m => availableModels.includes(m)) || availableModels[0];

    console.log(`   Attempting generation with model: "${targetModel}"...`);

    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${GEMINI_API_KEY}`;
    const genRes = await fetch(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with the exact words: "Gemini API Connection Verified!"' }] }],
      }),
    });

    const genData = await genRes.json();
    const duration = Date.now() - startTime;

    if (!genRes.ok) {
      console.error(`❌ Content Generation Failed on model ${targetModel}: ${genData?.error?.message}`);
      return false;
    }

    const reply = genData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    console.log(`✅ Generation Verified using model "${targetModel}" (${duration}ms)`);
    console.log(`   AI Response: "${reply}"`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Gemini API Request Failed (${duration}ms):`);
    console.error(`   Error: ${message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Running Credentials & Connectivity Test for Exam & Academic Assistant...');
  
  const mongoOk = await testMongoDB();
  const geminiOk = await testGeminiAPI();

  console.log('\n========================================');
  console.log('Summary of Test Results:');
  console.log('========================================');
  console.log(`MongoDB:    ${mongoOk ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Gemini API: ${geminiOk ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('========================================\n');

  if (mongoOk && geminiOk) {
    console.log('🎉 All credentials and external connections are fully operational!\n');
    process.exit(0);
  } else {
    console.log('⚠️  One or more tests failed. Please inspect the error messages above.\n');
    process.exit(1);
  }
}

main();
