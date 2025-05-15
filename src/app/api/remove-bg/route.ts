// import Replicate from 'replicate'; // Removed
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Re-enable Edge runtime

// Helper function to convert ArrayBuffer to Base64 string for Data URI
async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Use btoa for base64 encoding in Edge runtime
  return btoa(binary);
}

export async function POST(req: NextRequest) {
  const replicateApiKey = process.env.REPLICATE_API_TOKEN;

  if (!replicateApiKey) {
    // This will be caught by the Next.js runtime and result in a 500 error
    throw new Error('REPLICATE_API_TOKEN is not set');
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 });
  }

  // Convert File to a data URL for Replicate API
  const fileBuffer = await file.arrayBuffer();
  const mimeType = file.type || 'application/octet-stream'; // Fallback MIME type
  const base64String = await arrayBufferToBase64(fileBuffer);
  const dataURI = `data:${mimeType};base64,${base64String}`;

  const modelVersion = 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003'; // Updated model version for cjwbw/rembg

  try {
    // Step 1: Start the prediction
    const startPredictionResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: modelVersion,
        input: {
          image: dataURI,
          model: 'isnet-general-use', // Parameter for the rembg model
        },
      }),
    });

    if (!startPredictionResponse.ok) {
      const errorData = await startPredictionResponse.json().catch(() => ({ detail: "Unknown error starting prediction." }));
      console.error('Replicate API error (starting prediction):', errorData);
      return NextResponse.json({ error: `Failed to start prediction: ${errorData.detail || startPredictionResponse.statusText}` }, { status: startPredictionResponse.status });
    }

    let prediction = await startPredictionResponse.json();

    // Step 2: Poll for the result
    let attempts = 0;
    const maxAttempts = 60; // Poll for a maximum of ~60 seconds

    while (
      prediction.status !== 'succeeded' &&
      prediction.status !== 'failed' &&
      prediction.status !== 'canceled' &&
      attempts < maxAttempts
    ) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second

      if (!prediction.urls || !prediction.urls.get) {
        console.error('Replicate API error: Polling URL not found in prediction response.', prediction);
        return NextResponse.json({ error: 'Failed to get polling URL for prediction.' }, { status: 500 });
      }

      const pollResponse = await fetch(prediction.urls.get, {
        headers: {
          'Authorization': `Token ${replicateApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!pollResponse.ok) {
        const errorData = await pollResponse.json().catch(() => ({ detail: "Unknown error polling prediction." }));
        console.error('Replicate API error (polling):', errorData);
        // If polling fails, it might be a temporary issue, but we'll return an error after some retries.
        // For now, we let the loop continue until maxAttempts or status changes.
        // If critical, one could return an error here directly.
      } else {
        prediction = await pollResponse.json();
      }
    }

    if (attempts >= maxAttempts && (prediction.status !== 'succeeded' && prediction.status !== 'failed' && prediction.status !== 'canceled')) {
        console.error('Replicate prediction timed out after polling.');
        return NextResponse.json({ error: 'Prediction timed out.' }, { status: 504 }); // Gateway Timeout
    }
    
    if (prediction.status !== 'succeeded' || !prediction.output) {
      console.error('Replicate prediction failed or no output:', prediction);
      const userError = prediction.error ? `Prediction failed: ${prediction.error}` : 'Prediction failed or did not produce an output.';
      return NextResponse.json({ error: userError }, { status: 500 });
    }

    // Ensure the output is a string URL (or an array with a string URL)
    let outputUrl: string | undefined;
    if (Array.isArray(prediction.output) && typeof prediction.output[0] === 'string') {
        outputUrl = prediction.output[0];
    } else if (typeof prediction.output === 'string') {
        outputUrl = prediction.output;
    }

    if (!outputUrl) {
      console.error('Replicate API did not return a valid image URL:', prediction.output);
      return NextResponse.json({ error: 'Failed to get processed image URL from Replicate' }, { status: 500 });
    }

    // Step 3: Fetch the processed image from the output URL
    const imageResponse = await fetch(outputUrl);

    if (!imageResponse.ok) {
      console.error('Failed to fetch processed image from Replicate CDN:', imageResponse.status, await imageResponse.text());
      return NextResponse.json({ error: 'Failed to fetch processed image' }, { status: imageResponse.status });
    }

    const imageBlob = await imageResponse.blob();

    return new NextResponse(imageBlob, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
      },
    });

  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('Error in remove-bg API route:', error);
    // Ensure a generic error is returned to the client for unhandled exceptions
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
} 