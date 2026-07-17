/**
 * QR 码生成工具
 * 使用 qrcode 库将 URL 编码为 base64 PNG 图片
 */
import QRCode from 'qrcode';

/**
 * 生成 QR 码 base64 PNG
 * @param text QR 码内容（通常是带 UTM 的 URL）
 * @param size 图片尺寸（像素），默认 200
 * @returns base64 data URL（可直接用于 <img src=""> 或 canvas drawImage）
 */
export async function generateQR(text: string, size: number = 200): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch (err) {
    console.error('[qrGenerator] Failed to generate QR code:', err);
    // fallback: 返回 1x1 透明像素，避免渲染崩溃
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}

/**
 * 构建带 UTM 参数的 URL
 * @param baseUrl 基础 URL（如 https://awkn.cn/life/）
 * @param utm UTM 参数
 * @returns 完整 URL
 */
export function buildUTMUrl(
  baseUrl: string,
  utm: {
    source: string;
    medium?: string;
    campaign?: string;
    inviteCode?: string;
  }
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', utm.source);
  if (utm.medium) url.searchParams.set('utm_medium', utm.medium);
  if (utm.campaign) url.searchParams.set('utm_campaign', utm.campaign);
  if (utm.inviteCode) url.searchParams.set('invite_code', utm.inviteCode);
  return url.toString();
}
