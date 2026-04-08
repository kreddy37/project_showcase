'use client';

import Navigation from '@/app/components/shared/Navigation';
import Footer from '@/app/components/shared/Footer';
import HeroSection from '@/app/components/home/HeroSection';
import ModelsSection from '@/app/components/home/ModelsSection';
import AboutProjectsSection from '@/app/components/home/AboutProjectsSection';
import { backgroundImage } from '@/app/components/constants/gradients';

export default function HomePage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: `url('${backgroundImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 5px',
        backgroundAttachment: 'fixed',
      }}
    >
      <Navigation activePage="home" />

      <main className="w-full px-6 py-20 flex flex-col gap-16 flex-1">
        <HeroSection />
        <ModelsSection />
        <AboutProjectsSection />
      </main>

      <Footer />
    </div>
  );
}
