import { useState } from 'react';
import { X, LayoutGrid, Film, Move, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  {
    icon: <LayoutGrid className="w-7 h-7 text-amber-400" />,
    title: 'Pick a layout',
    body: 'Choose from 9 presets — or start with Full Frame and use the split buttons (⊞) on any panel to divide it. Drag panel edges to resize.',
  },
  {
    icon: <Film className="w-7 h-7 text-amber-400" />,
    title: 'Add your clips',
    body: 'Tap "Add Clips" and pick video files from your device. On desktop, drag clips from the sidebar onto panels. On mobile, tap a clip to select it, then tap a panel to place it.',
  },
  {
    icon: <Move className="w-7 h-7 text-amber-400" />,
    title: 'Arrange & time',
    body: 'Hover a filled panel to crop/pan the video or remove it. Use Clip Delays to stagger when each panel starts — perfect for the classic 24-style reveal.',
  },
  {
    icon: <Download className="w-7 h-7 text-amber-400" />,
    title: 'Export your video',
    body: 'Hit Export MP4 in the Preview step. H.264 encoding runs entirely in the browser — nothing is uploaded. Portrait, square, and landscape all supported.',
  },
];

interface Props {
  onClose: () => void;
}

export default function StudioGuide({ onClose }: Props) {
  const [slide, setSlide] = useState(0);
  const isLast = slide === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        className="relative z-10 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-800 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress bar */}
        <div className="h-0.5 bg-gray-800">
          <motion.div
            className="h-full bg-amber-400"
            animate={{ width: `${((slide + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="px-6 py-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-5">{STEPS[slide].icon}</div>
              <h2 className="text-lg font-bold text-white mb-2">{STEPS[slide].title}</h2>
              <p className="text-sm text-gray-400 leading-relaxed">{STEPS[slide].body}</p>
            </motion.div>
          </AnimatePresence>

          {/* Dots + nav */}
          <div className="flex items-center gap-3 mt-8">
            <div className="flex gap-1.5 flex-1">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === slide ? 20 : 6,
                    background: i === slide ? '#fbbf24' : 'rgba(255,255,255,0.15)',
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {slide > 0 && (
                <button
                  onClick={() => setSlide(s => s - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={isLast ? onClose : () => setSlide(s => s + 1)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black transition-colors"
              >
                {isLast ? "Let's go" : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
