import React, {ReactNode, useEffect, useRef, useState} from "react";
import {Box} from "@mantine/core";

interface DragScrollProps {
    children: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    hideScrollbar?: boolean;
}

export function DragScroll({children, className, style, hideScrollbar = false}: DragScrollProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const startXRef = useRef(0);
    const scrollLeftRef = useRef(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        setIsDragging(true);
        startXRef.current = e.pageX;
        scrollLeftRef.current = containerRef.current.scrollLeft;
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (!containerRef.current) return;
        setIsDragging(true);
        startXRef.current = e.touches[0].pageX;
        scrollLeftRef.current = containerRef.current.scrollLeft;
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            e.preventDefault();
            const delta = e.pageX - startXRef.current;
            container.scrollLeft = scrollLeftRef.current - delta;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;
            const delta = e.touches[0].pageX - startXRef.current;
            container.scrollLeft = scrollLeftRef.current - delta;
        };

        const handleEnd = () => {
            setIsDragging(false);
        };

        // Stop dragging if mouse leaves the window
        const handleMouseLeave = () => {
            if (isDragging) {
                setIsDragging(false);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('touchmove', handleTouchMove, {passive: true});
        document.addEventListener('touchend', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('mouseleave', handleMouseLeave);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging]);

    return (
        <Box
            ref={containerRef}
            className={className}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            style={{
                overflowX: 'auto',
                overflowY: 'hidden',
                whiteSpace: 'nowrap',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                WebkitOverflowScrolling: 'touch',
                ...(hideScrollbar && { scrollbarWidth: 'none', msOverflowStyle: 'none' }),
                ...style
            }}
            {...(hideScrollbar && { 'data-hide-scrollbar': true })}
        >
            {children}
        </Box>
    );
}
