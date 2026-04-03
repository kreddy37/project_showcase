'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function SplashScreen() {
  const [isLoaded] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{
      backgroundImage: 'url("/assets/seattle-kraken-desktop-2025-2026-2000px-thumb.webp")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      {/* Dark overlay to improve text readability */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Animated background gradient orbs - random placement with slower animation */}
      <style>{`
        @keyframes slowPulse {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.15; }
        }
        .slow-pulse {
          animation: slowPulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      <div className="absolute w-96 h-96 bg-green-400 rounded-full blur-3xl slow-pulse" style={{ top: '15%', left: '10%', animationDelay: '0s' }}></div>
      <div className="absolute w-80 h-80 bg-blue-300 rounded-full blur-3xl slow-pulse" style={{ top: '20%', right: '15%', animationDelay: '1s' }}></div>
      <div className="absolute w-72 h-72 bg-cyan-400 rounded-full blur-3xl slow-pulse" style={{ bottom: '25%', left: '20%', animationDelay: '2s' }}></div>
      <div className="absolute w-88 h-88 bg-green-300 rounded-full blur-3xl slow-pulse" style={{ bottom: '15%', right: '10%', animationDelay: '1.5s' }}></div>

      {/* Content */}
      <div className={`relative z-10 text-center transition-all duration-1000 flex flex-col items-center justify-center min-h-screen ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>

        <h1 className="text-7xl font-bold text-white mb-4 drop-shadow-lg" style={{ textShadow: '0 4px 6px rgba(0, 0, 0, 0.3)' }}>
          Hockey Analytics
        </h1>

        <p className="text-2xl text-gray-100 mb-4 font-light drop-shadow-lg">
          Machine Learning Models for the Game
        </p>

        <p className="text-lg text-gray-200 mb-12 max-w-xl mx-auto font-light drop-shadow-lg">
          Explore advanced predictions and analysis for shot outcomes and hockey discussions
        </p>

        {/* Stats or features section */}
        <div className="mb-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          <div className="backdrop-blur-sm bg-white/10 rounded-lg p-6 border border-white/20">
            <div className="text-3xl font-bold text-green-300 mb-2">🎯</div>
            <p className="text-white font-semibold text-sm">Shot Prediction</p>
            <p className="text-gray-200 text-xs mt-1">ML-powered analysis</p>
          </div>
          <div className="backdrop-blur-sm bg-white/10 rounded-lg p-6 border border-white/20">
            <div className="text-3xl font-bold text-blue-300 mb-2">💬</div>
            <p className="text-white font-semibold text-sm">Topic Analysis</p>
            <p className="text-gray-200 text-xs mt-1">Community insights</p>
          </div>
          <div className="backdrop-blur-sm bg-white/10 rounded-lg p-6 border border-white/20">
            <div className="text-3xl font-bold text-green-300 mb-2">📊</div>
            <p className="text-white font-semibold text-sm">Data Driven</p>
            <p className="text-gray-200 text-xs mt-1">Powered by data</p>
          </div>
        </div>

        {/* CTA Button - At the bottom with spacing */}
        <div className="mt-auto w-full flex justify-center" style={{ paddingTop: '3rem', paddingBottom: '3rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Link
            href="/home"
            className="inline-block bg-white text-blue-600 font-bold text-xl rounded-lg hover:bg-green-50 transition-all duration-300 transform hover:scale-105 shadow-2xl drop-shadow-lg"
            style={{ paddingLeft: '5rem', paddingRight: '5rem', paddingTop: '2rem', paddingBottom: '2rem' }}
          >
            Explore Models
          </Link>
        </div>
      </div>
    </div>
  );
}
