package com.myvision.api.service;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * A very small PDF writer: positioned text, rules and filled boxes on one A4 page.
 *
 * <p>Written by hand rather than pulled from a PDF library. What the invoice needs is a dozen
 * strings placed at known coordinates, a few rules and two fonts; a library would be a large
 * dependency to carry for that, and the existing generator already wrote raw PDF — this replaces
 * it with something that can actually lay a document out.
 *
 * <p>Text is encoded as Windows-1252 rather than ASCII, which is what makes umlauts and the
 * section sign survive. A German invoice that prints "Umsatzsteuer" as "Umsatzsteuer" but
 * "Grüße" as garbage is not usable, and the previous writer was ASCII-only.
 */
final class PdfCanvas {

  /** A4 at 72 dpi, which is the unit PDF works in. */
  static final float PAGE_WIDTH = 595f;
  static final float PAGE_HEIGHT = 842f;

  private static final Charset WIN_ANSI = Charset.forName("windows-1252");

  private final StringBuilder content = new StringBuilder();

  /* --- drawing ------------------------------------------------------------ */

  /** Places text with its left edge at {@code x} and its baseline at {@code y}. */
  void text(float x, float y, String value, float size, boolean bold, float gray) {
    if (value == null || value.isEmpty()) {
      return;
    }
    content.append("BT\n")
        .append(gray).append(" ").append(gray).append(" ").append(gray).append(" rg\n")
        .append("/").append(bold ? "F2" : "F1").append(" ").append(size).append(" Tf\n")
        .append(x).append(" ").append(y).append(" Td\n")
        .append("(").append(escape(value)).append(") Tj\nET\n");
  }

  /** Places text with its right edge at {@code x}. Used for every money column. */
  void textRight(float x, float y, String value, float size, boolean bold, float gray) {
    if (value == null || value.isEmpty()) {
      return;
    }
    text(x - width(value, size, bold), y, value, size, bold, gray);
  }

  /** A horizontal rule. */
  void rule(float x1, float x2, float y, float thickness, float gray) {
    content.append(gray).append(" ").append(gray).append(" ").append(gray).append(" RG\n")
        .append(thickness).append(" w\n")
        .append(x1).append(" ").append(y).append(" m\n")
        .append(x2).append(" ").append(y).append(" l\nS\n");
  }

  /** A filled rectangle, for the tinted note box. */
  void box(float x, float y, float w, float h, float gray) {
    content.append(gray).append(" ").append(gray).append(" ").append(gray).append(" rg\n")
        .append(x).append(" ").append(y).append(" ").append(w).append(" ").append(h)
        .append(" re\nf\n");
  }

  /**
   * Wraps text to a width and draws it, returning the baseline after the last line.
   *
   * <p>Breaks on spaces and on the newlines the operator typed, because the header and footer are
   * free text that people format themselves.
   */
  float paragraph(float x, float y, float maxWidth, String value, float size, float leading,
      float gray) {
    if (value == null || value.isBlank()) {
      return y;
    }
    float cursor = y;
    for (String hardLine : value.split("\n", -1)) {
      if (hardLine.isBlank()) {
        cursor -= leading;
        continue;
      }
      StringBuilder line = new StringBuilder();
      for (String word : hardLine.trim().split("\\s+")) {
        String candidate = line.isEmpty() ? word : line + " " + word;
        if (width(candidate, size, false) > maxWidth && !line.isEmpty()) {
          text(x, cursor, line.toString(), size, false, gray);
          cursor -= leading;
          line = new StringBuilder(word);
        } else {
          line = new StringBuilder(candidate);
        }
      }
      if (!line.isEmpty()) {
        text(x, cursor, line.toString(), size, false, gray);
        cursor -= leading;
      }
    }
    return cursor;
  }

  /* --- metrics ------------------------------------------------------------ */

