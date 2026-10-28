/**
 * BLE CRC-24 (polynomial 0x00065B, init 0x555555), bits fed LSB first, as the Link Layer does.
 * Returns the three CRC bytes in the order they go on air.
 */
export function bleCrc24(bytes: readonly number[]): [number, number, number] {
  let crc = 0x555555;
  for (const b of bytes) {
    for (let i = 0; i < 8; i++) {
      const fb = ((crc >> 23) & 1) ^ ((b >> i) & 1);
      crc = (crc << 1) & 0xffffff;
      if (fb) crc ^= 0x00065b;
    }
  }
  return [crc & 0xff, (crc >> 8) & 0xff, (crc >> 16) & 0xff];
}
