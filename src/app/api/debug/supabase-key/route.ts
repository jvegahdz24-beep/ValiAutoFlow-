import { NextResponse } from "next/server"

/**
 * Debug endpoint to verify how Supabase API key is being sent from Vercel.
 * This helps diagnose why the key works locally but fails from Vercel.
 */
export async function GET() {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const b64 = process.env.SUPABASE_SERVICE_ROLE_KEY_B64 || ''
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  // Try to decode B64
  let b64Decoded = ''
  if (b64) {
    try {
      b64Decoded = Buffer.from(b64, 'base64').toString('utf-8')
    } catch {}
  }

  const keyToUse = b64Decoded || raw

  // Test 1: Direct fetch to Supabase with verbose logging
  let fetchResult = {}
  try {
    const testUrl = url + '/rest/v1/users?select=id&limit=1'
    const res = await fetch(testUrl, {
      headers: {
        'apikey': keyToUse,
        'Authorization': 'Bearer ' + keyToUse,
        'Accept-Profile': 'public',
        'Content-Profile': 'public',
      },
    })
    const text = await res.text()
    fetchResult = {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      body: text.substring(0, 300),
    }
  } catch (err: any) {
    fetchResult = { error: err.message }
  }

  // Test 2: Echo the key via httpbin to see what's actually being sent
  let echoResult = {}
  try {
    const echoRes = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Key': keyToUse,
      },
      body: JSON.stringify({ keyLength: keyToUse.length, keyFirst10: keyToUse.substring(0, 10) }),
    })
    const echoData = await echoRes.json()
    echoResult = {
      sentKeyLen: echoData?.headers?.['X-Test-Key']?.length || 'N/A',
      sentKeyFirst10: echoData?.headers?.['X-Test-Key']?.substring(0, 10) || 'N/A',
      origin: echoData?.origin || 'N/A',
    }
  } catch (err: any) {
    echoResult = { error: err.message }
  }

  return NextResponse.json({
    env: {
      url,
      rawKeyLen: raw.length,
      rawKeyFirst15: raw.substring(0, 15),
      rawKeyLast15: raw.slice(-15),
      b64KeyLen: b64.length,
      b64DecodedLen: b64Decoded.length,
      b64DecodedFirst15: b64Decoded.substring(0, 15),
      keyBeingUsedLen: keyToUse.length,
      keyBeingUsedFirst15: keyToUse.substring(0, 15),
      hexFirst20: Buffer.from(keyToUse.substring(0, 20)).toString('hex'),
    },
    supabaseFetch: fetchResult,
    httpbinEcho: echoResult,
  })
}
