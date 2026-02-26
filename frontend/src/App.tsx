import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion, Variants } from 'framer-motion'; 
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import SmartDataSection from './components/SmartDataSection';
import NewsletterSection from './components/NewsletterSection';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';

// --- BACKGROUND ANIMATION VARIANTS ---
// These explicitly use the Variants type to resolve TypeScript red-line errors
const bgDrift: Variants = {
  animate: {
    x: [-20, 20, -20],
    y: [-20, 20, -20],
    scale: [1, 1.1, 1],
    transition: {
      duration: 30, // Very slow movement
      repeat: Infinity,
      ease: "linear",
    }
  }
};

const fadeInUp: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" }
  }
};

const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.2
    }
  }
};

const Landing: React.FC = () => {
  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    // Fixed container with overflow-hidden to prevent scrollbars during background movement
    <div className="page-shell min-h-screen text-white relative overflow-hidden bg-[#020617]">
      
      {/* 1. THE "ALIVE" GRID LAYER */}
      <motion.div 
        variants={bgDrift}
        animate="animate"
        className="grid-overlay pointer-events-none fixed inset-[-10%] opacity-20 bg-[url('/grid.svg')] bg-repeat z-0" 
      />

      {/* 2. SLOW MOVING GLOW BLOBS (Adds depth to the blue screen) */}
      <motion.div 
        animate={{ 
          x: [0, 100, 0], 
          y: [0, 50, 0],
          opacity: [0.15, 0.3, 0.15] 
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-[-10%] left-[-10%] w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0"
      />

      <motion.div 
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-8"
      >
        <header className="mb-4 flex items-center justify-between gap-4 pt-1 sm:pt-2">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center gap-3 group">
              <div className="w-[3px] h-10 rounded-full bg-gradient-to-b from-emerald-400 to-green-600" />
              🍃
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
            <button type="button" onClick={() => scrollToId('Features')} className="hover:text-white transition-colors">
              Features
            </button>
            <button type="button" onClick={() => scrollToId('how-it-works')} className="hover:text-white transition-colors">
              How it Works
            </button>
            <button type="button" onClick={() => scrollToId('Contact')} className="hover:text-white transition-colors">
              Contact
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="http://localhost:8080/oauth2/authorization/google"
              className="secondary-cta hidden px-4 py-2 text-xs sm:inline-flex"
            >
              Log In
            </a>
          </div>
        </header>

        <main className="flex-1">
          {/* Content sections enter with a fade-in but the background moves independently */}
          <motion.div variants={fadeInUp}><Hero /></motion.div>
          <motion.div variants={fadeInUp}><HowItWorks /></motion.div>
          <motion.div variants={fadeInUp}><SmartDataSection /></motion.div>
          <motion.div variants={fadeInUp}><NewsletterSection /></motion.div>
        </main>
      </motion.div>

      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

