import { randomInt } from "crypto";

// Chalkash harflar (0/O, 1/l/I) chiqarib tashlangan — qo'lda ko'chirishda xato bo'lmasin.
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const ALL = LOWER + UPPER + DIGITS;

function pick(charset: string): string {
  return charset[randomInt(0, charset.length)];
}

/** §8.1: kamida 8 belgi, harf va raqam. */
export function generateTempPassword(length = 10): string {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS)];
  for (let i = chars.length; i < length; i++) chars.push(pick(ALL));

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
