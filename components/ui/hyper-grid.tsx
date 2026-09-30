// components/ui/hyper-grid.tsx
"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import {
    motion,
    useAnimationFrame,
    useMotionTemplate,
    useMotionValue,
    useTransform,
    useSpring,
    type Variants,
    type MotionValue,
} from "framer-motion";

const PHYSICS = {
    slow: { damping: 40, stiffness: 150, mass: 1.2 },
    cursor: { damping: 25, stiffness: 250, mass: 0.5 },
    warp: { damping: 15, stiffness: 300, mass: 0.2 },
};

const NOISE_Texture = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E`;

interface MovingGridProps {
    gridSize?: number;
    scrollSpeed?: number;
    maskRadius?: number;
    className?: string;
    children?: React.ReactNode;
}

const MovingGrid: React.FC<MovingGridProps> = ({
    gridSize = 100,
    scrollSpeed = 0.4,
    maskRadius = 400,
    className = "",
    children,
}) => {
    const [isMounted, setIsMounted] = useState(false);
    const [isWarping, setIsWarping] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const [windowSize, setWindowSize] = useState({ w: 1920, h: 1080 });

    const gridX = useMotionValue(0);
    const gridY = useMotionValue(0);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const velocityX = useMotionValue(0);
    const velocityY = useMotionValue(0);

    const prevMouseX = useRef(0);
    const prevMouseY = useRef(0);

    useEffect(() => {
        setIsMounted(true);
        if (typeof window === "undefined") return;

        setWindowSize({ w: window.innerWidth, h: window.innerHeight });
        mouseX.set(window.innerWidth / 2);
        mouseY.set(window.innerHeight / 2);
        prevMouseX.current = window.innerWidth / 2;
        prevMouseY.current = window.innerHeight / 2;

        const handleResize = () => {
            setWindowSize({ w: window.innerWidth, h: window.innerHeight });
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [mouseX, mouseY]);

    const warpSignal = useSpring(0, PHYSICS.warp);
    const lagX = useSpring(mouseX, PHYSICS.cursor);
    const lagY = useSpring(mouseY, PHYSICS.cursor);

    const sprungVelX = useSpring(velocityX, PHYSICS.slow);
    const sprungVelY = useSpring(velocityY, PHYSICS.slow);

    const rotateXBase = useTransform(mouseY, [0, windowSize.h], [8, -8]);
    const rotateYBase = useTransform(mouseX, [0, windowSize.w], [-8, 8]);

    const finalRotateX = useTransform(
        [rotateXBase, warpSignal],
        ([r, w]) => (r as number) * (1 + (w as number) * 2)
    );
    const finalRotateY = useTransform(
        [rotateYBase, warpSignal],
        ([r, w]) => (r as number) * (1 + (w as number) * 2)
    );

    const sprungRotateX = useSpring(finalRotateX, PHYSICS.slow);
    const sprungRotateY = useSpring(finalRotateY, PHYSICS.slow);

    const gridScale = useTransform(warpSignal, [0, 1], [1, 1]);
    const gridScaleX = useSpring(gridScale, PHYSICS.slow);
    const gridScaleY = useSpring(gridScale, PHYSICS.slow);

    const animatedGridSize = useTransform(
        warpSignal,
        [0, 1],
        [gridSize, gridSize * 0.8]
    );

    const contentScale = useTransform(warpSignal, [0, 1], [1, 0.92]);

    useAnimationFrame((_, delta) => {
        const safeDelta = Math.min(delta, 100);

        const vx = sprungVelX.get();
        const vy = sprungVelY.get();

        const normalizedVX = Math.max(-2, Math.min(2, vx / 100));
        const normalizedVY = Math.max(-2, Math.min(2, vy / 100));

        const currentWarp = warpSignal.get();
        const speedMultiplier = 1 + currentWarp * 24;
        const baseForwardDrift = -0.3 * speedMultiplier;

        const cellSize = animatedGridSize.get();

        const moveX = normalizedVX * scrollSpeed * speedMultiplier * (safeDelta / 16);
        const moveY = (normalizedVY + baseForwardDrift) * scrollSpeed * speedMultiplier * (safeDelta / 16);

        gridX.set((gridX.get() + moveX) % cellSize);
        gridY.set((gridY.get() + moveY) % cellSize);
    });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { clientX, clientY } = e;
        const dx = clientX - prevMouseX.current;
        const dy = clientY - prevMouseY.current;

        velocityX.set(dx);
        velocityY.set(dy);

        mouseX.set(clientX);
        mouseY.set(clientY);

        prevMouseX.current = clientX;
        prevMouseY.current = clientY;
    };

    const maskIntensity = useTransform(warpSignal, [0, 1], [0, 200]);
    const currentMaskRadius = useTransform(warpSignal, [0, 1], [maskRadius, maskRadius * 1.5]);
    const maskImage = useMotionTemplate`radial-gradient(${currentMaskRadius}px circle at ${lagX}px ${lagY}px, rgb(${maskIntensity},${maskIntensity},${maskIntensity}), transparent)`;

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2, delayChildren: 0.3 },
        },
    };

    const gridIntroVariants: Variants = {
        hidden: { scale: 0.01, opacity: 0, rotateZ: 45 },
        visible: {
            scale: 1,
            opacity: 1,
            rotateZ: 0,
            transition: { duration: 1.8, ease: [0.16, 1, 0.3, 1] },
        },
    };

    return (
        <motion.div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            initial="hidden"
            animate={isMounted ? "visible" : "hidden"}
            variants={containerVariants}
            className={`relative w-full overflow-hidden bg-[#021708] flex flex-col items-center justify-center perspective-distant font-sans ${className}`}
        >
            <div
                className="absolute inset-0 opacity-[0.15] pointer-events-none z-0 mix-blend-overlay"
                style={{
                    backgroundImage: `url("${NOISE_Texture}")`,
                    backgroundRepeat: "repeat",
                }}
            />

            <motion.div
                className="absolute inset-0 opacity-50 transition-colors duration-700 pointer-events-none"
                style={{
                    filter: useMotionTemplate`hue-rotate(${useTransform(
                        warpSignal,
                        [0, 1],
                        [0, 40]
                    )}deg) saturate(${useTransform(warpSignal, [0, 1], [1, 1.5])})`,
                }}
                aria-hidden="true"
            >
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-emerald-950/30 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-cyan-950/20 rounded-full blur-[150px]" />
            </motion.div>

            <motion.div
                className="absolute inset-0 pointer-events-none will-change-transform z-10"
                variants={gridIntroVariants}
                style={{
                    rotateX: sprungRotateX,
                    rotateY: sprungRotateY,
                    scaleX: gridScaleX,
                    scaleY: gridScaleY,
                    transformOrigin: "center bottom",
                }}
                aria-hidden="true"
            >
                <GridLayer
                    gridSize={animatedGridSize}
                    x={gridX}
                    y={gridY}
                    strokeColor="rgba(16,185,129,0.08)"
                />

                <motion.div
                    className="absolute inset-0"
                    style={{ maskImage, WebkitMaskImage: maskImage }}
                >
                    <GridLayer
                        gridSize={animatedGridSize}
                        x={gridX}
                        y={gridY}
                        strokeColor="rgba(16,185,129,0.35)"
                        strokeWidth={1}
                    />
                </motion.div>
            </motion.div>

            <motion.div
                className="absolute inset-0 z-30 pointer-events-none bg-emerald-500 mix-blend-overlay"
                style={{
                    opacity: useTransform(warpSignal, [0, 0.1, 1], [0, 0.2, 0]),
                }}
                aria-hidden="true"
            />

            <motion.div
                className="relative z-40 w-full"
                style={{ scale: contentScale }}
            >
                {children}
            </motion.div>
        </motion.div>
    );
};

export default MovingGrid;

interface GridLayerProps {
    gridSize: MotionValue<number>;
    x: MotionValue<number>;
    y: MotionValue<number>;
    strokeColor: string;
    strokeWidth?: number;
}

const MotionPattern = motion.pattern;
const MotionPath = motion.path;

const GridLayer: React.FC<GridLayerProps> = React.memo(({
    gridSize,
    x,
    y,
    strokeColor,
    strokeWidth = 1,
}) => {
    const patternId = React.useId();
    const pathD = useTransform(gridSize, (s) => `M ${s} 0 L 0 0 0 ${s}`);

    return (
        <div className="absolute inset-0 h-full w-full pointer-events-none select-none">
            <svg className="w-full h-full bg-transparent">
                <defs>
                    <MotionPattern
                        id={patternId}
                        width={gridSize}
                        height={gridSize}
                        patternUnits="userSpaceOnUse"
                        x={x}
                        y={y}
                    >
                        <MotionPath
                            d={pathD}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            shapeRendering="geometricPrecision"
                        />
                    </MotionPattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#${patternId})`} />
            </svg>
        </div>
    );
});

GridLayer.displayName = "GridLayer";