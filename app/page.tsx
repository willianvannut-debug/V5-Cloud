"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Hexagon, ChevronRight } from 'lucide-react';

// --- Assets ---
const HERO_VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260729_102822_0e6c87e8-c141-4744-bf32-ad30db296371.mp4";
const PORTRAIT_URL = "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260728_050334_5b076e26-0ce7-4898-b432-d764190e448f.png&w=1280&q=85";

// --- Global Classes ---
const PX_PADDING = "px-5 sm:px-8 md:px-12";
const PT_SECTION = "pt-24 sm:pt-28";
const PB_SECTION = "pb-12 md:pb-16";

// --- Tokens ---
const glassPanel = "bg-white/10 backdrop-blur-md border border-white/15";
const glassBorder = "border border-white/15";
const leftAccentBadge = "border-l-2 border-white bg-white/15 px-3 py-1.5 backdrop-blur-md font-mono text-[11px] uppercase tracking-[0.15em]";
const primaryCta = "rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-medium text-black hover:bg-white/85 transition-colors duration-300 flex items-center gap-1.5";
const secondaryCta = "rounded-full border border-white/25 bg-white/10 backdrop-blur-md px-5 py-2.5 text-xs sm:text-sm hover:bg-white/20 transition-colors duration-300";
const textOverVideo = "text-white drop-shadow-lg";
const monoLabel = "font-mono uppercase tracking-[0.15em]";

// --- Component: ScrollReveal ---
const useRevealObserver = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
};

// --- Component: ScrollVideoBackground ---
const ScrollVideoBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [framesReady, setFramesReady] = useState(false);
  const frameCache = useRef<ImageBitmap[]>([]);
  const scrollInfo = useRef({ smoothed: 0, target: 0, lastFrame: -1 });

  // Handle Resize
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth * Math.min(window.devicePixelRatio, 2);
    canvas.height = window.innerHeight * Math.min(window.devicePixelRatio, 2);
    // Initial draw to prevent black flash
    if (frameCache.current.length > 0) {
      drawFrame(frameCache.current[0]);
    }
  }, []);

  const drawFrame = (frame: ImageBitmap) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Object-cover math
    const imgRatio = frame.width / frame.height;
    const canvasRatio = canvas.width / canvas.height;
    let dWidth, dHeight, dx, dy;

    if (imgRatio > canvasRatio) {
      dHeight = canvas.height;
      dWidth = dHeight * imgRatio;
      dx = (canvas.width - dWidth) / 2;
      dy = 0;
    } else {
      dWidth = canvas.width;
      dHeight = dWidth / imgRatio;
      dx = 0;
      dy = (canvas.height - dHeight) / 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(frame, 0, 0, frame.width, frame.height, dx, dy, dWidth, dHeight);
  };

  // Frame Extraction and Smooth Scrub
  useEffect(() => {
    const video = videoRef.current;
    const offscreenVideo = document.createElement('video');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleLoadedData = () => {
      // Yield before extraction
      setTimeout(async () => {
        if (!offscreenVideo.duration) return;
        const totalFrames = Math.max(24, Math.min(90, Math.floor(offscreenVideo.duration * 12)));
        const targetWidth = 960;
        
        try {
          for (let i = 0; i < totalFrames; i++) {
            offscreenVideo.currentTime = (i / (totalFrames - 1)) * offscreenVideo.duration;
            await new Promise(r => offscreenVideo.onseeked = r);
            
            const ratio = offscreenVideo.videoWidth / offscreenVideo.videoHeight;
            const targetHeight = targetWidth / ratio;
            const bitmap = await createImageBitmap(offscreenVideo, { resizeWidth: targetWidth, resizeHeight: targetHeight });
            frameCache.current.push(bitmap);
          }
          setFramesReady(true);
        } catch (e) {
          console.error("Frame extraction failed, falling back to seek.", e);
        }
      }, 300);
    };

    // 🔥 CORREÇÃO CORS PARA O VÍDEO ANIMAR NO SCROLL 🔥
    offscreenVideo.crossOrigin = "anonymous";
    offscreenVideo.muted = true;
    offscreenVideo.playsInline = true;
    offscreenVideo.preload = "auto";
    offscreenVideo.src = HERO_VIDEO_URL;
    offscreenVideo.load();
    offscreenVideo.addEventListener('loadeddata', handleLoadedData);

    let animationFrameId: number;

    const tick = () => {
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const innerHeight = window.innerHeight;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      
      const maxScroll = scrollHeight - innerHeight;
      if (maxScroll <= 0) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }
      
      scrollInfo.current.target = scrollY / maxScroll;
      scrollInfo.current.smoothed += (scrollInfo.current.target - scrollInfo.current.smoothed) * 0.12;

      const currentProgress = clamp(scrollInfo.current.smoothed, 0, 1);
      
      if (frameCache.current.length > 0 && framesReady) {
        const frameIndex = Math.floor(currentProgress * (frameCache.current.length - 1));
        if (frameIndex !== scrollInfo.current.lastFrame) {
          drawFrame(frameCache.current[frameIndex]);
          scrollInfo.current.lastFrame = frameIndex;
        }
      } else if (video && video.duration) {
        // Fallback: Seek visible video
        const targetTime = currentProgress * (video.duration - 0.05);
        if (Math.abs(video.currentTime - targetTime) > 0.04) {
          video.currentTime = targetTime;
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };
    animationFrameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
      offscreenVideo.removeEventListener('loadeddata', handleLoadedData);
      frameCache.current.forEach(b => b.close());
      frameCache.current = [];
    };
  }, [framesReady, resizeCanvas]);

  return (
    <div className="fixed inset-0 z-0 bg-[#0a0a0a] overflow-hidden pointer-events-none">
      {/* 1. Poster */}
      <img 
        src="/hero-poster.jpg" 
        alt="" 
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${framesReady ? 'opacity-0' : 'opacity-100'}`} 
      />
      {/* 2. <video> Fallback/Initial */}
      <video 
        ref={videoRef}
        muted 
        playsInline 
        preload="auto" 
        crossOrigin="anonymous" /* 🔥 CORREÇÃO CORS AQUI TAMBÉM 🔥 */
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${framesReady ? 'opacity-0' : 'opacity-100'}`}
        src={HERO_VIDEO_URL}
      />
      {/* 3. <canvas> Scrubbed frames */}
      <canvas 
        ref={canvasRef} 
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${framesReady ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};

