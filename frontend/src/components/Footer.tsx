import React from 'react';

const Footer: React.FC = () => {
  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  return (
    <footer className="border-t border-soft/60 bg-[#020617]/60 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 text-xs text-muted-text sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-green/15 text-[13px] text-accent-green-soft">
              🍃
            </span>
            <span>EcoRoute.ai</span>
          </div>
          <p className="max-w-xs text-xs leading-relaxed text-muted-text italic">
            "Dedicated to improving global urban health through AI-driven environmental data and
            navigation solutions".
          </p>
          <div className="flex gap-3 text-[11px]">
            <span>Twitter</span>
            <span>LinkedIn</span>
            <span>Instagram</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-white">Product</p>
            <ul className="space-y-1 text-[11px]">
              <li>
                <a 
                  href="http://localhost:8080/oauth2/authorization/google" 
                  className="hover:text-white"
                >
                  Our App
                </a></li>
              {/* <li>API for Developers</li>
              <li>City Partnerships</li> */}
              <li>Mobile App</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-white">Company</p>
            <ul className="space-y-1 text-[11px]">
              <li>About Us</li>
              {/* <li>Research</li> */}
              <li>Privacy Policy</li>
              {/* <li>Press</li> */}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-white">Support</p>
            <ul className="space-y-1 text-[11px]">
              <li>Help Center</li>
              <li>
                <button 
                  type="button" 
                  onClick={() => scrollToId('Contact')} 
                  className="hover:text-white"
                >
                  Contact
                </button>
              </li>
              <li>FAQ</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-6 text-center text-[11px] text-muted-text">
        © {new Date().getFullYear()} EcoRoute.AI. All rights reserved. · Social Data Monitoring
      </div>
    </footer>
  );
};

export default Footer;

