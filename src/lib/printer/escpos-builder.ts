const ESC = 0x1b;
const GS = 0x1d;

/**
 * Normalizes accents to standard ASCII to prevent garbled glyphs on ESC/POS thermal printers.
 */
export function sanitizeEscPosText(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n\r]/g, " ");
}

/**
 * Single reusable ESC/POS binary protocol builder shared across order and cash shift receipts.
 */
export class EscPosBuilder {
  private readonly bytes: number[] = [];
  public readonly cols: number;

  constructor(paperWidth: "80mm" | "58mm") {
    this.cols = paperWidth === "80mm" ? 48 : 32;
  }

  raw(...b: number[]): this {
    this.bytes.push(...b);
    return this;
  }

  init(): this {
    return this.raw(ESC, 0x40);
  }

  beep(): this {
    return this.raw(ESC, 0x42, 0x02, 0x02, 0x07);
  }

  align(mode: "left" | "center" | "right"): this {
    const code = mode === "center" ? 0x01 : mode === "right" ? 0x02 : 0x00;
    return this.raw(ESC, 0x61, code);
  }

  bold(on: boolean): this {
    return this.raw(ESC, 0x45, on ? 0x01 : 0x00);
  }

  size(mode: "normal" | "doubleHeight" | "doubleBoth"): this {
    const code = mode === "doubleBoth" ? 0x11 : mode === "doubleHeight" ? 0x01 : 0x00;
    return this.raw(GS, 0x21, code);
  }

  text(str: string): this {
    const sanitized = sanitizeEscPosText(str);
    for (let i = 0; i < sanitized.length; i++) {
      this.bytes.push(sanitized.charCodeAt(i));
    }
    return this;
  }

  line(str = ""): this {
    return this.text(str + "\n");
  }

  divider(char = "-"): this {
    return this.line(char.repeat(this.cols));
  }

  twoColumns(left: string, right: string): this {
    const cleanLeft = sanitizeEscPosText(left);
    const cleanRight = sanitizeEscPosText(right);
    const space = this.cols - cleanLeft.length - cleanRight.length;
    if (space > 0) {
      return this.line(cleanLeft + " ".repeat(space) + cleanRight);
    }
    this.line(cleanLeft);
    return this.line(" ".repeat(Math.max(0, this.cols - cleanRight.length)) + cleanRight);
  }

  feedAndCut(autoCut: boolean, lines = 4): this {
    this.line("\n".repeat(lines));
    if (autoCut) {
      // Standard GS V 66 0 + Bematech ESC w cut command
      this.raw(GS, 0x56, 0x42, 0x00, ESC, 0x77);
    }
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}