// --- Component: Navbar ---
const Navbar: React.FC = () => {
  const navLinks = [
    { name: 'Projects', superscript: '6' },
    { name: 'About' },
    { name: 'Blog' },
    { name: 'Contact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 border-b border-white/15 bg-[#0a0a0a]/80 backdrop-blur-sm ${PX_PADDING}`}>
      <div className="flex items-center justify-between h-nav h-20">
        <div className="flex items-center gap-2" data-reveal style={{ '--transition-delay': '0ms' } as React.CSSProperties}>
          <Hexagon className="text-white" size={24} strokeWidth={1.5} />
          <span className="text-white text-lg sm:text-xl font-medium tracking-tight">novaai</span>
        </div>

        <div className="hidden md:flex items-center gap-8 lg:gap-10">
          {navLinks.map((link, i) => (
            <a 
              key={link.name} 
              href="#" 
              className="relative text-sm text-white/85 hover:text-white transition-colors duration-300"
              data-reveal 
              style={{ '--transition-delay': `${100 + i * 100}ms` } as React.CSSProperties}
            >
              {link.name}
              {link.superscript && (
                <span className="absolute -top-1.5 -right-2 font-mono text-[10px] text-white/60">
                  {link.superscript}
                </span>
              )}
            </a>
          ))}
        </div>

        <button 
          className="rounded-md border border-white/20 bg-white/15 backdrop-blur-md px-4 py-2 text-xs sm:px-5 sm:text-sm hover:bg-white/25 transition-colors duration-300"
          data-reveal style={{ '--transition-delay': '500ms' } as React.CSSProperties}
        >
          Get Free Consultation
        </button>
      </div>
    </nav>
  );
};

// --- Component: SectionOne (Hero) ---
const SectionOne: React.FC = () => {
  const services = [
    '/ AI AUTOMATION',
    '/ AI INTEGRATION',
    '/ AI AGENT DEVELOPMENT',
  ];

  return (
    <section className={`min-h-screen ${PT_SECTION} ${PB_SECTION} ${PX_PADDING} flex flex-col justify-between`}>
      <div className="flex flex-col gap-8 sm:flex-row justify-between pt-8 sm:pt-12">
        <div className="flex flex-col gap-2">
          {services.map((service, i) => (
            <span 
              key={service}
              className={`${monoLabel} text-xs text-white/90 drop-shadow-md`}
              data-reveal style={{ '--transition-delay': `${150 + i * 120}ms` } as React.CSSProperties}
            >
              {service}
            </span>
          ))}
        </div>
        <p 
          className={`max-w-xs text-lg sm:text-xl leading-relaxed sm:text-right ${textOverVideo}`}
          data-reveal style={{ '--transition-delay': '300ms' } as React.CSSProperties}
        >
          We design automation that brings clarity, precision, and efficiency to the way your company operates.
        </p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row items-end justify-between mt-auto">
        <div className="flex flex-col">
          <div className="mb-5" data-reveal style={{ '--transition-delay': '150ms' } as React.CSSProperties}>
            <div className={leftAccentBadge}>
              We Automate 100+ Businesses
            </div>
          </div>
          <h1 
            className={`text-5xl sm:text-6xl lg:text-7xl font-normal leading-[1.05] tracking-tight ${textOverVideo}`}
            data-reveal style={{ '--transition-delay': '280ms' } as React.CSSProperties}
          >
            Clear. Precise.<br />Automated.
          </h1>
        </div>

        <div 
          className={`flex items-center gap-4 rounded-xl ${glassPanel} p-3`}
          data-reveal style={{ '--transition-delay': '420ms' } as React.CSSProperties}
        >
          <img 
            src={PORTRAIT_URL} 
            alt="Mitha, co-founder of NovaAI" 
            className="h-24 w-20 rounded-lg object-cover" 
          />
          <div className="flex flex-col gap-1.5 pr-2">
            <span className="text-sm font-medium text-white">Talk with Mitha</span>
            <span className={`${monoLabel} text-[10px] text-white/60`}>Co-founder of NovaAI</span>
            <button className={`${primaryCta} mt-1.5`}>
              Book 15-mins call
              <ChevronRight size={14} className="black" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Component: Logos ---
const Logos: React.FC = () => {
  const logos = ['Nimbus', 'Pluma', 'Citrus', 'Spider', 'Helod', 'Vertx'];
  return (
    <div className={`logos ${PX_PADDING} text-center ${PB_SECTION} mt-24 md:mt-32`}>
      <span className="block text-[12px] font-semibold tracking-[0.16em] uppercase text-white/60 mb-12">Trusted by fast-moving teams</span>
      <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 sm:gap-x-20">
        {logos.map(logo => (
          <span key={logo} className="text-[17px] font-bold text-white/60 opacity-80 hover:text-white hover:opacity-100 transition-all duration-200 cursor-default">
            {logo}
          </span>
        ))}
      </div>
    </div>
  );
};

// --- Component: SectionTwo (Capability) ---
const SectionTwo: React.FC = () => {
  const capabilities = [
    { index: '01', title: 'Real-time vision', body: 'Reads context as it happens and surfaces what matters before you ask.' },
    { index: '02', title: 'Layered insight', body: 'Moves from rough outline to sharp output without losing the thread.' },
    { index: '03', title: 'Adaptive speed', body: 'Learns your cadence and tightens every pass as you work.' },
  ];

  return (
    <section className={`min-h-screen ${PT_SECTION} ${PB_SECTION} ${PX_PADDING} flex flex-col justify-between`} id="capability">
      <div className="flex flex-col gap-6 sm:flex-row justify-between pt-8 sm:pt-12">
        <div data-reveal style={{ '--transition-delay': '120ms' } as React.CSSProperties}>
          <div className={leftAccentBadge}>Insight On Demand</div>
        </div>
        <p 
          className={`max-w-sm text-lg sm:text-xl leading-relaxed sm:text-right ${textOverVideo}`}
          data-reveal style={{ '--transition-delay': '220ms' } as React.CSSProperties}
        >
          Our AI doesn't just respond — it interprets, sharpens, and delivers the signal you need.
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-12 md:flex-row items-end justify-between mt-auto gap-16">
        <div className="max-w-xl">
          <h2 
            className={`text-5xl sm:text-6xl lg:text-7xl font-normal leading-[1.05] tracking-tight ${textOverVideo}`}
            data-reveal style={{ '--transition-delay': '180ms' } as React.CSSProperties}
          >
            Learn to see<br />brilliantly.
          </h2>
          <p 
            className={`mt-6 max-w-md text-sm sm:text-base text-white/80 ${textOverVideo}`}
            data-reveal style={{ '--transition-delay': '320ms' } as React.CSSProperties}
          >
            From the first sketch to the final render, Nova turns raw intent into decisions your team can act on — quietly, precisely, at speed.
          </p>
          <div className="mt-8 flex flex-wrap gap-3" data-reveal style={{ '--transition-delay': '420ms' } as React.CSSProperties}>
            <button className={primaryCta}>
              Run the demo
              <ChevronRight size={14} className="black" />
            </button>
            <button className={secondaryCta}>
              Free consultation
            </button>
          </div>
        </div>

        <div 
          className={`w-full max-w-md rounded-2xl ${glassPanel} bg-white/10 px-5 sm:px-6`}
          data-reveal style={{ '--transition-delay': '160ms' } as React.CSSProperties}
        >
          {capabilities.map((cap, i) => (
            <div 
              key={cap.index}
              className={`flex gap-5 py-5 ${i !== capabilities.length - 1 ? 'border-b border-white/15' : ''}`}
              data-reveal style={{ '--transition-delay': `${300 + i * 110}ms` } as React.CSSProperties}
            >
              <span className={`${monoLabel} text-[11px] text-white/55 mt-1`}>{cap.index}</span>
              <div className="flex-1 flex flex-col group">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-medium text-white">{cap.title}</h3>
                  <ChevronRight size={16} className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">{cap.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Helper: clamp ---
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

// --- Main App Component ---
export default function App() {
  // Activate Reveal Animation Observer
  useRevealObserver();

  return (
    <div className="relative root">
      {/* Scroll-scrubbed background */}
      <ScrollVideoBackground />

      {/* Relative wrapper for content */}
      <div className="relative z-10 wrapper">
        <Navbar />

        <main>
          <SectionOne />
          
          <Logos />
          
          {/* Spacer critical for scroll length to scrub video */}
          <div className="aria-hidden h-[80vh]" />

          <SectionTwo />
        </main>
        
        {/* Footer/Copyright row */}
        <div className={`copyright ${PX_PADDING} pb-12 mt-16 md:mt-20`}>
          <div className="text-center text-[13px] text-white/60 font-medium">
            &copy; {new Date().getFullYear()} Ascend, Inc. &mdash; Built among the stars.
          </div>
        </div>
      </div>
    </div>
  );
}