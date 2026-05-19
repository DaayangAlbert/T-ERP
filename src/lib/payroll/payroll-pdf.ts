import QRCode from "qrcode";

export function getPublicPayslipUrl(relativeUrl: string, requestUrl?: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (requestUrl ? new URL(requestUrl).origin : "http://localhost:3000");
  return new URL(relativeUrl, base).toString();
}

export async function generatePayslipQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 164,
    color: {
      dark: "#2A1B3D",
      light: "#FFFFFF",
    },
  });
}
