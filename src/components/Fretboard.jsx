import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Fretboard.css';

const STRING_SPACING = 50;
const FRET_SPACING = 120;
const PADDING_X = 100;
const PADDING_Y = 60;
const GAP = 12;

const INLAYS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const DOUBLE_INLAYS = [12, 24];

const Fretboard = ({
    config,
    diagrams,
    onToggleMark,
    onUpdateMarkText,
    chordName,
    setChordName,
    zoomMode,
    skipMarkAnimation,
    isLoadSidebarOpen,
}) => {
    const svgRefs = useRef([]);
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const scrollViewRef = useRef(null);
    const wasEditing = useRef(false);

    const [editingMark, setEditingMark] = useState(null);
    const [scale, setScale] = useState(1);
    const [contentNaturalHeight, setContentNaturalHeight] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);

    const isVertical = config.orientation === 'vertical';
    const isScrollMode = zoomMode === 'scroll';

    const boardWidth = config.frets * FRET_SPACING + PADDING_X * 2;
    const boardHeight = (config.strings - 1) * STRING_SPACING + PADDING_Y * 2;
    const svgWidth = isVertical ? boardHeight : boardWidth;
    const svgHeight = isVertical ? boardWidth : boardHeight;

    // Clamp currentPage if diagrams count shrinks
    useEffect(() => {
        if (currentPage >= diagrams.length) {
            setCurrentPage(Math.max(0, diagrams.length - 1));
        }
    }, [diagrams.length, currentPage]);

    // Measure content for whitespace fix (fit mode)
    React.useLayoutEffect(() => {
        if (contentRef.current) {
            setContentNaturalHeight(contentRef.current.offsetHeight);
        }
    });

    // Auto-scale: fit mode only
    React.useLayoutEffect(() => {
        if (isScrollMode) { setScale(1); return; }
        const updateScale = () => {
            if (!containerRef.current || !contentRef.current) return;
            const availableWidth = containerRef.current.clientWidth - 80;
            const availableHeight = containerRef.current.clientHeight - 40;
            const natW = contentRef.current.offsetWidth || svgWidth + 40;
            const natH = contentRef.current.offsetHeight || svgHeight * diagrams.length + 80;
            setScale(Math.min(availableWidth / natW, availableHeight / natH, 1));
        };
        const obs = new ResizeObserver(updateScale);
        if (containerRef.current) obs.observe(containerRef.current);
        updateScale();
        return () => obs.disconnect();
    }, [diagrams.length, svgWidth, svgHeight, isLoadSidebarOpen, isScrollMode]);

    // Wheel navigation for scroll mode — uses native listener so we can prevent default
    useEffect(() => {
        const el = scrollViewRef.current;
        if (!el || !isScrollMode) return;
        const onWheel = (e) => {
            e.preventDefault();
            if (e.deltaY > 0) setCurrentPage(p => Math.min(diagrams.length - 1, p + 1));
            else setCurrentPage(p => Math.max(0, p - 1));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [isScrollMode, diagrams.length]);

    // ── Coordinate helpers ─────────────────────────────────────────────────

    const getCoordinates = (stringIdx, fretIdx) => {
        let x, y;
        if (fretIdx < 0) {
            x = PADDING_X - 40;
            y = PADDING_Y + stringIdx * STRING_SPACING;
        } else {
            x = PADDING_X + fretIdx * FRET_SPACING + FRET_SPACING / 2;
            y = PADDING_Y + stringIdx * STRING_SPACING;
        }
        if (isVertical) {
            const flipped = (config.strings - 1) - stringIdx;
            return { x: PADDING_Y + flipped * STRING_SPACING, y: x };
        }
        return { x, y };
    };

    const computeIndices = (e, diagramIndex) => {
        const svgEl = svgRefs.current[diagramIndex];
        if (!svgEl) return null;
        const rect = svgEl.getBoundingClientRect();
        const sc = isScrollMode ? 1 : scale;
        const clickX = (e.clientX - rect.left) / sc;
        const clickY = (e.clientY - rect.top) / sc;
        let stringIdx, visualFretIdx;
        if (isVertical) {
            stringIdx = (config.strings - 1) - Math.round((clickX - PADDING_Y) / STRING_SPACING);
            visualFretIdx = Math.floor((clickY - PADDING_X) / FRET_SPACING);
        } else {
            stringIdx = Math.round((clickY - PADDING_Y) / STRING_SPACING);
            visualFretIdx = Math.floor((clickX - PADDING_X) / FRET_SPACING);
        }
        stringIdx = Math.max(0, Math.min(config.strings - 1, stringIdx));
        const minFret = config.startFret === 1 ? -1 : 0;
        visualFretIdx = Math.max(minFret, Math.min(config.frets - 1, visualFretIdx));
        return { stringIdx, visualFretIdx };
    };

    const handleClick = (e, diagramIndex) => {
        if (editingMark || wasEditing.current) {
            setEditingMark(null);
            wasEditing.current = false;
            return;
        }
        const r = computeIndices(e, diagramIndex);
        if (r) onToggleMark(diagramIndex, r.stringIdx, r.visualFretIdx);
    };

    const handleContextMenu = (e, diagramIndex) => {
        e.preventDefault();
        const r = computeIndices(e, diagramIndex);
        if (!r) return;
        const mark = diagrams[diagramIndex].marks.find(
            m => m.stringIndex === r.stringIdx && m.fretIndex === r.visualFretIdx
        );
        if (mark) {
            setEditingMark({ diagramIndex, stringIndex: r.stringIdx, fretIndex: r.visualFretIdx, initialText: mark.text });
        } else {
            onToggleMark(diagramIndex, r.stringIdx, r.visualFretIdx, 'cross');
        }
    };

    // ── SVG renderer ───────────────────────────────────────────────────────

    const renderSVG = (diagram, diagramIndex, interactive = true, showGap = true) => {
        const marks = diagram.marks;

        // Animation: use plain <g> when transposing so marks snap instantly
        const MarkEl = skipMarkAnimation ? 'g' : motion.g;
        const mProps = skipMarkAnimation ? {} : {
            initial: { scale: 0, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0, opacity: 0 },
            transition: { type: 'spring', stiffness: 300, damping: 20 }
        };

        const renderShape = (color, clipPath = null) => {
            const p = clipPath ? { clipPath: `url(#${clipPath})` } : {};
            if (marks.length === 0) return null; // resolved per-mark below
            return null; // placeholder — used inline
        };

        return (
            <div
                key={diagram.id}
                style={{ position: 'relative', marginBottom: showGap && diagramIndex < diagrams.length - 1 ? GAP : 0 }}
            >
                <svg
                    ref={interactive ? (el => { svgRefs.current[diagramIndex] = el; }) : null}
                    width={svgWidth}
                    height={svgHeight}
                    onClick={interactive ? (e) => handleClick(e, diagramIndex) : undefined}
                    onContextMenu={interactive ? (e) => handleContextMenu(e, diagramIndex) : undefined}
                    className="fretboard-svg"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Wood background */}
                    <rect
                        x={isVertical ? PADDING_Y - 10 : PADDING_X}
                        y={isVertical ? PADDING_X : PADDING_Y - 10}
                        width={isVertical ? (config.strings - 1) * STRING_SPACING + 20 : config.frets * FRET_SPACING}
                        height={isVertical ? config.frets * FRET_SPACING : (config.strings - 1) * STRING_SPACING + 20}
                        fill="var(--fretboard-wood)" stroke="none"
                    />

                    {/* Strings */}
                    {Array.from({ length: config.strings }).map((_, i) => {
                        if (isVertical) {
                            const lx = PADDING_Y + ((config.strings - 1) - i) * STRING_SPACING;
                            return <line key={i} x1={lx} y1={PADDING_X} x2={lx} y2={svgHeight - PADDING_X} stroke="var(--string-color)" strokeWidth={3} />;
                        }
                        return <line key={i} x1={PADDING_X} y1={PADDING_Y + i * STRING_SPACING} x2={svgWidth - PADDING_X} y2={PADDING_Y + i * STRING_SPACING} stroke="var(--string-color)" strokeWidth={3} />;
                    })}

                    {/* Frets */}
                    {Array.from({ length: config.frets + 1 }).map((_, i) => {
                        const isNut = i === 0 && config.startFret === 1 && config.showNut !== false;
                        if (isVertical) {
                            const ly = PADDING_X + i * FRET_SPACING;
                            return <line key={i} x1={PADDING_Y - 1.5} y1={ly} x2={svgWidth - PADDING_Y + 1.5} y2={ly} stroke={isNut ? 'var(--nut-color)' : 'var(--fret-wire)'} strokeWidth={isNut ? 14 : 2} strokeLinecap="butt" />;
                        }
                        const lx = PADDING_X + i * FRET_SPACING;
                        return <line key={i} x1={lx} y1={PADDING_Y - 1.5} x2={lx} y2={svgHeight - PADDING_Y + 1.5} stroke={isNut ? 'var(--nut-color)' : 'var(--fret-wire)'} strokeWidth={isNut ? 14 : 2} strokeLinecap="butt" />;
                    })}

                    {/* Inlays */}
                    {config.showInlays !== false && Array.from({ length: config.frets }).map((_, i) => {
                        const fretNum = config.startFret + i;
                        if (!INLAYS.includes(fretNum)) return null;
                        const isDouble = DOUBLE_INLAYS.includes(fretNum);
                        const xH = PADDING_X + i * FRET_SPACING + FRET_SPACING / 2;
                        const yH = boardHeight / 2;
                        const mid = (config.strings - 1) / 2;
                        return (
                            <g key={i} style={{ opacity: 0.8, pointerEvents: 'none' }}>
                                {isDouble ? (
                                    isVertical
                                        ? <><circle cx={PADDING_Y + (mid - 1) * STRING_SPACING} cy={xH} r={12} fill="#d4d4d8" /><circle cx={PADDING_Y + (mid + 1) * STRING_SPACING} cy={xH} r={12} fill="#d4d4d8" /></>
                                        : <><circle cx={xH} cy={PADDING_Y + (mid - 1) * STRING_SPACING} r={12} fill="#d4d4d8" /><circle cx={xH} cy={PADDING_Y + (mid + 1) * STRING_SPACING} r={12} fill="#d4d4d8" /></>
                                ) : (
                                    <circle cx={isVertical ? yH : xH} cy={isVertical ? xH : yH} r={12} fill="#d4d4d8" />
                                )}
                            </g>
                        );
                    })}

                    {/* Fret numbers */}
                    {config.showFretNumbers !== false && Array.from({ length: config.frets }).map((_, i) => {
                        const fs = 16 / Math.pow(isScrollMode ? 1 : scale, 0.5);
                        if (isVertical) {
                            return <text key={i} x={PADDING_Y - 30} y={PADDING_X + i * FRET_SPACING + FRET_SPACING / 2 + 6} textAnchor="end" fill="var(--text-secondary)" fontSize={fs} fontWeight="bold" fontFamily="inherit" style={{ pointerEvents: 'none', userSelect: 'none' }}>{config.startFret + i}</text>;
                        }
                        return <text key={i} x={PADDING_X + i * FRET_SPACING + FRET_SPACING / 2} y={svgHeight - PADDING_Y + 45} textAnchor="middle" fill="var(--text-secondary)" fontSize={fs} fontWeight="bold" fontFamily="inherit" style={{ pointerEvents: 'none', userSelect: 'none' }}>{config.startFret + i}</text>;
                    })}

                    {/* Split clipPaths */}
                    <defs>
                        {marks.filter(m => m.color2).map(mark => {
                            const { x } = getCoordinates(mark.stringIndex, mark.fretIndex);
                            const id = `sc-${diagramIndex}-${mark.stringIndex}-${mark.fretIndex}`;
                            return <clipPath key={id} id={id}><rect x={x - 30} y={-9999} width={30} height={99999} /></clipPath>;
                        })}
                    </defs>

                    {/* Marks */}
                    <AnimatePresence>
                        {marks.map(mark => {
                            const { x, y } = getCoordinates(mark.stringIndex, mark.fretIndex);
                            const clipId = `sc-${diagramIndex}-${mark.stringIndex}-${mark.fretIndex}`;
                            const hasSplit = !!mark.color2;

                            const shape = (color, clip = null) => {
                                const p = clip ? { clipPath: `url(#${clip})` } : {};
                                if (mark.shape === 'circle')   return <circle   cx={x} cy={y} r={21} fill={color} {...p} />;
                                if (mark.shape === 'square')   return <rect     x={x-21} y={y-21} width={42} height={42} rx={6} fill={color} {...p} />;
                                if (mark.shape === 'triangle') return <polygon  points={`${x},${y-24} ${x-21},${y+18} ${x+21},${y+18}`} fill={color} {...p} />;
                                if (mark.shape === 'star')     return <polygon  points={`${x},${y-27} ${x+8},${y-8} ${x+27},${y-8} ${x+12},${y+8} ${x+18},${y+27} ${x},${y+15} ${x-18},${y+27} ${x-12},${y+8} ${x-27},${y-8} ${x-8},${y-8}`} fill={color} {...p} />;
                                if (mark.shape === 'pentagon') return <polygon  points={`${x},${y-24} ${x+22},${y-7} ${x+15},${y+24} ${x-15},${y+24} ${x-22},${y-7}`} fill={color} {...p} />;
                                if (mark.shape === 'cross')    return <polygon  points={`${x-8},${y-24} ${x+8},${y-24} ${x+8},${y-8} ${x+24},${y-8} ${x+24},${y+8} ${x+8},${y+8} ${x+8},${y+24} ${x-8},${y+24} ${x-8},${y+8} ${x-24},${y+8} ${x-24},${y-8} ${x-8},${y-8}`} fill={color} transform={`rotate(45,${x},${y})`} {...p} />;
                                return null;
                            };

                            return (
                                <MarkEl key={mark.id || `${mark.stringIndex}-${mark.fretIndex}`} {...mProps}>
                                    {hasSplit ? <>{shape(mark.color2)}{shape(mark.color, clipId)}</> : shape(mark.color)}
                                    {mark.text && (
                                        <text x={x} y={y} dy="0.35em" textAnchor="middle" fill="white" fontSize="14"
                                            style={{ fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)', pointerEvents: 'none', userSelect: 'none' }}>
                                            {mark.text}
                                        </text>
                                    )}
                                </MarkEl>
                            );
                        })}
                    </AnimatePresence>
                </svg>

                {/* Label editor */}
                {interactive && editingMark && editingMark.diagramIndex === diagramIndex && (() => {
                    const { x, y } = getCoordinates(editingMark.stringIndex, editingMark.fretIndex);
                    return (
                        <div style={{ position: 'absolute', left: x, top: y - 24, transform: 'translate(-50%,-50%)', zIndex: 50 }}>
                            <input
                                autoFocus
                                className="mark-text-input"
                                defaultValue={editingMark.initialText}
                                onFocus={e => e.target.select()}
                                onBlur={e => {
                                    onUpdateMarkText(editingMark.diagramIndex, editingMark.stringIndex, editingMark.fretIndex, e.target.value);
                                    setEditingMark(null);
                                    wasEditing.current = true;
                                    setTimeout(() => { wasEditing.current = false; }, 200);
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') e.target.blur();
                                    if (e.key === 'Escape') setEditingMark(null);
                                }}
                            />
                        </div>
                    );
                })()}
            </div>
        );
    };

    // ── Shared chord name input style ──────────────────────────────────────

    const chordInputStyle = {
        fontSize: `${2 / Math.pow(isScrollMode ? 1 : scale, 0.5)}rem`,
        fontWeight: 'bold',
        textAlign: 'center',
        border: '2px solid #000',
        borderRadius: '4px',
        background: 'transparent',
        color: 'var(--text-primary)',
        marginBottom: '1rem',
        width: '100%',
        maxWidth: '600px',
        outline: 'none',
        padding: '0.5rem',
        lineHeight: '1.5',
        userSelect: 'none',
        transition: 'all 0.2s ease-out',
    };

    // ── SCROLL MODE ────────────────────────────────────────────────────────

    if (isScrollMode) {
        return (
            <div className="fretboard-container" ref={containerRef}>

                {/* Off-screen download target — all rows stacked, captured by export */}
                <div
                    ref={contentRef}
                    className="actual-download-target"
                    style={{
                        position: 'absolute', left: '-9999px', top: 0,
                        pointerEvents: 'none',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '20px', background: '#ffffff',
                    }}
                >
                    <input readOnly value={chordName} style={{ ...chordInputStyle, fontSize: '2rem' }} />
                    {diagrams.map((d, i) => renderSVG(d, i, false, true))}
                </div>

                {/* Visible editing view — one row at a time */}
                <div className="scroll-mode-view" ref={scrollViewRef}>
                    <div className="scroll-mode-stage">
                        {/* Row number indicator — NOT inside actual-download-target */}
                        {diagrams.length > 1 && (
                            <div className="scroll-row-indicator">
                                <span className="scroll-row-current">{currentPage + 1}</span>
                                <span className="scroll-row-sep">/</span>
                                <span className="scroll-row-total">{diagrams.length}</span>
                            </div>
                        )}

                        {/* Column: title + fretboard, so title centers over the fretboard only */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <input
                                value={chordName}
                                onChange={e => setChordName(e.target.value)}
                                placeholder="Click to Edit"
                                style={{ ...chordInputStyle, fontSize: '2rem', width: svgWidth }}
                            />
                            <div style={{ position: 'relative' }}>
                                {renderSVG(diagrams[currentPage], currentPage, true, false)}
                            </div>
                        </div>
                    </div>

                    {diagrams.length > 1 && (
                        <div className="scroll-hint">↕ scroll to switch rows</div>
                    )}
                </div>
            </div>
        );
    }

    // ── FIT MODE ───────────────────────────────────────────────────────────

    // CSS transform doesn't affect layout — compensate with negative bottom margin
    const marginFix = contentNaturalHeight * (scale - 1);

    return (
        <div className="fretboard-container" ref={containerRef}>
            <div className="fretboard-scroll-area" style={{ justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                <div style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    marginBottom: `${marginFix}px`,
                    transition: 'transform 0.2s ease-out',
                    flexShrink: 0,
                }}>
                    <div
                        ref={contentRef}
                        className="actual-download-target"
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', background: 'var(--bg-main,#ffffff)' }}
                    >
                        <input
                            value={chordName}
                            onChange={e => setChordName(e.target.value)}
                            placeholder="Click to Edit"
                            style={chordInputStyle}
                        />
                        {diagrams.map((d, i) => renderSVG(d, i, true, true))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Fretboard;
