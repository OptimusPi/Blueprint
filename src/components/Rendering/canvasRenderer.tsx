import React, {useEffect, useRef, useState} from "react";
import {AspectRatio} from "@mantine/core";
import {useForceUpdate, useHover, useMergedRef, useMouse, useResizeObserver} from "@mantine/hooks";
import type {Layer} from "../../modules/classes/Layer.ts";

const globalImageCache = new Map<string, HTMLImageElement>();
interface RenderCanvasProps {
    layers: Array<any>,
    invert?: boolean,
    spacing?: boolean,
    animated?: boolean
}


function loadImage(url:string): Promise<HTMLImageElement> {
    return new Promise(resolve=>{
        const image = new Image();
        image.addEventListener('load',()=>{
            resolve(image);
        });
        image.src=url;
    })
}

async function loadAllImagesIntoCache(){
    const urls = [
        "images/8BitDeck.png",
        "images/BlindChips.png",
        "images/Editions.png",
        "images/Enhancers.png",
        "images/Jokers.png",
        "images/stickers.png",
        "images/tags.png",
        "images/Tarots.png",
        "images/Vouchers.png",
    ];
    const promises = urls.map(url => loadImage(url));
    const images = await Promise.all(promises);
    images.forEach((image, index) => {
        globalImageCache.set(urls[index], image);
    });

}

loadAllImagesIntoCache()
    .catch(err=>{console.log(err)});
export function renderImage(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    image: HTMLImageElement,
    layer: Layer,
    timestamp?: number
) {
    if (!image || !layer || !layer?.pos) return 0;
    const cardWidth = (image.width / layer.columns);
    const cardHeight = (image.height / layer.rows);

    if (layer.order === 0) {
        canvas.width = cardWidth;
        canvas.height = cardHeight;
        // Don't set style.width/height here - let CSS handle scaling
    }

    canvas.style.imageRendering = 'auto';
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    // Save context state before modifying
    context.save();

    if (layer.animated && timestamp) {
        // Apply animation effects to this specific layer
        const elapsed = timestamp;

        // Gentle vertical movement (3px up and down)
        const yOffset = Math.sin(elapsed / 1000) * 3;

        // Subtle horizontal movement (1.5px side to side)
        const xOffset = Math.sin(elapsed / 1500) * 1.5;

        // Opacity fluctuation between 0.85 and 1
        // Apply the transform and opacity to just this layer
        context.globalAlpha = 0.65 + (Math.sin(elapsed / 2000) + 1) * 0.075;
        context.translate(xOffset, yOffset);
    }

    context.drawImage(
        image,
        layer.pos.x * cardWidth,
        layer.pos.y * cardHeight,
        cardWidth,
        cardHeight,
        0,
        0,
        canvas.width,
        canvas.height
    );

    // Restore context to previous state
    context.restore();

    return cardWidth / cardHeight;
}

interface SimpleRenderProps {
    layers: Array<Layer>,
    invert?: boolean,
}



export const SimpleRenderCanvas = React.forwardRef<HTMLCanvasElement, SimpleRenderProps>(
    ({ layers, invert = false }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mergedRef = useMergedRef(canvasRef, ref);
    const [ratio, setRatio] = useState(3 / 4);
    const forceUpdate = useForceUpdate();
    useEffect(() => {
        if (!canvasRef.current || !layers || layers.length === 0) return;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        context.clearRect(0, 0, canvas.width, canvas.height);

        layers
            .sort((a, b) => a.order - b.order)
            .forEach(layer => {
                if (globalImageCache.has(layer.source)) {
                    const image = globalImageCache.get(layer.source) as HTMLImageElement;
                    const imageRatio = renderImage(canvas, context, image, layer);
                    if (layer.order === 0) {
                        setRatio(imageRatio);
                    }
                    return;
                }
                loadImage(layer.source)
                    .then((img: HTMLImageElement) => {
                        const imageRatio = renderImage(canvas, context, img, layer);
                        globalImageCache.set(layer.source, img);
                        if (layer.order === 0) {
                            setRatio(imageRatio);
                        }
                        forceUpdate()
                    })
            });

        if (invert) {
            canvas.style.filter = 'invert(0.8)';
        } else {
            canvas.style.filter = 'none';
        }
    }, [layers, invert, forceUpdate]);

    return (
        <AspectRatio ratio={ratio} w="100%" h="100%" style={{ maxWidth: '100%', maxHeight: '100%', overflow: 'visible' }}>
            <canvas
                ref={mergedRef}
                style={{
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    width: '100%',
                    height: '100%',
                    display: 'block'
                }}
            />
        </AspectRatio>
    );
});

