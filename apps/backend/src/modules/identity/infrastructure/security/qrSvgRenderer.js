import QRCode from 'qrcode';

/** The otpauth URI as an SVG QR code (no image is stored anywhere). */
export function createQrSvgRenderer() {
  return {
    toSvg: (text) => QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'M', margin: 2 }),
  };
}
