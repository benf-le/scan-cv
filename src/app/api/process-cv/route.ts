import { NextRequest, NextResponse } from 'next/server';
import { normalizeCandidate } from '../../../types';
import { mockCandidates } from '../../../utils/mockData';

export async function GET() {
  return NextResponse.json({
    envConfigured: !!process.env.N8N_WEBHOOK_URL
  });
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const useMock = searchParams.get('mock') === 'true';
    
    // Parse FormData from client
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded.' },
        { status: 400 }
      );
    }

    // Server-side PDF validation
    for (const file of files) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        return NextResponse.json(
          { error: `File "${file.name}" must be a PDF.` },
          { status: 400 }
        );
      }
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the 10MB size limit.` },
          { status: 400 }
        );
      }
    }

    const n8nUrl = process.env.N8N_WEBHOOK_URL;

    // Trigger mock simulation if explicitly requested, or if N8N URL is missing
    if (useMock || !n8nUrl) {
      console.log(`Running in mock mode. Files received: ${files.length}. URL configured: ${!!n8nUrl}`);
      
      // Simulate network / AI processing delay
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Generate dynamic mock responses matching uploaded filenames
      const results = files.map((file, index) => {
        // Pick one of our high-quality template profiles, adjust details for variety
        const baseMock = mockCandidates[index % mockCandidates.length];
        
        // Custom name adjustments based on file name if possible
        let parsedName = baseMock.name;
        const cleanName = file.name
          .replace(/\.pdf$/i, '')
          .replace(/[_-]/g, ' ')
          .trim();
        
        if (cleanName.length > 3 && !cleanName.toLowerCase().includes('cv') && !cleanName.toLowerCase().includes('resume')) {
          parsedName = cleanName;
        }

        return normalizeCandidate({
          ...baseMock,
          id: `parsed-${Date.now()}-${index}`,
          name: parsedName,
          fileName: file.name,
          // Randomize status/dates slightly to make it feel organic
          status: index === 0 ? 'Offer Accepted' : index === 1 ? 'Interviewing' : 'Screening',
          appliedDate: new Date().toISOString().split('T')[0]
        }, file.name);
      });

      return NextResponse.json({
        success: true,
        isMock: true,
        envConfigured: !!n8nUrl,
        data: results
      });
    }

    // Proxy request to n8n Webhook
    console.log(`Proxying ${files.length} file(s) to n8n Webhook: ${n8nUrl}`);
    
    const n8nFormData = new FormData();
    files.forEach((file) => {
      n8nFormData.append('files', file);
    });

    // Prepare headers for the n8n request
    const headers: Record<string, string> = {};

    // 1. Bearer Token Auth
    if (process.env.N8N_BEARER_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.N8N_BEARER_TOKEN}`;
    }
    // 2. Basic Auth
    else if (process.env.N8N_BASIC_AUTH_USER && process.env.N8N_BASIC_AUTH_PASSWORD) {
      const creds = `${process.env.N8N_BASIC_AUTH_USER}:${process.env.N8N_BASIC_AUTH_PASSWORD}`;
      const base64Creds = Buffer.from(creds).toString('base64');
      headers['Authorization'] = `Basic ${base64Creds}`;
    }
    // 3. Custom Header API Key
    else if (process.env.N8N_API_KEY_HEADER_NAME && process.env.N8N_API_KEY_VALUE) {
      headers[process.env.N8N_API_KEY_HEADER_NAME] = process.env.N8N_API_KEY_VALUE;
    }
    // 4. Raw Auth Header
    else if (process.env.N8N_AUTH_HEADER) {
      headers['Authorization'] = process.env.N8N_AUTH_HEADER;
    }

    console.log('Sending request to n8n with headers:', Object.keys(headers));

    // Send to n8n synchronously
    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers,
      body: n8nFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`n8n responded with error status: ${response.status}. Body: ${errorText}`);
      throw new Error(`n8n processing failed with status ${response.status}`);
    }

    const rawData = await response.json();
    console.log('Successfully received data from n8n');

    // Handle single object vs list of candidates in n8n response
    const rawArray = Array.isArray(rawData) ? rawData : [rawData];
    
    // Normalize n8n items
    const normalizedData = rawArray.map((item, index) => {
      const associatedFile = files[index % files.length]?.name || 'unknown_cv.pdf';
      return normalizeCandidate(item, associatedFile);
    });

    return NextResponse.json({
      success: true,
      isMock: false,
      envConfigured: true,
      data: normalizedData
    });

  } catch (err: any) {
    console.error('Error proxying to n8n:', err);
    return NextResponse.json(
      { 
        error: err.message || 'An error occurred during CV processing.',
        envConfigured: !!process.env.N8N_WEBHOOK_URL
      },
      { status: 500 }
    );
  }
}
