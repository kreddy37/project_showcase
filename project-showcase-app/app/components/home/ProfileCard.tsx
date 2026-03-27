'use client';

import Image from 'next/image';
import { colors } from '../constants/colors';

export default function ProfileCard() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-6">
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-30"
          style={{ background: 'linear-gradient(to bottom right, #22c55e, #3b82f6)' }}
        ></div>
        <div
          className="relative w-64 h-64 rounded-full border-2 overflow-hidden shadow-2xl"
          style={{
            borderColor: colors.green400_50,
          }}
        >
          <Image
            src="/assets/portrait.webp"
            alt="Kohl Reddy portrait"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      <h2 className="text-4xl font-bold mb-2" style={{ color: colors.white }}>
        Kohl Reddy
      </h2>
      <p className="font-semibold text-lg" style={{ color: colors.white }}>
        ML Engineer / Data Scientist
      </p>
    </div>
  );
}
