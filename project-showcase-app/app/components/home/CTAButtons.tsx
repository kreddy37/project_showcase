'use client';

import { colors } from '../constants/colors';

export default function CTAButtons() {
  return (
    <div className="flex gap-4 flex-wrap justify-center">
      <a
        href="#projects"
        className="px-7 py-3 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg"
        style={{
          backgroundColor: colors.green[600],
        }}
      >
        View Projects
      </a>
      <a
        href="#"
        className="px-7 py-3 border-2 font-semibold rounded-lg transition-all duration-300"
        style={{
          borderColor: colors.blue[400],
          color: colors.blue[300],
        }}
      >
        Learn More
      </a>
    </div>
  );
}
