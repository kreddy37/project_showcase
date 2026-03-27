'use client';

import Link from 'next/link';
import { colors } from '../constants/colors';

export default function Navigation() {
  return (
    <nav
      className="sticky top-0 z-50 bg-opacity-95 backdrop-blur-md border-b"
      style={{
        backgroundColor: colors.darkBg,
        borderColor: colors.green500_20,
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-bold flex items-center gap-3 transition-all duration-300"
          style={{
            color: colors.white,
          }}
        >
          <span>Hockey Analytics</span>
        </Link>
        <div className="flex items-center gap-8">
          <Link
            href="/home"
            className="font-semibold transition-all duration-300 border-b-2"
            style={{
              color: colors.white,
              borderColor: colors.green[500],
            }}
          >
            Home
          </Link>
          <Link
            href="/shot-prediction"
            className="font-semibold transition-all duration-300"
            style={{ color: colors.white }}
          >
            Shot Prediction
          </Link>
          <Link
            href="/topic-analysis"
            className="font-semibold transition-all duration-300"
            style={{ color: colors.white }}
          >
            Topic Analysis
          </Link>
        </div>
      </div>
    </nav>
  );
}
