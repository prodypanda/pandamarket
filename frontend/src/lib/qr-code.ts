import QRCode from 'qrcode';

const qrOptions = {
  color: {
    dark: '#111827',
    light: '#ffffff',
  },
  errorCorrectionLevel: 'M' as const,
  margin: 4,
  width: 256,
};

export async function createQrCodeSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    ...qrOptions,
    type: 'svg',
  });
}

export async function createQrCodeDataUri(text: string): Promise<string> {
  return QRCode.toDataURL(text, qrOptions);
}