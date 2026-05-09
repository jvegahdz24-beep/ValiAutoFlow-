import { NextResponse } from "next/server";
import { getServerSession } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  return NextResponse.json({ message: "Hello, world!" });
}