import { WindowSpec, DoorSpec, ShutterSpec } from '../types/document';

// SVG rendering utilities for parametric generation of windows, doors, and shutters

export interface SVGRenderOptions {
  width: number; // in mm
  height: number; // in mm
  scale?: number; // Scale factor for display (default: 0.1 to convert mm to viewBox units)
  strokeWidth?: number;
  fillColor?: string;
  strokeColor?: string;
}

const DEFAULT_SCALE = 0.1; // Convert mm to SVG units (1mm = 0.1 SVG units)
const DEFAULT_STROKE_WIDTH = 2;
const DEFAULT_FILL = '#f0f0f0';
const DEFAULT_STROKE = '#333333';

/**
 * Render a window as SVG
 */
export function renderWindow(spec: WindowSpec, options?: Partial<SVGRenderOptions>): string {
  const width = spec.width * (options?.scale || DEFAULT_SCALE);
  const height = spec.height * (options?.scale || DEFAULT_SCALE);
  const strokeWidth = options?.strokeWidth || DEFAULT_STROKE_WIDTH;
  const fill = options?.fillColor || DEFAULT_FILL;
  const stroke = options?.strokeColor || DEFAULT_STROKE;

  const viewBoxWidth = width + strokeWidth * 2;
  const viewBoxHeight = height + strokeWidth * 2;
  const offset = strokeWidth;

  let svg = `<svg viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg">`;

  // Frame
  svg += `<rect x="${offset}" y="${offset}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;

  // Window type specific rendering
  switch (spec.type) {
    case 'double':
    case 'triple':
      // Multiple panes
      const paneCount = spec.type === 'double' ? 2 : 3;
      const paneSpacing = width / (paneCount + 1);
      for (let i = 1; i <= paneCount; i++) {
        const x = offset + paneSpacing * i;
        svg += `<line x1="${x}" y1="${offset}" x2="${x}" y2="${offset + height}" stroke="${stroke}" stroke-width="${strokeWidth / 2}"/>`;
      }
      break;

    case 'sliding':
      // Horizontal divider for sliding windows
      svg += `<line x1="${offset}" y1="${offset + height / 2}" x2="${offset + width}" y2="${offset + height / 2}" stroke="${stroke}" stroke-width="${strokeWidth / 2}"/>`;
      // Sliding track
      svg += `<rect x="${offset}" y="${offset + height - height * 0.1}" width="${width}" height="${height * 0.05}" fill="${stroke}" opacity="0.3"/>`;
      break;

    case 'casement':
    case 'tilt-turn':
      // Vertical divider
      svg += `<line x1="${offset + width / 2}" y1="${offset}" x2="${offset + width / 2}" y2="${offset + height}" stroke="${stroke}" stroke-width="${strokeWidth / 2}"/>`;
      // Opening indicator (small arc)
      if (spec.openingDirection === 'left' || spec.openingDirection === 'both') {
        svg += `<path d="M ${offset + width / 2} ${offset + height / 2} A ${width * 0.2} ${height * 0.2} 0 0 1 ${offset + width / 2 - width * 0.1} ${offset + height / 2 - height * 0.1}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth / 2}" stroke-dasharray="2,2"/>`;
      }
      if (spec.openingDirection === 'right' || spec.openingDirection === 'both') {
        svg += `<path d="M ${offset + width / 2} ${offset + height / 2} A ${width * 0.2} ${height * 0.2} 0 0 0 ${offset + width / 2 + width * 0.1} ${offset + height / 2 - height * 0.1}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth / 2}" stroke-dasharray="2,2"/>`;
      }
      break;

    default: // single
      // Simple single pane window
      break;
  }

  // Glass reflection effect
  svg += `<rect x="${offset + width * 0.1}" y="${offset + height * 0.1}" width="${width * 0.3}" height="${height * 0.3}" fill="white" opacity="0.3"/>`;

  svg += `</svg>`;
  return svg;
}

/**
 * Render a door as SVG
 */
export function renderDoor(spec: DoorSpec, options?: Partial<SVGRenderOptions>): string {
  const width = spec.width * (options?.scale || DEFAULT_SCALE);
  const height = spec.height * (options?.scale || DEFAULT_SCALE);
  const strokeWidth = options?.strokeWidth || DEFAULT_STROKE_WIDTH;
  const fill = options?.fillColor || DEFAULT_FILL;
  const stroke = options?.strokeColor || DEFAULT_STROKE;

  const viewBoxWidth = width + strokeWidth * 2;
  const viewBoxHeight = height + strokeWidth * 2;
  const offset = strokeWidth;

  let svg = `<svg viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg">`;

  // Door frame
  svg += `<rect x="${offset}" y="${offset}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;

  // Door panel
  const panelMargin = width * 0.05;
  svg += `<rect x="${offset + panelMargin}" y="${offset + panelMargin}" width="${width - panelMargin * 2}" height="${height - panelMargin * 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth / 2}"/>`;

  // Door type specific rendering
  switch (spec.type) {
    case 'sliding':
      // Horizontal divider for sliding doors
      svg += `<line x1="${offset}" y1="${offset + height / 2}" x2="${offset + width}" y2="${offset + height / 2}" stroke="${stroke}" stroke-width="${strokeWidth / 2}"/>`;
      // Sliding track
      svg += `<rect x="${offset}" y="${offset + height - height * 0.05}" width="${width}" height="${height * 0.03}" fill="${stroke}" opacity="0.3"/>`;
      break;

    case 'folding':
      // Multiple vertical panels
      const panelCount = 4;
      const panelWidth = (width - panelMargin * 2) / panelCount;
      for (let i = 1; i < panelCount; i++) {
        const x = offset + panelMargin + panelWidth * i;
        svg += `<line x1="${x}" y1="${offset + panelMargin}" x2="${x}" y2="${offset + height - panelMargin}" stroke="${stroke}" stroke-width="${strokeWidth / 2}"/>`;
      }
      break;

    case 'revolving':
      // Circular door indicator
      const centerX = offset + width / 2;
      const centerY = offset + height / 2;
      const radius = Math.min(width, height) * 0.3;
      svg += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth / 2}" stroke-dasharray="3,3"/>`;
      break;

    default: // entrance, interior
      // Standard door with handle
      const handleX = spec.openingDirection === 'left' 
        ? offset + width * 0.15 
        : offset + width * 0.85;
      const handleY = offset + height * 0.5;
      
      // Door handle
      svg += `<circle cx="${handleX}" cy="${handleY}" r="${width * 0.03}" fill="${stroke}"/>`;
      
      // Opening arc indicator
      if (spec.openingDirection === 'left') {
        svg += `<path d="M ${handleX} ${handleY} A ${width * 0.4} ${height * 0.4} 0 0 1 ${handleX - width * 0.2} ${handleY - height * 0.2}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth / 2}" stroke-dasharray="2,2"/>`;
      } else if (spec.openingDirection === 'right') {
        svg += `<path d="M ${handleX} ${handleY} A ${width * 0.4} ${height * 0.4} 0 0 0 ${handleX + width * 0.2} ${handleY - height * 0.2}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth / 2}" stroke-dasharray="2,2"/>`;
      }
      break;
  }

  // Glass panel if hasGlass
  if (spec.hasGlass) {
    const glassX = offset + width * 0.2;
    const glassY = offset + height * 0.2;
    const glassWidth = width * 0.6;
    const glassHeight = height * 0.4;
    svg += `<rect x="${glassX}" y="${glassY}" width="${glassWidth}" height="${glassHeight}" fill="white" opacity="0.4" stroke="${stroke}" stroke-width="${strokeWidth / 3}"/>`;
    // Glass reflection
    svg += `<rect x="${glassX + glassWidth * 0.1}" y="${glassY + glassHeight * 0.1}" width="${glassWidth * 0.3}" height="${glassHeight * 0.3}" fill="white" opacity="0.6"/>`;
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Render a shutter as SVG
 */
export function renderShutter(spec: ShutterSpec, options?: Partial<SVGRenderOptions>): string {
  const width = spec.width * (options?.scale || DEFAULT_SCALE);
  const height = spec.height * (options?.scale || DEFAULT_SCALE);
  const strokeWidth = options?.strokeWidth || DEFAULT_STROKE_WIDTH;
  const fill = options?.fillColor || DEFAULT_FILL;
  const stroke = options?.strokeColor || DEFAULT_STROKE;

  const viewBoxWidth = width + strokeWidth * 2;
  const viewBoxHeight = height + strokeWidth * 2;
  const offset = strokeWidth;

  let svg = `<svg viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg">`;

  // Shutter frame
  svg += `<rect x="${offset}" y="${offset}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;

  // Shutter type specific rendering
  switch (spec.type) {
    case 'rolling':
      // Horizontal slats for rolling shutter
      const slatCount = 8;
      const slatHeight = (height - offset * 2) / slatCount;
      for (let i = 0; i < slatCount; i++) {
        const y = offset + slatHeight * i;
        svg += `<rect x="${offset}" y="${y}" width="${width}" height="${slatHeight * 0.8}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth / 2}"/>`;
      }
      // Roll mechanism at top
      svg += `<rect x="${offset + width * 0.3}" y="${offset}" width="${width * 0.4}" height="${height * 0.1}" fill="${stroke}" opacity="0.5"/>`;
      break;

    case 'panel':
      // Vertical panels
      const panelCount = 4;
      const panelWidth = (width - offset * 2) / panelCount;
      for (let i = 1; i < panelCount; i++) {
        const x = offset + panelWidth * i;
        svg += `<line x1="${x}" y1="${offset}" x2="${x}" y2="${offset + height}" stroke="${stroke}" stroke-width="${strokeWidth / 2}"/>`;
      }
      break;

    case 'bahama':
      // Angled slats (Bahama style)
      const bahamaSlatCount = 6;
      const bahamaSlatSpacing = height / bahamaSlatCount;
      for (let i = 0; i < bahamaSlatCount; i++) {
        const y = offset + bahamaSlatSpacing * i;
        const angle = 15; // degrees
        const slatLength = width / Math.cos((angle * Math.PI) / 180);
        const xOffset = (slatLength - width) / 2;
        svg += `<line x1="${offset - xOffset}" y1="${y}" x2="${offset + width + xOffset}" y2="${y + bahamaSlatSpacing * 0.3}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="0.7"/>`;
      }
      break;

    case 'plantation':
      // Horizontal louvers
      const louverCount = 10;
      const louverSpacing = height / louverCount;
      for (let i = 1; i < louverCount; i++) {
        const y = offset + louverSpacing * i;
        svg += `<line x1="${offset}" y1="${y}" x2="${offset + width}" y2="${y}" stroke="${stroke}" stroke-width="${strokeWidth / 2}"/>`;
      }
      break;

    case 'roman':
      // Folded fabric effect (simplified)
      const foldCount = 5;
      const foldWidth = width / foldCount;
      for (let i = 0; i < foldCount; i++) {
        const x = offset + foldWidth * i;
        const foldHeight = height * (0.5 + (i % 2) * 0.2);
        svg += `<path d="M ${x} ${offset} L ${x + foldWidth / 2} ${offset + foldHeight} L ${x + foldWidth} ${offset}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth / 2}" opacity="0.8"/>`;
      }
      break;
  }

  // Operation indicator
  if (spec.operation === 'motorized') {
    svg += `<circle cx="${offset + width * 0.9}" cy="${offset + height * 0.1}" r="${width * 0.05}" fill="${stroke}" opacity="0.7"/>`;
    svg += `<text x="${offset + width * 0.9}" y="${offset + height * 0.1}" text-anchor="middle" dominant-baseline="middle" font-size="${width * 0.04}" fill="white">M</text>`;
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Combine multiple SVGs into a single SVG
 */
export function combineSVGs(svgs: Array<{ svg: string; id: string; width: number; height: number }>): string {
  if (svgs.length === 0) return '';

  // Calculate total dimensions
  const totalWidth = svgs.reduce((sum, item) => sum + item.width, 0);
  const maxHeight = Math.max(...svgs.map(item => item.height));

  let combined = `<svg viewBox="0 0 ${totalWidth} ${maxHeight}" xmlns="http://www.w3.org/2000/svg">`;

  let xOffset = 0;
  for (const item of svgs) {
    // Extract viewBox from individual SVG
    const viewBoxMatch = item.svg.match(/viewBox="([^"]+)"/);
    if (viewBoxMatch) {
      const [, viewBox] = viewBoxMatch;
      combined += `<g transform="translate(${xOffset}, 0)">`;
      // Insert SVG content without the outer <svg> tag
      const content = item.svg.replace(/<svg[^>]*>/, '').replace('</svg>', '');
      combined += content;
      combined += `</g>`;
      xOffset += item.width;
    }
  }

  combined += `</svg>`;
  return combined;
}
