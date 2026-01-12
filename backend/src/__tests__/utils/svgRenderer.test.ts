import { renderWindow, renderDoor, renderShutter } from '../../utils/svgRenderer';
import { WindowSpec, DoorSpec, ShutterSpec } from '../../types/document';

describe('SVG Renderer', () => {
  describe('renderWindow', () => {
    it('should render a basic window SVG', () => {
      const spec: WindowSpec = {
        id: '1',
        type: 'single',
        width: 1000,
        height: 1200,
        frameMaterial: 'aluminum',
        glassType: 'single',
        quantity: 1,
        unitPrice: 500,
      };

      const svg = renderWindow(spec);
      
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox');
      expect(svg).toContain('</svg>');
    });

    it('should render different window types', () => {
      const types: WindowSpec['type'][] = ['double', 'triple', 'sliding', 'casement', 'tilt-turn'];
      
      types.forEach(type => {
        const spec: WindowSpec = {
          id: '1',
          type,
          width: 1000,
          height: 1200,
          frameMaterial: 'aluminum',
          glassType: 'double',
          quantity: 1,
          unitPrice: 500,
        };

        const svg = renderWindow(spec);
        expect(svg).toContain('<svg');
      });
    });
  });

  describe('renderDoor', () => {
    it('should render a basic door SVG', () => {
      const spec: DoorSpec = {
        id: '1',
        type: 'entrance',
        width: 900,
        height: 2100,
        frameMaterial: 'aluminum',
        doorMaterial: 'composite',
        openingDirection: 'left',
        hasGlass: false,
        quantity: 1,
        unitPrice: 800,
      };

      const svg = renderDoor(spec);
      
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox');
      expect(svg).toContain('</svg>');
    });

    it('should render door with glass', () => {
      const spec: DoorSpec = {
        id: '1',
        type: 'entrance',
        width: 900,
        height: 2100,
        frameMaterial: 'aluminum',
        doorMaterial: 'composite',
        openingDirection: 'left',
        hasGlass: true,
        glassType: 'double',
        quantity: 1,
        unitPrice: 800,
      };

      const svg = renderDoor(spec);
      expect(svg).toContain('<svg');
    });
  });

  describe('renderShutter', () => {
    it('should render a basic shutter SVG', () => {
      const spec: ShutterSpec = {
        id: '1',
        type: 'rolling',
        width: 1000,
        height: 1200,
        material: 'aluminum',
        operation: 'manual',
        quantity: 1,
        unitPrice: 300,
      };

      const svg = renderShutter(spec);
      
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox');
      expect(svg).toContain('</svg>');
    });

    it('should render motorized shutter with indicator', () => {
      const spec: ShutterSpec = {
        id: '1',
        type: 'rolling',
        width: 1000,
        height: 1200,
        material: 'aluminum',
        operation: 'motorized',
        quantity: 1,
        unitPrice: 400,
      };

      const svg = renderShutter(spec);
      expect(svg).toContain('M');
    });
  });
});
