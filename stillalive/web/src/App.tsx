import React from 'react';
import { useStore } from './lib/store';
import { Onboarding } from './components/Onboarding';
import { LifeClock } from './components/LifeClock';
import { Diary } from './components/Diary';
import { BucketList } from './components/BucketList';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

function App() {
  const { isOnboarded, language, setLanguage } = useStore();
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'zh' : 'en';
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
  };

  // Ensure i18n syncs with store on load
  React.useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  if (!isOnboarded) {
    return (
      <>
        <LanguageToggle current={language} onToggle={toggleLanguage} />
        <Onboarding />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-deep-space text-starlight overflow-y-auto pb-20">
      <LanguageToggle current={language} onToggle={toggleLanguage} />

      <main className="container mx-auto px-4">
        <LifeClock />

        <div className="max-w-4xl mx-auto grid md:grid-cols-1 gap-12 mt-8 animate-fade-in-up">
          <div className="space-y-4">
            <h2 className="text-center text-void text-xs tracking-[0.2em] uppercase">Daily Reflection</h2>
            <Diary />
          </div>

          <div className="border-t border-white/5 pt-12">
             <BucketList />
          </div>
        </div>
      </main>
    </div>
  );
}

const LanguageToggle = ({ current, onToggle }: { current: string, onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className="fixed top-4 right-4 z-50 p-2 text-void hover:text-glacier transition-colors"
  >
    <div className="flex items-center gap-1 text-xs font-mono">
      <Globe className="w-4 h-4" />
      <span>{current.toUpperCase()}</span>
    </div>
  </button>
);

export default App;
