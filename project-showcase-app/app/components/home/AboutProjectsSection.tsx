'use client';

import { colors } from '../constants/colors';
import { useScrollAnimation } from '@/app/hooks/useScrollAnimation';

interface ProjectInfo {
  id: string;
  label: string;
  title: string;
  description: string;
  tagColor: string;
  tagTextColor: string;
  titleColor: string;
}

const projectsInfo: ProjectInfo[] = [
  {
    id: 'shot-prediction',
    label: 'Model 1',
    title: 'Shot Prediction Model',
    description:
      'A machine learning model that predicts the likelihood of a shot resulting in a goal based on various in-game factors. Utilizes historical NHL play-by-play data, engineered features such as shot angle and distance, and employs a LightGBM model to achieve high accuracy.',
    tagColor: 'bg-green-500/20',
    tagTextColor: 'text-green-300',
    titleColor: colors.blue[400],
  },
  {
    id: 'topic-analysis',
    label: 'Model 2',
    title: 'Topic Analysis Model',
    description:
      'A torch neural network model designed to analyze and categorize textual data from potential reddit post titles, tweets, or news headlines related to hockey. The model identifies the news category based on learned patterns from LDA clustering on preprocessed data.',
    tagColor: 'bg-blue-500/20',
    tagTextColor: 'text-blue-300',
    titleColor: colors.blue[400],
  },
];

export default function AboutProjectsSection() {
  const ref = useScrollAnimation();

  return (
    <div ref={ref} className="flex flex-col items-center px-6 scroll-animate">
      <section
        className="backdrop-blur-md rounded-2xl p-12 text-white max-w-5xl w-full border card-hover"
        style={{
          backgroundColor: colors.white_5,
          borderColor: colors.green500_30,
        }}
      >
        <h3 className="text-3xl font-bold mb-2" style={{ color: colors.white }}>
          About These Projects
        </h3>
        <p className="text-gray-300 mb-10" style={{ color: colors.gray[100] }}>
          Detailed insights into our machine learning models
        </p>
        <div className="grid md:grid-cols-2 gap-12">
          {projectsInfo.map((project) => (
            <div key={project.id}>
              <h4 className="text-2xl font-bold mb-4" style={{ color: project.titleColor }}>
                {project.title}
              </h4>
              <p className="text-gray-300 leading-relaxed" style={{ color: colors.gray[100] }}>
                {project.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
