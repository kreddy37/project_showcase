'use client';

import { colors } from '../constants/colors';

export default function Footer() {
  return (
    <div
      className="mt-20 text-center text-sm border-t pt-8"
      style={{
        color: colors.gray[400],
        borderColor: colors.green500_20,
      }}
    >
      <p>Kohl Reddy Machine Learning Showcase</p>
      <p className="mt-2">© 2025 - All Rights Reserved</p>
    </div>
  );
}
