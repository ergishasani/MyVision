import { useEffect, useState } from 'react';
import api from '../lib/api';
import { WindowSpec, DoorSpec, ShutterSpec } from '../types/document';

interface SVGPreviewProps {
  windows?: WindowSpec[];
  doors?: DoorSpec[];
  shutters?: ShutterSpec[];
  scale?: number;
}

export default function SVGPreview({ windows = [], doors = [], shutters = [], scale = 0.1 }: SVGPreviewProps) {
  const [svgs, setSvgs] = useState<Array<{ id: string; svg: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSVGs = async () => {
      setLoading(true);
      const svgPromises: Promise<{ id: string; svg: string }>[] = [];

      // Fetch window SVGs
      for (const window of windows) {
        if (window && window.id && window.width && window.height) {
          svgPromises.push(
            api
              .post(`/svg/window?scale=${scale}`, window, {
                responseType: 'text',
                headers: { 'Content-Type': 'application/json' },
              })
              .then((response) => ({ id: window.id, svg: response.data }))
              .catch((error) => {
                console.error('Failed to render window:', error);
                return { id: window.id, svg: '' };
              })
          );
        }
      }

      // Fetch door SVGs
      for (const door of doors) {
        if (door && door.id && door.width && door.height) {
          svgPromises.push(
            api
              .post(`/svg/door?scale=${scale}`, door, {
                responseType: 'text',
                headers: { 'Content-Type': 'application/json' },
              })
              .then((response) => ({ id: door.id, svg: response.data }))
              .catch((error) => {
                console.error('Failed to render door:', error);
                return { id: door.id, svg: '' };
              })
          );
        }
      }

      // Fetch shutter SVGs
      for (const shutter of shutters) {
        if (shutter && shutter.id && shutter.width && shutter.height) {
          svgPromises.push(
            api
              .post(`/svg/shutter?scale=${scale}`, shutter, {
                responseType: 'text',
                headers: { 'Content-Type': 'application/json' },
              })
              .then((response) => ({ id: shutter.id, svg: response.data }))
              .catch((error) => {
                console.error('Failed to render shutter:', error);
                return { id: shutter.id, svg: '' };
              })
          );
        }
      }

      try {
        const results = await Promise.all(svgPromises);
        setSvgs(results);
      } catch (error) {
        console.error('Failed to load SVGs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (windows.length > 0 || doors.length > 0 || shutters.length > 0) {
      fetchSVGs();
    } else {
      setSvgs([]);
    }
  }, [windows, doors, shutters, scale]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-lg bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Generating preview...</p>
        </div>
      </div>
    );
  }

  if (svgs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-lg bg-gray-50">
        <p className="text-gray-500">No items to preview. Add windows, doors, or shutters to see preview.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Live Preview</h3>
      <div className="grid grid-cols-2 gap-4">
        {svgs.map((item) => (
          <div key={item.id} className="border rounded-lg p-4 bg-white">
            <div
              className="w-full"
              style={{ maxHeight: '200px', overflow: 'auto' }}
              dangerouslySetInnerHTML={{ __html: item.svg }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
