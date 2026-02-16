import React from 'react';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import SmartDataSection from './components/SmartDataSection';
import NewsletterSection from './components/NewsletterSection';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (
    <div className="page-shell min-h-screen text-white">
      <div className="grid-overlay pointer-events-none fixed inset-0 opacity-30" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <header className="mb-4 flex items-center justify-between gap-4 pt-1 sm:pt-2">
          <div className="flex items-center gap-2">
            <span className="">
            </span>
            <div className="relative flex items-center gap-3 group">
              <div className="w-[3px] h-10 rounded-full bg-gradient-to-b from-emerald-400 to-green-600"></div>

              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-tight bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
                  EcoRoute.ai
                </p>
                <p className="text-[11px] text-muted-text/80 tracking-wide">
                  AI-powered clean route navigation
                </p>
              </div>
            </div>

          </div>

          <nav className="hidden items-center gap-6 text-xs text-muted-text sm:flex">
            <button type="button" className="hover:text-white">
              Features
            </button>
            <button type="button" className="hover:text-white">
              How it Works
            </button>
            <button type="button" className="hover:text-white">
              API
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button type="button" className="secondary-cta hidden px-4 py-2 text-xs sm:inline-flex">
              Log In
            </button>
            <button type="button" className="primary-cta px-4 py-2 text-xs">
              Get Started
            </button>
          </div>
        </header>

        <main className="flex-1">
          <Hero />
          <HowItWorks />
          <SmartDataSection />
          <NewsletterSection />
        </main>
      </div >

  <Footer />
    </div >
  );
};

export default App;

