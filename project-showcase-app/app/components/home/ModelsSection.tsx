'use client';

import ModelCard from './ModelCard';
import { models } from '@/app/data/models';
import { colors } from '../constants/colors';
import { useScrollAnimation } from '@/app/hooks/useScrollAnimation';

export default function ModelsSection() {
  const ref = useScrollAnimation();

  return (
    <section ref={ref} id="projects" className="flex flex-col items-center px-6 scroll-animate">
      <div
        className="backdrop-blur-md rounded-2xl p-12 text-white max-w-5xl w-full border flex flex-col items-center card-hover"
        style={{
          backgroundColor: colors.darkCard,
          borderColor: colors.green500_30,
        }}
      >
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-4" style={{ color: colors.white }}>
            ML <span style={{ color: colors.green[400] }}>Models</span>
          </h2>
          <p className="text-xl max-w-2xl" style={{ color: colors.gray[100] }}>
            Explore advanced machine learning models built for hockey analytics and insights
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl w-full">
          {models.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      </div>
    </section>
  );
}
