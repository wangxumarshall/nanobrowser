import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useStore } from '../lib/store';
import { ArrowRight } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { t } = useTranslation();
  const setOnboarding = useStore((state) => state.setOnboarding);

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [expectancy, setExpectancy] = useState(78);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && dob) {
      setOnboarding(name, dob, expectancy);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-deep-space text-starlight">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-wider">{t('onboarding.title')}</h1>
          <p className="text-void opacity-70">{t('onboarding.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 backdrop-blur-sm bg-white/5 p-8 rounded-2xl border border-white/10 shadow-2xl">
          <div>
            <label className="block text-sm font-medium mb-2">{t('onboarding.name_label')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-deep-space/50 border border-white/20 rounded-lg p-3 focus:ring-2 focus:ring-glacier outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('onboarding.dob_label')}</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full bg-deep-space/50 border border-white/20 rounded-lg p-3 focus:ring-2 focus:ring-glacier outline-none transition-all color-scheme-dark"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('onboarding.expectancy_label')}</label>
            <input
              type="number"
              value={expectancy}
              onChange={(e) => setExpectancy(parseInt(e.target.value))}
              className="w-full bg-deep-space/50 border border-white/20 rounded-lg p-3 focus:ring-2 focus:ring-glacier outline-none transition-all"
              min="1"
              max="120"
            />
          </div>

          <button
            type="submit"
            className="w-full group bg-glacier text-deep-space font-bold py-3 rounded-lg hover:bg-white transition-all flex items-center justify-center gap-2"
          >
            {t('onboarding.submit')}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