  /**
   * How wide a string is at a given size.
   *
   * <p>Needed for right alignment: without real metrics the money column drifts, which on an
   * invoice looks like a defect rather than a rounding difference. Characters outside the table
   * fall back to the width of a lowercase letter, which is only reachable by unusual symbols and
   * never by the digits and currency marks the aligned columns actually contain.
   */
  float width(String value, float size, boolean bold) {
    int[] widths = bold ? HELVETICA_BOLD : HELVETICA;
    int total = 0;
    for (byte b : value.getBytes(WIN_ANSI)) {
      int code = b & 0xFF;
      total += code < widths.length && widths[code] > 0 ? widths[code] : 556;
    }
    return (total / 1000f) * size;
  }

  /* --- output ------------------------------------------------------------- */

  byte[] build() {
    // The content stream is Windows-1252 bytes; everything around it is ASCII.
    byte[] stream = content.toString().getBytes(WIN_ANSI);

    List<byte[]> objects = new ArrayList<>();
    objects.add(ascii("<< /Type /Catalog /Pages 2 0 R >>"));
    objects.add(ascii("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
    objects.add(ascii("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "
        + PAGE_WIDTH + " " + PAGE_HEIGHT + "]"
        + " /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>"));
    objects.add(concat(
        ascii("<< /Length " + stream.length + " >>\nstream\n"), stream, ascii("\nendstream")));
    objects.add(ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica"
        + " /Encoding /WinAnsiEncoding >>"));
    objects.add(ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold"
        + " /Encoding /WinAnsiEncoding >>"));

    ByteArrayOutputStream out = new ByteArrayOutputStream();
    write(out, ascii("%PDF-1.4\n"));
    List<Integer> offsets = new ArrayList<>();
    for (int i = 0; i < objects.size(); i++) {
      offsets.add(out.size());
      write(out, ascii((i + 1) + " 0 obj\n"));
      write(out, objects.get(i));
      write(out, ascii("\nendobj\n"));
    }

    int xref = out.size();
    write(out, ascii("xref\n0 " + (objects.size() + 1) + "\n0000000000 65535 f \n"));
    for (int offset : offsets) {
      write(out, ascii("%010d 00000 n \n".formatted(offset)));
    }
    write(out, ascii("trailer\n<< /Size " + (objects.size() + 1) + " /Root 1 0 R >>\n"));
    write(out, ascii("startxref\n" + xref + "\n%%EOF\n"));
    return out.toByteArray();
  }

  /* --- internals ---------------------------------------------------------- */

  /** Escapes the three characters that mean something inside a PDF string literal. */
  private static String escape(String value) {
    return value
        .replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)");
  }

  private static byte[] ascii(String value) {
    return value.getBytes(StandardCharsets.ISO_8859_1);
  }

  private static byte[] concat(byte[]... parts) {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    for (byte[] part : parts) {
      write(out, part);
    }
    return out.toByteArray();
  }

  private static void write(ByteArrayOutputStream out, byte[] bytes) {
    out.write(bytes, 0, bytes.length);
  }

  /** Helvetica advance widths, in 1/1000 em, indexed by WinAnsi code. */
  private static final int[] HELVETICA = new int[256];
  private static final int[] HELVETICA_BOLD = new int[256];

  static {
    int[] regular = {
        278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
        556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
        1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
        667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
        333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
        556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
    };
    int[] bold = {
        278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
        556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
        975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
        667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
        333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
        611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
    };
    System.arraycopy(regular, 0, HELVETICA, 32, regular.length);
    System.arraycopy(bold, 0, HELVETICA_BOLD, 32, bold.length);

    // The Latin-1 letters a German invoice actually reaches for. Everything else in the upper
    // range falls back at lookup time.
    int[][] extras = {
        {0xA7, 556, 556},   // section sign
        {0xC4, 667, 722},   // A umlaut
        {0xD6, 778, 778},   // O umlaut
        {0xDC, 722, 722},   // U umlaut
        {0xDF, 611, 611},   // sharp s
        {0xE4, 556, 556},   // a umlaut
        {0xF6, 556, 611},   // o umlaut
        {0xFC, 556, 611},   // u umlaut
        {0x80, 556, 556},   // euro
        {0x2D, 333, 333},   // hyphen
    };
    for (int[] extra : extras) {
      HELVETICA[extra[0]] = extra[1];
      HELVETICA_BOLD[extra[0]] = extra[2];
    }
  }
}
