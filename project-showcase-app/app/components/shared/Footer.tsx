'use client';

import { colors } from '../constants/colors';

const stats = [
  { value: '2', label: 'ML Models' },
  { value: '100%', label: 'Data Driven' },
  { value: '🏒', label: 'Hockey Focused' },
];

export default function Footer() {
  return (
    <div
      className="mt-4 border-t px-6 pt-10 pb-8 rounded-xl"
      style={{
        borderColor: colors.green500_20,
        backgroundColor: colors.darkCard,
      }}
    >
      <div className="flex justify-center gap-16 mb-10">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className="text-4xl font-bold mb-1" style={{ color: colors.white }}>
              {stat.value}
            </div>
            <p className="text-sm" style={{ color: colors.gray[300] }}>{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="text-center text-sm border-t pt-6" style={{ color: colors.gray[300], borderColor: colors.green500_20 }}>
        <p>Kohl Reddy Machine Learning Showcase</p>
        <p className="mt-1">© 2025 - All Rights Reserved</p>
      </div>
    </div>
  );
}
