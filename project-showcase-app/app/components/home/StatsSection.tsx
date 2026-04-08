'use client';

import { colors } from '../constants/colors';

interface Stat {
  value: string;
  label: string;
}

const stats: Stat[] = [
  { value: '2', label: 'ML Models' },
  { value: '100%', label: 'Data Driven' },
  { value: '🏒', label: 'Hockey Focused' },
];

export default function StatsSection() {
  return (
    <section className="mb-16 flex flex-col items-center">
      <div className="grid md:grid-cols-3 gap-6 max-w-3xl w-full">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="backdrop-blur-md rounded-xl p-8 text-center border"
            style={{
              backgroundColor: colors.darkCard,
              borderColor: colors.green500_30,
            }}
          >
            <div className="text-4xl font-bold mb-2" style={{ color: colors.white }}>
              {stat.value}
            </div>
            <p style={{ color: colors.gray[100] }}>{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
