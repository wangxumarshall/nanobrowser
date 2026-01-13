import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../lib/store';
import { Plus, Check, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const BucketList: React.FC = () => {
  const { t } = useTranslation();
  const { bucketList, addBucketItem, toggleBucketItem } = useStore();
  const [newItem, setNewItem] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      addBucketItem(newItem.trim());
      setNewItem('');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 mt-8">
      <h3 className="text-xl font-light text-starlight mb-6 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-glacier" />
        {t('bucket.title')}
      </h3>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={t('bucket.add_placeholder')}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-glacier/50 transition-colors"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-glacier/10 text-glacier hover:bg-glacier/20 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('bucket.add')}</span>
        </button>
      </form>

      <div className="space-y-3">
        <AnimatePresence>
          {bucketList.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-void py-8 italic"
            >
              {t('bucket.empty')}
            </motion.p>
          )}

          {bucketList.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              layout
              className={`group flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none
                ${item.isCompleted
                  ? 'bg-glacier/5 border-glacier/30 shadow-[0_0_15px_rgba(125,249,255,0.05)]'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
              onClick={() => toggleBucketItem(item.id)}
            >
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors
                ${item.isCompleted ? 'bg-glacier border-glacier text-deep-space' : 'border-void group-hover:border-white/50'}`}>
                {item.isCompleted && <Check className="w-4 h-4" />}
              </div>

              <span className={`flex-1 transition-all ${item.isCompleted ? 'text-glacier line-through decoration-glacier/50' : 'text-starlight'}`}>
                {item.content}
              </span>

              {item.isCompleted && (
                <span className="text-xs text-glacier font-mono">+3 DAYS</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
