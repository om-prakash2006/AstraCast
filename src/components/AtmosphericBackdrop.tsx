import React, { useEffect, useRef } from 'react';

interface AtmosphericBackdropProps {
  themeMode?: 'SAGE_EARTH' | 'MIDNIGHT_GLASS' | 'CLARA_CLEAN';
  isCleanLight?: boolean;
  rainEffectEnabled?: boolean;
}

export const AtmosphericBackdrop: React.FC<AtmosphericBackdropProps> = ({
  themeMode = 'SAGE_EARTH',
  isCleanLight = false,
  rainEffectEnabled = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isSage = themeMode === 'SAGE_EARTH';
  const isLight = isCleanLight || isSage;

  useEffect(() => {
    if (!rainEffectEnabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initDrops();
    };

    window.addEventListener('resize', handleResize);

    interface Droplet {
      x: number;
      y: number;
      r: number;
      alpha: number;
      vy: number;
      trailLength: number;
    }

    let staticDroplets: Droplet[] = [];
    let movingDroplets: Droplet[] = [];

    const initDrops = () => {
      staticDroplets = [];
      movingDroplets = [];
      const staticCount = Math.floor((width * height) / 9000); // realistic condensation density
      for (let i = 0; i < staticCount; i++) {
        staticDroplets.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 2.2 + 0.8,
          alpha: Math.random() * 0.45 + 0.25,
          vy: 0,
          trailLength: 0,
        });
      }

      // A few slow rolling beads down the pane
      const movingCount = Math.min(18, Math.floor(width / 90));
      for (let i = 0; i < movingCount; i++) {
        movingDroplets.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 2.6 + 1.8,
          alpha: Math.random() * 0.5 + 0.35,
          vy: Math.random() * 0.7 + 0.3,
          trailLength: Math.random() * 25 + 15,
        });
      }
    };

    initDrops();

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render static condensation beads
      for (let i = 0; i < staticDroplets.length; i++) {
        const d = staticDroplets[i];
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        if (isSage) {
          ctx.fillStyle = `rgba(89, 112, 91, ${d.alpha * 0.35})`;
        } else if (isCleanLight) {
          ctx.fillStyle = `rgba(255, 255, 255, ${d.alpha * 0.8})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${d.alpha * 0.45})`;
        }
        ctx.fill();

        // Droplet specular highlight
        ctx.beginPath();
        ctx.arc(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = isSage
          ? 'rgba(255, 255, 255, 0.85)'
          : isCleanLight
          ? 'rgba(255, 255, 255, 0.9)'
          : 'rgba(255, 255, 255, 0.75)';
        ctx.fill();
      }

      // Render moving trickles down the glass pane
      for (let i = 0; i < movingDroplets.length; i++) {
        const md = movingDroplets[i];
        md.y += md.vy;
        if (md.y > height + 20) {
          md.y = -10;
          md.x = Math.random() * width;
        }

        // Trickle trail behind droplet
        ctx.beginPath();
        ctx.moveTo(md.x, md.y - md.trailLength);
        ctx.lineTo(md.x, md.y);
        ctx.strokeStyle = isSage
          ? 'rgba(154, 174, 163, 0.4)'
          : isCleanLight
          ? 'rgba(255, 255, 255, 0.35)'
          : 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = md.r * 0.7;
        ctx.stroke();

        // Main bead
        ctx.beginPath();
        ctx.arc(md.x, md.y, md.r, 0, Math.PI * 2);
        ctx.fillStyle = isSage
          ? 'rgba(89, 112, 91, 0.45)'
          : isCleanLight
          ? 'rgba(255, 255, 255, 0.85)'
          : 'rgba(255, 255, 255, 0.55)';
        ctx.fill();

        // Specular gleam
        ctx.beginPath();
        ctx.arc(md.x - md.r * 0.3, md.y - md.r * 0.3, md.r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isCleanLight, isSage, rainEffectEnabled]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Dynamic atmospheric background gradient */}
      {isSage ? (
        <div className="absolute inset-0 bg-[#E2E2DB]">
          {/* Subtle mist atmospheric color fields matching #9AAEA3, #BBBB9A, #59705B */}
          <div className="absolute -top-32 right-1/4 w-[650px] h-[550px] bg-[#9AAEA3]/35 rounded-full blur-[100px]"></div>
          <div className="absolute top-1/3 left-10 w-[550px] h-[550px] bg-[#BBBB9A]/40 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-10 right-10 w-[600px] h-[500px] bg-[#59705B]/15 rounded-full blur-[110px]"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#E2E2DB]/90 via-[#ecece6]/70 to-[#E2E2DB]"></div>
        </div>
      ) : isCleanLight ? (
        <div className="absolute inset-0 bg-gradient-to-b from-[#eaf4fd] via-[#dcebf9] to-[#edf4fc]">
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl"></div>
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-[#091528] via-[#0b1c36] to-[#081324]">
          <div className="absolute -top-32 left-1/3 w-[750px] h-[550px] bg-blue-950/60 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 right-10 w-[600px] h-[400px] bg-sky-950/40 rounded-full blur-[100px]"></div>
        </div>
      )}

      {/* Condensation glass canvas */}
      {rainEffectEnabled && (
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full opacity-70 ${isSage ? 'mix-blend-multiply' : 'mix-blend-screen'}`}
        />
      )}
    </div>
  );
};
