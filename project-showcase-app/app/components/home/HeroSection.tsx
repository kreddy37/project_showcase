'use client';

import ProfileCard from './ProfileCard';
import PersonalInfoCard from './PersonalInfoCard';
import CTAButtons from './CTAButtons';
import { colors } from '../constants/colors';
import { useScrollAnimation } from '@/app/hooks/useScrollAnimation';

export default function HeroSection() {
  const ref = useScrollAnimation();

  return (
    <section ref={ref} className="flex flex-col items-center scroll-animate">
      <div
        className="backdrop-blur-md rounded-2xl p-12 text-white max-w-5xl w-full border flex flex-col items-center justify-center text-center card-hover"
        style={{
          backgroundColor: colors.darkCard,
          borderColor: colors.green500_30,
        }}
      >
        <h1 className="text-6xl font-bold mb-16 leading-tight max-w-3xl" style={{ color: colors.white }}>
          Hockey Analytics <span style={{ color: colors.green[400] }}>Dashboard</span>
        </h1>

        <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl w-full mb-12">
          <ProfileCard />
          <PersonalInfoCard />
        </div>

        <p className="text-gray-300 mb-12 text-center max-w-xl" style={{ color: colors.gray[100] }}>
          Building intelligent systems for hockey analytics
        </p>

      </div>
    </section>
  );
}
