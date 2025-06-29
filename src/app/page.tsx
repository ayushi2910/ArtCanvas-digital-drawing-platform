"use client";

import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';


type Tool = 'brush' | 'eraser' | 'rectangle' | 'circle' | 'line';
type Layer = {
  id: string;
  elements: DrawingElement[];
  visible: boolean;
};
type DrawingElement = {
  type: 'path' | 'rectangle' | 'circle' | 'line';
  points: { x: number; y: number }[];
  color: string;
  size: number;
  id: string;
};

const COLORS = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', 
  '#ffff00', '#00ffff', '#ff00ff', '#c0c0c0', '#808080',
  '#800000', '#808000', '#008000', '#800080', '#008080', '#000080'
];

export default function ArtCanvas() {
  const [activeTool, setActiveTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [color, setColor] = useState<string>('#000000');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [layers, setLayers] = useState<Layer[]>([{ id: 'layer-1', elements: [], visible: true }]);
  const [activeLayer, setActiveLayer] = useState<string>('layer-1');
  const [history, setHistory] = useState<Layer[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [showLayersPanel, setShowLayersPanel] = useState<boolean>(true);
  const [showColorPanel, setShowColorPanel] = useState<boolean>(true);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [fileName, setFileName] = useState('my-artwork');
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get active layer
  const getActiveLayer = () => layers.find(layer => layer.id === activeLayer) || layers[0];

  // Add element to active layer
  const addElement = (element: DrawingElement) => {
    const updatedLayers = layers.map(layer => {
      if (layer.id === activeLayer) {
        return {
          ...layer,
          elements: [...layer.elements, element]
        };
      }
      return layer;
    });
    
    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(updatedLayers);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    setLayers(updatedLayers);
  };

  // Start drawing
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    
    const point = getPointFromEvent(e);
    if (!point) return;

    const newElement: DrawingElement = {
      id: Date.now().toString(),
      type: activeTool === 'brush' ? 'path' : 
            activeTool === 'eraser' ? 'path' :
            activeTool === 'rectangle' ? 'rectangle' :
            activeTool === 'circle' ? 'circle' : 'line',
      points: [point],
      color: activeTool === 'eraser' ? '#ffffff' : color,
      size: brushSize
    };
    
    addElement(newElement);
  };

  // Continue drawing
  const continueDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const point = getPointFromEvent(e);
    if (!point) return;

    const updatedLayers = layers.map(layer => {
      if (layer.id === activeLayer) {
        const lastElement = layer.elements[layer.elements.length - 1];
        if (lastElement) {
          const updatedElement = {
            ...lastElement,
            points: [...lastElement.points, point]
          };
          return {
            ...layer,
            elements: [...layer.elements.slice(0, -1), updatedElement]
          };
        }
      }
      return layer;
    });

    setLayers(updatedLayers);
  };

  // End drawing
  const endDrawing = () => {
    setIsDrawing(false);
    
    // Update history after drawing is complete
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...layers]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Get point from mouse or touch event
  const getPointFromEvent = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return null;
    
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Undo action
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setLayers(history[historyIndex - 1]);
    }
  };

  // Redo action
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setLayers(history[historyIndex + 1]);
    }
  };

  // Clear canvas
  const clearCanvas = () => {
    const updatedLayers = layers.map(layer => {
      if (layer.id === activeLayer) {
        return {
          ...layer,
          elements: []
        };
      }
      return layer;
    });
    
    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(updatedLayers);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    setLayers(updatedLayers);
  };

  // Add new layer
  const addLayer = () => {
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      elements: [],
      visible: true
    };
    setLayers([...layers, newLayer]);
    setActiveLayer(newLayer.id);
  };

  // Toggle layer visibility
  const toggleLayerVisibility = (layerId: string) => {
    setLayers(layers.map(layer => {
      if (layer.id === layerId) {
        return {
          ...layer,
          visible: !layer.visible
        };
      }
      return layer;
    }));
  };

  // Delete layer
  const deleteLayer = (layerId: string) => {
    if (layers.length <= 1) return; // Don't delete the last layer
    
    const updatedLayers = layers.filter(layer => layer.id !== layerId);
    setLayers(updatedLayers);
    
    if (activeLayer === layerId) {
      setActiveLayer(updatedLayers[0].id);
    }
  };

  // Move layer up
  const moveLayerUp = (layerId: string) => {
    const index = layers.findIndex(layer => layer.id === layerId);
    if (index < layers.length - 1) {
      const newLayers = [...layers];
      [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
      setLayers(newLayers);
    }
  };

  // Move layer down
  const moveLayerDown = (layerId: string) => {
    const index = layers.findIndex(layer => layer.id === layerId);
    if (index > 0) {
      const newLayers = [...layers];
      [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
      setLayers(newLayers);
    }
  };

  // Save canvas as image
  const saveAsImage = () => {
    if (!canvasRef.current) return;
    
    // Create a temporary canvas to render all visible layers
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasSize.width;
    tempCanvas.height = canvasSize.height;
    const ctx = tempCanvas.getContext('2d');
    
    if (!ctx) return;
    
    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Render all visible layers
    layers.forEach(layer => {
      if (layer.visible) {
        layer.elements.forEach(element => {
          ctx.strokeStyle = element.color;
          ctx.lineWidth = element.size;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          if (element.type === 'path') {
            ctx.beginPath();
            element.points.forEach((point, i) => {
              if (i === 0) {
                ctx.moveTo(point.x, point.y);
              } else {
                ctx.lineTo(point.x, point.y);
              }
            });
            ctx.stroke();
          } else if (element.type === 'rectangle') {
            if (element.points.length >= 2) {
              const start = element.points[0];
              const end = element.points[element.points.length - 1];
              const width = end.x - start.x;
              const height = end.y - start.y;
              ctx.strokeRect(start.x, start.y, width, height);
            }
          } else if (element.type === 'circle') {
            if (element.points.length >= 2) {
              const start = element.points[0];
              const end = element.points[element.points.length - 1];
              const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
              ctx.beginPath();
              ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
              ctx.stroke();
            }
          } else if (element.type === 'line') {
            if (element.points.length >= 2) {
              const start = element.points[0];
              const end = element.points[element.points.length - 1];
              ctx.beginPath();
              ctx.moveTo(start.x, start.y);
              ctx.lineTo(end.x, end.y);
              ctx.stroke();
            }
          }
        });
      }
    });
    
    // Create download link
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  };

  // Render SVG elements for the canvas
  const renderCanvasElements = () => {
    return layers.map(layer => (
      layer.visible && (
        <svg
          key={layer.id}
          className="absolute top-0 left-0"
          width={canvasSize.width}
          height={canvasSize.height}
          style={{ pointerEvents: 'none' }}
        >
          {layer.elements.map(element => {
            if (element.type === 'path') {
              return (
                <path
                  key={element.id}
                  d={`M ${element.points.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                  stroke={element.color}
                  strokeWidth={element.size}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            } else if (element.type === 'rectangle' && element.points.length >= 2) {
              const start = element.points[0];
              const end = element.points[element.points.length - 1];
              const width = end.x - start.x;
              const height = end.y - start.y;
              return (
                <rect
                  key={element.id}
                  x={start.x}
                  y={start.y}
                  width={width}
                  height={height}
                  stroke={element.color}
                  strokeWidth={element.size}
                  fill="none"
                />
              );
            } else if (element.type === 'circle' && element.points.length >= 2) {
              const start = element.points[0];
              const end = element.points[element.points.length - 1];
              const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
              return (
                <circle
                  key={element.id}
                  cx={start.x}
                  cy={start.y}
                  r={radius}
                  stroke={element.color}
                  strokeWidth={element.size}
                  fill="none"
                />
              );
            } else if (element.type === 'line' && element.points.length >= 2) {
              const start = element.points[0];
              const end = element.points[element.points.length - 1];
              return (
                <line
                  key={element.id}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={element.color}
                  strokeWidth={element.size}
                />
              );
            }
            return null;
          })}
        </svg>
      )
    ));
  };

  // Change canvas size
  const changeCanvasSize = (size: 'small' | 'medium' | 'large' | 'custom') => {
    switch (size) {
      case 'small':
        setCanvasSize({ width: 400, height: 300 });
        break;
      case 'medium':
        setCanvasSize({ width: 800, height: 600 });
        break;
      case 'large':
        setCanvasSize({ width: 1200, height: 900 });
        break;
      case 'custom':
        const width = parseInt(prompt('Enter canvas width (px):', '800') || '800');
        const height = parseInt(prompt('Enter canvas height (px):', '600') || '600');
        setCanvasSize({ width, height });
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Head>
        <title>Digital Art Canvas</title>
        
      </Head>

      {/* Navbar of  ArtCanvas Website */}
      <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="backdrop-blur-md bg-gradient-to-r from-indigo-500/70 to-indigo-600/70 text-white p-4 shadow-xl "
    >
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center font-[Arizonia] tracking-wide">
        <Image
          src="/logoArtCanvas.svg"
          alt="ArtCanvas Logo"
          width={50}
          height={60}
          className="mr-2"
          style={{ filter: 'invert(1)' }}
        />
          ArtCanvas
        </h1>

        <div className="flex space-x-4 flex-wrap justify-center sm:justify-end mt-4 sm:mt-0">
          <button
            onClick={() => setShowLanding(true)}
            className="flex items-center px-4 py-2 rounded-md bg-white/20 text-white backdrop-blur hover:bg-white/30 hover:scale-105 hover:shadow-lg transition duration-300 transform"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="font-[Arizonia]">Home</span>
          </button>

          <button
            onClick={() => {
              setShowLanding(false);
              setShowLayersPanel(true);
              setShowColorPanel(true);
            }}
            className="flex items-center px-4 py-2 rounded-md bg-white/20 text-white backdrop-blur hover:bg-white/30 hover:scale-105 hover:shadow-lg transition duration-300 transform"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
            <span className="font-[Arizonia]">Canvas</span>
          </button>
        </div>
      </div>
    </motion.nav>

      {/* Main Content of  ArtCanvas Website */}
      <main className="flex-grow container mx-auto p-4">
        <AnimatePresence>
          {showLanding ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto my-8"
            >
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 mb-6 md:mb-0 md:pr-8">
                  <h2 className="font-[Arizonia] text-3xl font-bold text-gray-800 mb-4">Create Beautiful Digital Art</h2>
                  <p className="text-gray-600 mb-6">
                  ArtCanvas – a powerful yet intuitive drawing tool designed for everyone. Sketch freely with brushes, draw shapes, manage layers, and bring your concepts to life on a clean, responsive canvas. Save your art effortlessly and keep creating.

                  </p>
                  <button
                    onClick={() => setShowLanding(false)}
                    className=" bg-gradient-to-r from-indigo-500/70 to-indigo-600/70 p-4 font-semibold  rounded-lg flex items-center px-2 py-4 bg-white/20 text-white backdrop-blur hover:bg-white/30 hover:scale-105 hover:shadow-lg transition duration-300 transform"
                  >
                    Start Drawing
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </button>
                </div>
                <div className="md:w-1/2">
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ paddingBottom: '75%' }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="grid grid-cols-2 grid-rows-2 gap-2 w-3/4 h-3/4">
                        <div className="bg-indigo-100 rounded-lg flex items-center justify-center">
                          <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                          </svg>
                        </div>
                        <div className="bg-pink-200 rounded-lg flex items-center justify-center">
                          <svg className="w-10 h-10 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </div>
                        <div className="bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          </svg>
                        </div>
                        <div className="bg-yellow-100 rounded-lg flex items-center justify-center">
                          <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12">
                <h3 className="text-xl font-semibold font-[Arizonia] text-gray-800 mb-4">Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="bg-indigo-100 p-2 rounded-full mr-3">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                      <h4 className="font-[Arizonia] text-gray-800">Drawing Tools</h4>
                    </div>
                    <p className="text-gray-600 text-sm">Brush, eraser, shapes, and more with customizable sizes and colors.</p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="bg-pink-100 p-2 rounded-full mr-3">
                        <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <h4 className="font-[Arizonia] text-gray-800">Layers</h4>
                    </div>
                    <p className="text-gray-600 text-sm">Work with multiple layers to organize your artwork efficiently.</p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <div className="bg-green-100 p-2 rounded-full mr-3">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                      </div>
                      <h4 className="font-[Arizonia] text-gray-800">Export</h4>
                    </div>
                    <p className="text-gray-600 text-sm">Save your artwork as high-quality PNG images with one click.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col lg:flex-row gap-4"
            >
              {/* Tools Panel of  ArtCanvas Website*/}
              <div className="bg-white rounded-lg shadow-md p-4 flex lg:flex-col gap-2 lg:gap-4 flex-wrap lg:flex-nowrap">
                <button
                  onClick={() => setActiveTool('brush')}
                  className={`p-2 rounded-lg ${activeTool === 'brush' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200'}`}
                  title="Brush"
                >
                  <svg className="w-6 h-6" fill="gray" stroke="gray" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTool('eraser')}
                  className={`p-2 rounded-lg ${activeTool === 'eraser' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200'}`}
                  title="Eraser"
                >
                  <svg className="w-6 h-6" fill="none" stroke="gray" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTool('rectangle')}
                  className={`p-2 rounded-lg ${activeTool === 'rectangle' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200'}`}
                  title="Rectangle"
                >
                  <svg className="w-6 h-6" fill="none" stroke="gray" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTool('circle')}
                  className={`p-2 rounded-lg ${activeTool === 'circle' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200'}`}
                  title="Circle"
                >
                  <svg className="w-6 h-6" fill="none" stroke="gray" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTool('line')}
                  className={`p-2 rounded-lg ${activeTool === 'line' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200'}`}
                  title="Line"
                >
                  <svg className="w-6 h-6" fill="none" stroke="gray" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20L20 4" />
                  </svg>
                </button>
                <div className="border-t border-gray-200 my-2 w-full lg:block hidden"></div>
                <button
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className={`p-2 rounded-lg ${historyIndex <= 0 ? 'text-gray-400' : 'hover:bg-gray-200'}`}
                  title="Undo"
                >
                  <svg className="w-6 h-6" fill="none" stroke="gray" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <button
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className={`p-2 rounded-lg ${historyIndex >= history.length - 1 ? 'text-gray-400' : 'hover:bg-gray-200'}`}
                  title="Redo"
                >
                  <svg className="w-6 h-6" fill="none" stroke="gray" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
                <button
                  onClick={clearCanvas}
                  className="p-2 rounded-lg hover:bg-gray-200"
                  title="Clear Canvas"
                >
                  <svg className="w-6 h-6" fill="none" stroke="gray" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <div className="border-t border-gray-200 my-2 w-full lg:block hidden"></div>
                <div className="flex flex-col items-center">
                  <label htmlFor="brushSize" className="text-xs text-gray-500 mb-1">Size</label>
                  <input
                    id="brushSize"
                    type="range"
                    min="1"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-700 mt-1">{brushSize}px</div>
                </div>
                <div className="border-t border-gray-200 my-2 w-full lg:block hidden"></div>
                <button
                  onClick={() => setShowColorPanel(!showColorPanel)}
                  className={`p-2 rounded-lg ${showColorPanel ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200'}`}
                  title="Color Picker"
                >
                  <svg className="w-6 h-6" fill="none" stroke="gray" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowLayersPanel(!showLayersPanel)}
                  className={`p-2 rounded-lg ${showLayersPanel ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200'}`}
                  title="Layers"
                >
                  <svg className="w-6 h-6" fill="none" stroke="gray" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </button>
                <div className="border-t border-gray-200 my-2 w-full lg:block hidden"></div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => changeCanvasSize('small')}
                    className={`text-xs p-2 rounded ${canvasSize.width === 400 ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200'}`}
                  >
                    Small
                  </button>
                  <button
                    onClick={() => changeCanvasSize('medium')}
                    className={`text-xs p-2 rounded ${canvasSize.width === 800 ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200'}`}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => changeCanvasSize('large')}
                    className={`text-xs p-2 rounded ${canvasSize.width === 1200 ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200'}`}
                  >
                    Large
                  </button>
                  <button
                    onClick={() => changeCanvasSize('custom')}
                    className="text-xs p-2 rounded hover:bg-gray-200"
                  >
                    Custom
                  </button>
                </div>
                <div className="border-t border-gray-200 my-2 w-full lg:block hidden"></div>
                <button
                  onClick={saveAsImage}
                  className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center justify-center"
                  title="Save as Image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                </button>
              </div>

              {/* Main Canvas Area of  ArtCanvas Website */}
              <div className="flex-grow relative">
                <div 
                  ref={canvasRef}
                  className="bg-white border border-gray-300 shadow-sm relative overflow-hidden"
                  style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }}
                  onMouseDown={startDrawing}
                  onMouseMove={continueDrawing}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={continueDrawing}
                  onTouchEnd={endDrawing}
                >
                  {renderCanvasElements()}
                </div>
              </div>

              {/* Color Panel of  ArtCanvas Website*/}
              {showColorPanel && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-lg shadow-md p-4 w-full lg:w-48"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-gray-800">Colors</h3>
                    <button 
                      onClick={() => setShowColorPanel(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-full border ${color === c ? 'border-2 border-indigo-500' : 'border-gray-300'}`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                  <div className="mt-4">
                    <label htmlFor="customColor" className="block text-xs text-gray-500 mb-1">Custom Color</label>
                    <input
                      id="customColor"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full h-10 cursor-pointer"
                    />
                  </div>
                  <div className="mt-4 flex items-center">
                    <div 
                      className="w-6 h-6 rounded-full border border-gray-300 mr-2"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-mono">{color}</span>
                  </div>
                </motion.div>
              )}

              {/* Layers Panel of  ArtCanvas Website */}
              {showLayersPanel && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-lg shadow-md p-4 w-full lg:w-64"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-gray-800">Layers</h3>
                    <div className="flex items-center">
                      <button 
                        onClick={addLayer}
                        className="text-gray-500 hover:text-indigo-600 mr-2"
                        title="Add Layer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => setShowLayersPanel(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {layers.map((layer, index) => (
                      <div 
                        key={layer.id}
                        className={`p-2 rounded border ${activeLayer === layer.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleLayerVisibility(layer.id)}
                              className="mr-2 text-gray-500 hover:text-gray-700"
                            >
                              {layer.visible ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                              )}
                            </button>
                            <span 
                              className="text-sm cursor-pointer truncate max-w-xs"
                              onClick={() => setActiveLayer(layer.id)}
                            >
                              {layer.id}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {index > 0 && (
                              <button
                                onClick={() => moveLayerDown(layer.id)}
                                className="text-gray-500 hover:text-indigo-600 text-xs p-1"
                                title="Move Down"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            )}
                            {index < layers.length - 1 && (
                              <button
                                onClick={() => moveLayerUp(layer.id)}
                                className="text-gray-500 hover:text-indigo-600 text-xs p-1"
                                title="Move Up"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                            )}
                            {layers.length > 1 && (
                              <button
                                onClick={() => deleteLayer(layer.id)}
                                className="text-gray-500 hover:text-red-600 text-xs p-1"
                                title="Delete Layer"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {layer.elements.length} elements
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer of ArtCanvas Website */}
      <footer className="backdrop-blur-md bg-gradient-to-r from-indigo-300/70 to-indigo-200 text-white p-4 text-center text-sm">
        <div className="container mx-auto">
          <p>ArtCanvas &copy; {new Date().getFullYear()} - Digital Drawing Application</p>
        </div>
      </footer>
    </div>
  );
}


