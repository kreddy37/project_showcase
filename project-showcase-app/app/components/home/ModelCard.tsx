'use client';

import Link from 'next/link';
import { Model } from '@/app/data/models';
import { colors } from '../constants/colors';

interface ModelCardProps {
  model: Model;
}

export default function ModelCard({ model }: ModelCardProps) {
  return (
    <Link href={model.href}>
      <div
        className="group h-96 rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
        style={{
          background: model.gradient,
        }}
      >
        <div className="h-full flex flex-col items-center justify-center text-white p-8 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-20">
            <div
              className="absolute w-40 h-40 rounded-full blur-3xl"
              style={{
                backgroundColor: colors.white,
                ...(model.id === 'shot-prediction' && { top: '1rem', right: '1rem' }),
                ...(model.id === 'topic-analysis' && { bottom: '1rem', left: '1rem' }),
              }}
            ></div>
          </div>

          {/* Content */}
          <div className="relative z-10 text-center">
            <div className="text-7xl mb-6">{model.emoji}</div>
            <h3 className="text-4xl font-bold mb-4">{model.title}</h3>
            <p className="text-lg text-white/90 mb-8 leading-relaxed">{model.description}</p>
            <div
              className="inline-block px-8 py-3 text-white font-bold rounded-lg group-hover:bg-opacity-90 transition-all duration-300 shadow-lg"
              style={{
                backgroundColor: colors.white,
              }}
            >
              <span className={model.ctaColor}>Explore →</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
