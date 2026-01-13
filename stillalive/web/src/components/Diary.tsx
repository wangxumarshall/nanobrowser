import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../lib/store';
import { analyzeEntry } from '../lib/ai';
import { Send, Loader2, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Diary: React.FC = () => {
  const { t } = useTranslation();
  const addDiaryEntry = useStore((state) => state.addDiaryEntry);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'positive' | 'negative' | 'neutral', time: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setFeedback(null);

    try {
      const result = await analyzeEntry(input);

      addDiaryEntry({
        id: crypto.randomUUID(),
        content: input,
        timestamp: Date.now(),
        sentiment: result.sentiment,
        timeDelta: result.timeDelta,
        reason: result.reason
      });

      setFeedback({ type: result.sentiment, time: result.timeDelta });
      setInput('');

      // Auto clear feedback after 3s
      setTimeout(() => setFeedback(null), 3000);

    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <div className={`absolute -inset-0.5 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-500
            ${feedback?.type === 'positive' ? 'bg-glacier' : feedback?.type === 'negative' ? 'bg-alarm' : 'bg-white'}`}></div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('diary.placeholder')}
            className="relative w-full h-32 bg-deep-space border border-white/10 rounded-lg p-4 text-starlight placeholder-void focus:outline-none focus:border-white/30 resize-none transition-colors"
            disabled={isAnalyzing}
          />
        </div>

        <div className="flex justify-between items-center mt-2">
           <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={`text-sm flex items-center gap-2 ${feedback.type === 'positive' ? 'text-glacier' : feedback.type === 'negative' ? 'text-alarm' : 'text-void'}`}
              >
                {feedback.type === 'positive' ? <Plus className="w-4 h-4" /> : feedback.type === 'negative' ? <Minus className="w-4 h-4" /> : null}
                {feedback.type === 'positive' ? t('feedback.positive') : feedback.type === 'negative' ? t('feedback.negative') : 'Recorded'}
                {feedback.time !== 0 && <span>({Math.abs(feedback.time / 60 / 60)}h)</span>}
              </motion.div>
            )}
           </AnimatePresence>

          <button
            type="submit"
            disabled={!input.trim() || isAnalyzing}
            className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('diary.analyzing')}
              </>
            ) : (
              <>
                {t('diary.submit')}
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
