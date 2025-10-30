import type React from 'react';
import { useEffect } from 'react';

interface SplashScreenProps {
  onFinished: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinished();
    }, 3000); // 3 seconds total duration

    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50 animate-fadeOut">
      <div className="flex flex-col items-center justify-center flex-grow">
        {/* NutriTrack AI Logo */}
        <div className="animate-logoIn">
           <img
          src="/logo.png"
          alt="BEY Solution Logo"
          className="h-40 mx-auto"
        />
        </div>

        {/* App Name */}
        <h1 className="text-3xl sm:text-4xl font-bold text-red-500 mt-4 animate-textIn">
          CalAI
        </h1>
      </div>
      
      {/* Powered by Section */}
      <div className="pb-17 text-center animate-poweredByIn">
        <p className="text-sm text-gray-400 mb-2 font-semibold tracking-widest uppercase">Powered By</p>
        <img
          src="/bey.png"
          alt="BEY Solution Logo"
          className="h-12 mx-auto"
        />
      </div>
    </div>
  );
};

export default SplashScreen;
