'use client';

import { colors } from '../constants/colors';
import { gradients } from '../constants/gradients';

export default function PersonalInfoCard() {
  return (
    <div className="flex flex-col items-start text-left">
      <p className="text-xl font-light mb-6" style={{ color: colors.white }}>
        I am a former hockey player turned machine learning/AI engineer with a passion for leveraging hockey data to build intelligent analysis tools. Here you will find some of my more complete projects, most of which were created during my time at Lake Forest College, where I graduated Summa Cum Laude. Feel free to explore my work and reach out via the links below!
      </p>
      <div
        className="backdrop-blur-sm rounded-xl p-8 mb-6 w-full border"
        style={{
          background: gradients.glassGreen,
          borderColor: colors.green500_30,
        }}
      >
        <p className="text-base leading-relaxed" style={{ color: colors.white }}>

        </p>
      </div>

      <div className="flex gap-6">
        <a href="https://github.com/kreddy37" className="font-semibold transition-all duration-300" style={{ color: colors.gray[100] }}>
          GitHub
        </a>
        <a href="https://www.linkedin.com/in/kohl-reddy-208a922b7/" className="font-semibold transition-all duration-300" style={{ color: colors.gray[100] }}>
          LinkedIn
        </a>
      </div>
    </div>
  );
}
