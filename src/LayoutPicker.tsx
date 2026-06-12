import { motion } from 'framer-motion';
import type { LayoutDef } from './types';
import { LAYOUTS } from './layouts';

interface Props {
  selected: LayoutDef | null;
  onSelect: (layout: LayoutDef) => void;
}

function Thumb({ layout, active }: { layout: LayoutDef; active: boolean }) {
  return (
    <div
      className={`relative w-full aspect-video rounded overflow-hidden border-2 transition-colors duration-200 ${
        active ? 'border-amber-400 shadow-md shadow-amber-400/30' : 'border-gray-700 hover:border-gray-500'
      }`}
      style={{ background: '#0a0a0a' }}
    >
      {layout.panels.map((p, i) => (
        <motion.div
          key={i}
          layout
          animate={{
            background: active ? `rgba(251,191,36,${0.2 + i * 0.04})` : 'rgba(75,85,99,0.5)',
            left: `calc(${p.x * 100}% + 1.5px)`,
            top: `calc(${p.y * 100}% + 1.5px)`,
            width: `calc(${p.w * 100}% - 3px)`,
            height: `calc(${p.h * 100}% - 3px)`,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="absolute"
        />
      ))}
    </div>
  );
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 160, damping: 18 } },
};

export default function LayoutPicker({ selected, onSelect }: Props) {
  return (
    <>
      {LAYOUTS.map((layout) => {
        const active = selected?.id === layout.id;
        return (
          <motion.button
            key={layout.id}
            variants={itemVariants}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(layout)}
            className="group flex flex-col gap-2 text-left"
          >
            <Thumb layout={layout} active={active} />
            <div>
              <p className={`text-xs font-semibold ${active ? 'text-amber-400' : 'text-gray-300 group-hover:text-white'} transition-colors`}>
                {layout.label}
              </p>
              <p className="text-xs text-gray-600 truncate">{layout.slots} slots</p>
            </div>
          </motion.button>
        );
      })}
    </>
  );
}
