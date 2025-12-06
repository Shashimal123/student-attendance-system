import QRCode from 'qrcode'

export interface QRCodeOptions {
  width?: number
  margin?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
}

const DEFAULT_OPTIONS: Required<QRCodeOptions> = {
  width: 512,
  margin: 2,
  errorCorrectionLevel: 'H'
}

export async function generateQRCodeDataURL(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return await QRCode.toDataURL(data, {
    width: opts.width,
    margin: opts.margin,
    errorCorrectionLevel: opts.errorCorrectionLevel,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })
}

export async function generateQRCodeSVG(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return await QRCode.toString(data, {
    type: 'svg',
    width: opts.width,
    margin: opts.margin,
    errorCorrectionLevel: opts.errorCorrectionLevel,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })
}

