import type { Size, WearerType } from '@/features/orders/types'

const DESIGN_DIR = `${import.meta.env.BASE_URL}design/`

export interface DesignView {
  key: string
  label: string
  src: string
}

/** Image files live in `public/design/`; a placeholder is shown while a file is missing. */
export const DESIGN_VIEWS: DesignView[] = [
  { key: 'front', label: 'Depan', src: `${DESIGN_DIR}front.png` },
  { key: 'back', label: 'Belakang', src: `${DESIGN_DIR}back.jpg` },
  { key: 'long-sleeve', label: 'Lengan panjang', src: `${DESIGN_DIR}long-sleeve.jpg` },
]

export const DESIGN_NOTES = [
  'Logo "Paten Erte 02 · Guyup Rukun" di dada kiri.',
  'Bagian belakang polos, tanpa logo.',
  'Tersedia lengan pendek, lengan panjang, dan lengan panjang 7/8 dengan desain yang sama.',
]

export interface SizeChartRow {
  size: Size
  width: number
  length: number
}

/** Measurements in cm, from the vendor (Rumah Sablon Jogja). */
export const SIZE_CHARTS: Record<WearerType, SizeChartRow[]> = {
  Dewasa: [
    { size: 'S', width: 47, length: 71 },
    { size: 'M', width: 49, length: 73 },
    { size: 'L', width: 53, length: 76 },
    { size: 'XL', width: 57, length: 77 },
    { size: 'XXL', width: 62, length: 82 },
    { size: 'XXXL', width: 66, length: 85 },
  ],
  Anak: [
    { size: 'S', width: 36, length: 48 },
    { size: 'M', width: 38, length: 53 },
    { size: 'L', width: 43, length: 57 },
    { size: 'XL', width: 46, length: 59 },
    { size: 'XXL', width: 48, length: 63 },
    { size: 'XXXL', width: 50, length: 65 },
  ],
}

export const SIZE_TOLERANCE = 'Toleransi jahit 1–3 cm.'