SimpleRenderCanvas.displayName = 'SimpleRenderCanvas';

// Advanced card rendering with canvas
export function RenderImagesWithCanvas({layers, invert = false, spacing = false}: RenderCanvasProps) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [ratio, setRatio] = useState(3 / 4);
    const animationFrameRef = useRef<number | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const forceUpdate = useForceUpdate();

    const hasAnimatedLayer = layers?.some(layer => layer.animated);

    // Animation loop for animated layers
    useEffect(() => {
        if (!hasAnimatedLayer) return;

        let startTime: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            setElapsed(timestamp - startTime);
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [hasAnimatedLayer]);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (!layers) return;
        const canvas: HTMLCanvasElement = canvasRef.current;
        const context: CanvasRenderingContext2D | null = canvas.getContext('2d');
        if (!context) return;

        context.clearRect(0, 0, canvas.width, canvas.height);

        layers
            .sort((a, b) => a.order - b.order)
            .forEach((layer => {
                if (globalImageCache.has(layer.source)) {
                    const image = globalImageCache.get(layer.source) as HTMLImageElement;
                    const imageRatio = renderImage(canvas, context, image, layer, hasAnimatedLayer ? elapsed : undefined);
                    if (layer.order === 0) {
                        setRatio(imageRatio);
                    }
                    return;
                }
                loadImage(layer.source)
                    .then((img: HTMLImageElement) => {
                        const imageRatio = renderImage(canvas, context, img, layer, hasAnimatedLayer ? elapsed : undefined);
                        globalImageCache.set(layer.source, img);
                        if (layer.order === 0) {
                            setRatio(imageRatio);
                        }
                        forceUpdate();
                    })
            }))

        if (invert) {
            canvas.style.filter = 'invert(0.8)';
        } else {
            canvas.style.filter = 'none';
        }
    }, [layers, elapsed, forceUpdate, hasAnimatedLayer, invert]);

    const {hovered, ref: hoverRef} = useHover();
    const {ref: mouseRef, x: mouseX, y: mouseY} = useMouse();
    const [rectRef, rect] = useResizeObserver();
    const mergedRef = useMergedRef(mouseRef, hoverRef, containerRef, rectRef);

    // Handle card tilt effect - compute transform directly
    const SCALE_X = 6;
    const SCALE_Y = 8;
    const tiltTransform = React.useMemo(() => {
        const x = mouseX - rect.x;
        const y = mouseY - rect.y;
        return `perspective(1000px) rotateX(${
            (y / rect.height) * -(SCALE_Y * 2) + SCALE_Y
        }deg) rotateY(${
            (x / rect.width) * (SCALE_X * 2) - SCALE_X
        }deg) translateZ(10px)`;
    }, [mouseX, mouseY, rect.x, rect.y, rect.width, rect.height]);

    return (
        <AspectRatio
            ratio={ratio}
            w={spacing ? '80%' : "100%"}
            py={spacing ? 'xs' : 0}
            ref={mergedRef}
            style={{
                transition: hovered ? 'none' : 'transform 0.4s ease',
                transform: hovered ? tiltTransform : 'none',
                transformStyle: 'preserve-3d',
                transformOrigin: 'center center',
                display: 'flex',
                overflow: 'visible'
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    boxShadow: hovered
                        ? `0 2px 12px rgba(0,0,0,0.3)`
                        : '0 2px 8px rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    transition: hovered ? 'none' : 'box-shadow 0.4s ease-out',
                    width: '100%',
                    height: '100%',
                    display: 'block'
                }}
            />
        </AspectRatio>
    )
}
