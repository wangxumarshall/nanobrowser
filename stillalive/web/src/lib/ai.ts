export const analyzeEntry = async (text: string): Promise<{
  sentiment: 'positive' | 'negative' | 'neutral';
  timeDelta: number;
  reason: string;
}> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const lowerText = text.toLowerCase();

  // Heuristic keywords (Mock Logic)
  const positiveKeywords = ['gym', 'run', 'read', 'study', 'work', 'happy', 'love', 'help', 'meditate', 'sleep early', '健身', '读书', '学习', '工作', '开心', '爱', '帮助', '冥想', '早睡'];
  const negativeKeywords = ['drink', 'smoke', 'lazy', 'angry', 'sad', 'hate', 'waste', 'game', 'doomscroll', 'late', '酒', '烟', '懒', '生气', '难过', '恨', '浪费', '游戏', '熬夜', '焦虑'];

  let score = 0;
  positiveKeywords.forEach(k => { if (lowerText.includes(k)) score++; });
  negativeKeywords.forEach(k => { if (lowerText.includes(k)) score--; });

  if (score > 0) {
    return {
      sentiment: 'positive',
      timeDelta: 2 * 60 * 60, // +2 Hours
      reason: 'Productive behavior detected. Life extended.'
    };
  } else if (score < 0) {
    return {
      sentiment: 'negative',
      timeDelta: -2 * 60 * 60, // -2 Hours
      reason: 'Destructive behavior detected. Life consumed.'
    };
  } else {
    return {
      sentiment: 'neutral',
      timeDelta: 0,
      reason: 'No significant impact detected.'
    };
  }
};
