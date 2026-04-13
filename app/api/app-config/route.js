import { NextResponse } from 'next/server';
import { getSystemConfig } from '../../../lib/config';

// GET — Retorna configs públicas (manutenção, banner) sem auth
export async function GET() {
  const sys = await getSystemConfig();
  return NextResponse.json({
    maintenanceMode: sys.maintenanceMode,
    maintenanceMessage: sys.maintenanceMessage,
    globalBanner: sys.globalBanner,
    globalBannerType: sys.globalBannerType,
  });
}
