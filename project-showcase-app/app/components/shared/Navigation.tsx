'use client';

import Link from 'next/link';
import { colors } from '../constants/colors';

interface NavigationProps {
  activePage?: string;
}

const links = [
  { href: '/home', label: 'Home', key: 'home' },
  { href: '/shot-prediction', label: 'Shot Prediction', key: 'shot-prediction' },
  { href: '/topic-analysis', label: 'Topic Analysis', key: 'topic-analysis' },
];

export default function Navigation({ activePage }: NavigationProps) {
  return (
    <nav
      className="sticky top-0 z-50 bg-opacity-95 backdrop-blur-md border-b"
      style={{ backgroundColor: colors.darkBg, borderColor: colors.green500_20 }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-bold flex items-center gap-3 transition-all duration-300"
          style={{ color: colors.white }}
        >
          <span>Hockey Analytics</span>
        </Link>
        <div className="flex items-center gap-8">
          {links.map((link) => {
            const isActive = activePage === link.key;
            return (
              <Link
                key={link.key}
                href={link.href}
                className={`font-semibold transition-all duration-300 border-b-2 ${
                  isActive
                    ? 'text-green-400 border-green-400'
                    : 'text-white hover:text-green-400 border-transparent'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
