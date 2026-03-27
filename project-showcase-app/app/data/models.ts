export interface Model {
  id: string;
  title: string;
  emoji: string;
  description: string;
  href: string;
  gradient: string;
  ctaColor: string;
  tagColor: string;
  tagTextColor: string;
  shadowColor: string;
}

export const models: Model[] = [
  {
    id: 'shot-prediction',
    title: 'Shot Prediction',
    emoji: '🎯',
    description: 'Predict the outcome of hockey shots using coordinates and game data',
    href: '/shot-prediction',
    gradient: 'linear-gradient(135deg, #00a651 0%, #00d966 100%)',
    ctaColor: 'text-green-600',
    tagColor: 'bg-green-500/20',
    tagTextColor: 'text-green-300',
    shadowColor: 'shadow-green-500/20',
  },
  {
    id: 'topic-analysis',
    title: 'Topic Analysis',
    emoji: '💬',
    description: 'Analyze topics in hockey Reddit posts and discussions',
    href: '/topic-analysis',
    gradient: 'linear-gradient(135deg, #0066cc 0%, #0099ff 100%)',
    ctaColor: 'text-blue-600',
    tagColor: 'bg-blue-500/20',
    tagTextColor: 'text-blue-300',
    shadowColor: 'shadow-blue-500/20',
  },
];
