import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useStore } from '../lib/store';

const Digit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center mx-2 md:mx-4">
    <div className="relative">
      <AnimatePresence mode='popLayout'>
        <motion.span
          key={value}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="text-4xl md:text-7xl font-mono font-light tracking-tighter text-starlight text-shadow-glow block"
        >
          {String(value).padStart(2, '0')}
        </motion.span>
      </AnimatePresence>
    </div>
    <span className="text-xs md:text-sm text-void mt-2 uppercase tracking-widest">{label}</span>
  </div>
);

export const LifeClock: React.FC = () => {
  const { t } = useTranslation();
  const { remainingSeconds, syncTime } = useStore();

  useEffect(() => {
    const interval = setInterval(() => {
      syncTime();
    }, 1000);
    return () => clearInterval(interval);
  }, [syncTime]);

  const years = Math.floor(remainingSeconds / 31536000);
  const days = Math.floor((remainingSeconds % 31536000) / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = Math.floor(remainingSeconds % 60);

  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-20 relative overflow-hidden">
      {/* Background Particles (Simplified CSS/Divs) */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              width: Math.random() * 4 + 'px',
              height: Math.random() * 4 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `pulse ${Math.random() * 5 + 2}s infinite`
            }}
          />
        ))}
      </div>

      <motion.h2
        className="text-void text-sm tracking-[0.3em] mb-8 uppercase"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        {t('clock.remaining')}
      </motion.h2>

      <div className="flex flex-wrap justify-center items-center z-10">
        <Digit value={years} label={t('clock.years')} />
        <span className="text-2xl md:text-5xl text-void/50 pb-8">:</span>
        <Digit value={days} label={t('clock.days')} />
        <div className="w-full md:w-auto h-4 md:h-0" /> {/* Break on mobile */}
        <span className="hidden md:inline text-2xl md:text-5xl text-void/50 pb-8">:</span>
        <Digit value={hours} label="HRS" />
        <span className="text-2xl md:text-5xl text-void/50 pb-8">:</span>
        <Digit value={minutes} label="MIN" />
        <span className="text-2xl md:text-5xl text-void/50 pb-8">:</span>
        <Digit value={seconds} label="SEC" />
      </div>

      {/* Milliseconds Visualizer (Bar) */}
      <motion.div
        className="w-64 h-1 bg-void/30 mt-8 rounded-full overflow-hidden"
      >
        <motion.div
          className="h-full bg-glacier shadow-[0_0_10px_#7DF9FF]"
          animate={{ width: ["0%", "100%"] }}
          transition={{ duration: 1, ease: "linear", repeat: Infinity }}
        />
      </motion.div>
    </div>
  );
};
