import React, { useRef, useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import './Fretboard.css';

const STRING_SPACING = 50;
const FRET_SPACING = 120;
const PADDING_X = 100;
const PADDING_Y = 60;
const GAP = 12;

const DIAGRAM_TITLE_INPUT_PROPS = {
    type: 'text',
    autoComplete: 'off',
    inputMode: 'text',
    'data-1p-ignore': 'true',
    'data-lpignore': 'true',
    'data-bwignore': 'true',
    'data-keeper-ignore': 'true',
    'data-form-type': 'other',
};

const INLAYS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const DOUBLE_INLAYS = [12, 24];

const Fretboard = ({
    config,
    diagrams,
    onToggleMark,
    onUpdateMarkText,
    onUpdateDiagramName,
    chordName,
    setChordName,
    zoomMode,
    skipMarkAnimation,
    isGhostMode,
    onToggleGhostMark,
    onUpdateGhostMarkText,
    getMarkDisplayText,
    isLoadSidebarOpen,
}) => {
    const svgRefs = useRef([]);
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const scrollViewRef = useRef(null);
    const wasEditing = useRef(false);

    const [editingMark, setEditingMark] = useState(null);
    const [scale, setScale] = useState(1);
    const [userZoom, setUserZoom] = useState(1); // pinch / Ctrl+wheel zoom multiplier
    const [contentNaturalHeight, setContentNaturalHeight] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const visiblePage = Math.min(currentPage, Math.max(0, diagrams.length - 1));

    const isVertical = config.orientation === 'vertical';
    const isScrollMode = zoomMode === 'scroll';
    const effectiveScale = scale * userZoom;
    const useSideBySideDiagrams = isVertical && diagrams.length > 1;

    const COLUMNS_PER_LINE = 6; // vertical view wraps after 6 boards
    const boardWidth = config.frets * FRET_SPACING + PADDING_X * 2;
    const boardHeight = (config.strings - 1) * STRING_SPACING + PADDING_Y * 2;
    const svgWidth = isVertical ? boardHeight : boardWidth;
    const svgHeight = isVertical ? boardWidth : boardHeight;
    // Max strip width so the vertical side-by-side layout wraps 6 per line
    const verticalStripMaxWidth = COLUMNS_PER_LINE * svgWidth + (COLUMNS_PER_LINE - 1) * GAP * 2 + 40;

    // Measure content for whitespace fix (fit mode)
    React.useLayoutEffect(() => {
        if (contentRef.current) {
            const nextHeight = contentRef.current.offsetHeight;
            setContentNaturalHeight(current => current === nextHeight ? current : nextHeight);
        }
    }, [diagrams.length, svgWidth, svgHeight, useSideBySideDiagrams, isScrollMode]);

    // Auto-scale: both modes
    React.useLayoutEffect(() => {
        const updateScale = () => {
            if (!containerRef.current) return;
            const availableWidth = containerRef.current.clientWidth - 80;
            const availableHeight = containerRef.current.clientHeight - 40;

            if (isScrollMode) {
                // Scale a single fretboard to fit; leave ~120px for title row + margins
                const scaleX = availableWidth / svgWidth;
                const scaleY = (availableHeight - 120) / svgHeight;
                setScale(Math.min(scaleX, scaleY, 1));
            } else {
                if (!contentRef.current) return;
                const natW = contentRef.current.offsetWidth || svgWidth + 40;
                const natH = contentRef.current.offsetHeight || svgHeight * diagrams.length + 80;
                setScale(Math.min(availableWidth / natW, availableHeight / natH, 1));
            }
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
            if (e.ctrlKey) return; // pinch/Ctrl+wheel is handled by the zoom listener
            e.preventDefault();
            if (e.deltaY > 0) setCurrentPage(p => Math.min(diagrams.length - 1, p + 1));
            else setCurrentPage(p => Math.max(0, p - 1));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [isScrollMode, diagrams.length]);

    // Pinch / Ctrl+wheel zoom — trackpad pinch gestures arrive as ctrlKey wheel events
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e) => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            setUserZoom(z => Math.max(0.4, Math.min(3, z * Math.exp(-e.deltaY * 0.01))));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [isScrollMode, isVertical]);

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
        const sc = effectiveScale;
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
        if (!r) return;
        if (isGhostMode) {
            onToggleGhostMark(diagramIndex, r.stringIdx, r.visualFretIdx);
        } else {
            onToggleMark(diagramIndex, r.stringIdx, r.visualFretIdx);
        }
    };

    const handleContextMenu = (e, diagramIndex) => {
        e.preventDefault();
        const r = computeIndices(e, diagramIndex);
        if (!r) return;

        if (isGhostMode) {
            const ghostMark = (diagrams[diagramIndex].ghostMarks || []).find(
                m => m.stringIndex === r.stringIdx && m.fretIndex === r.visualFretIdx
            );
            if (ghostMark) {
                setEditingMark({ diagramIndex, stringIndex: r.stringIdx, fretIndex: r.visualFretIdx, initialText: ghostMark.text, isGhost: true });
            }
            return;
        }

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
        // Filter out marks that are outside the visible fret range
        const minFret = config.startFret === 1 ? -1 : 0;
        const marks = diagram.marks.filter(m => m.fretIndex >= minFret && m.fretIndex < config.frets);

        // Always use Motion.g so element type never changes — switching types causes
        // React to remount and framer-motion to replay entrance animations.
        // When skipMarkAnimation is true (transpose), use duration:0 for instant snap.
        const mProps = {
            initial: { scale: 0, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0, opacity: 0 },
            transition: skipMarkAnimation
                ? { duration: 0 }
                : { type: 'spring', stiffness: 300, damping: 20 }
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
                        const fs = 16 / Math.pow(scale, 0.5);
                        if (isVertical) {
                            return <text key={i} x={PADDING_Y - 30} y={PADDING_X + i * FRET_SPACING + FRET_SPACING / 2 + 6} textAnchor="end" fill="var(--text-secondary)" fontSize={fs} fontWeight="bold" fontFamily="inherit" style={{ pointerEvents: 'none', userSelect: 'none' }}>{config.startFret + i}</text>;
                        }
                        return <text key={i} x={PADDING_X + i * FRET_SPACING + FRET_SPACING / 2} y={svgHeight - PADDING_Y + 45} textAnchor="middle" fill="var(--text-secondary)" fontSize={fs} fontWeight="bold" fontFamily="inherit" style={{ pointerEvents: 'none', userSelect: 'none' }}>{config.startFret + i}</text>;
                    })}

                    {/* Ghost marks — shapes drawn first (below colored marks) */}
                    {(diagram.ghostMarks || []).filter(gm => {
                        const minFret = config.startFret === 1 ? -1 : 0;
                        return gm.fretIndex >= minFret && gm.fretIndex < config.frets;
                    }).map(gm => {
                        const { x, y } = getCoordinates(gm.stringIndex, gm.fretIndex);
                        return (
                            <circle key={`gms-${gm.id}`} cx={x} cy={y} r={21}
                                fill="rgba(128,128,128,0.12)" stroke="rgba(128,128,128,0.35)" strokeWidth={1.5} />
                        );
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
                            const displayText = getMarkDisplayText ? getMarkDisplayText(mark) : mark.text;

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
                                <Motion.g key={mark.id || `${mark.stringIndex}-${mark.fretIndex}`} {...mProps}>
                                    {hasSplit ? <>{shape(mark.color2)}{shape(mark.color, clipId)}</> : shape(mark.color)}
                                    {displayText && (
                                        <text x={x} y={y} dy="0.35em" textAnchor="middle" fill="white" fontSize="14"
                                            style={{ fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)', pointerEvents: 'none', userSelect: 'none' }}>
                                            {displayText}
                                        </text>
                                    )}
                                </Motion.g>
                            );
                        })}
                    </AnimatePresence>

                    {/* Ghost mark labels — drawn last so they show through colored marks */}
                    {(diagram.ghostMarks || []).filter(gm => {
                        const minFret = config.startFret === 1 ? -1 : 0;
                        return gm.fretIndex >= minFret && gm.fretIndex < config.frets;
                    }).map(gm => {
                        const displayText = getMarkDisplayText ? getMarkDisplayText(gm) : gm.text;
                        if (!displayText) return null;
                        const { x, y } = getCoordinates(gm.stringIndex, gm.fretIndex);
                        return (
                            <text key={`gml-${gm.id}`} x={x} y={y} dy="0.35em" textAnchor="middle"
                                fill="var(--text-primary)" fontSize="13" fontWeight="700"
                                fontFamily="inherit" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                                {displayText}
                            </text>
                        );
                    })}
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
                                    if (editingMark.isGhost) {
                                        onUpdateGhostMarkText(editingMark.diagramIndex, editingMark.stringIndex, editingMark.fretIndex, e.target.value);
                                    } else {
                                        onUpdateMarkText(editingMark.diagramIndex, editingMark.stringIndex, editingMark.fretIndex, e.target.value);
                                    }
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

    // Fixed size — does not grow with fret count or zoom scale
    const TITLE_MAX_WIDTH = 420;
    const chordInputStyle = {
        fontSize: '1.5rem',
        fontWeight: 'bold',
        textAlign: 'center',
        border: '2px solid #000',
        borderRadius: '4px',
        background: 'transparent',
        color: 'var(--text-primary)',
        marginBottom: '1rem',
        width: '100%',
        maxWidth: `${TITLE_MAX_WIDTH}px`,
        outline: 'none',
        padding: '0.35rem 0.5rem',
        lineHeight: '1.4',
        userSelect: 'none',
        transition: 'all 0.2s ease-out',
    };

    const getDiagramName = (diagram, index) => {
        if (diagram.name) return diagram.name;
        return index === 0 ? chordName : '';
    };

    const handleDiagramNameChange = (diagramIndex, value) => {
        onUpdateDiagramName?.(diagramIndex, value);
        if (diagramIndex === 0) setChordName(value);
    };

    const renderDiagramBlock = (diagram, diagramIndex, interactive = true, showGap = true) => (
        <div
            key={diagram.id}
            className={`diagram-block ${useSideBySideDiagrams ? 'diagram-block-vertical-column' : ''}`}
            style={{
                display: useSideBySideDiagrams ? 'inline-flex' : 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: useSideBySideDiagrams ? `0 0 ${svgWidth}px` : '0 0 auto',
                width: svgWidth,
                marginBottom: !useSideBySideDiagrams && showGap && diagramIndex < diagrams.length - 1 ? GAP : 0,
            }}
        >
            {(diagramIndex === 0 || config.showRowLabels) && (
                <input
                    {...DIAGRAM_TITLE_INPUT_PROPS}
                    name={`diagram-title-${diagramIndex}`}
                    aria-label={diagramIndex === 0 ? 'Diagram title' : `Row ${diagramIndex + 1} label`}
                    readOnly={!interactive}
                    value={getDiagramName(diagram, diagramIndex)}
                    onChange={interactive ? e => handleDiagramNameChange(diagramIndex, e.target.value) : undefined}
                    placeholder="Click to Edit"
                    style={{
                        ...chordInputStyle,
                        maxWidth: `${Math.min(svgWidth, TITLE_MAX_WIDTH)}px`,
                        marginBottom: '1rem',
                    }}
                />
            )}
            {renderSVG(diagram, diagramIndex, interactive, false)}
        </div>
    );

    // Small floating chip showing zoom level, with click-to-reset
    const zoomChip = userZoom !== 1 && (
        <button
            onClick={() => setUserZoom(1)}
            title="Reset zoom"
            style={{
                position: 'absolute', top: 10, right: 14, zIndex: 40,
                padding: '4px 10px', borderRadius: 999,
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-panel, #fff)', color: 'var(--text-secondary, #475569)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
        >
            {Math.round(effectiveScale * 100)}% ✕
        </button>
    );

    // ── SCROLL MODE ────────────────────────────────────────────────────────

    if (isScrollMode) {
        return (
            <div className="fretboard-container" ref={containerRef}>
                {zoomChip}

                {/* Off-screen download target — all rows stacked, captured by export */}
                <div
                    ref={contentRef}
                    className="actual-download-target"
                    style={{
                        position: 'absolute', left: '-9999px', top: 0,
                        pointerEvents: 'none',
                        display: 'flex',
                        flexDirection: useSideBySideDiagrams ? 'row' : 'column',
                        alignItems: useSideBySideDiagrams ? 'flex-start' : 'center',
                        flexWrap: useSideBySideDiagrams ? 'wrap' : 'nowrap',
                        gap: useSideBySideDiagrams ? `${GAP * 2}px` : 0,
                        width: useSideBySideDiagrams ? 'max-content' : 'auto',
                        maxWidth: useSideBySideDiagrams ? verticalStripMaxWidth : undefined,
                        padding: '20px', background: '#ffffff',
                    }}
                >
                    {diagrams.map((d, i) => renderDiagramBlock(d, i, false, true))}
                </div>

                {/* Visible editing view — one row at a time */}
                <div className="scroll-mode-view" ref={scrollViewRef}>

                    {/* Top row: nav + title, side by side */}
                    <div className="scroll-top-row">
                        {diagrams.length > 1 && (
                            <div className="scroll-nav-column">
                                <button
                                    className="scroll-nav-btn"
                                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                    disabled={visiblePage === 0}
                                    title="Previous row"
                                >▲</button>
                                <div className="scroll-row-indicator">
                                    {visiblePage + 1} / {diagrams.length}
                                </div>
                                <button
                                    className="scroll-nav-btn"
                                    onClick={() => setCurrentPage(p => Math.min(diagrams.length - 1, p + 1))}
                                    disabled={visiblePage === diagrams.length - 1}
                                    title="Next row"
                                >▼</button>
                            </div>
                        )}
                        {(visiblePage === 0 || config.showRowLabels) && (
                            <input
                                {...DIAGRAM_TITLE_INPUT_PROPS}
                                name={`diagram-title-${visiblePage}`}
                                aria-label={visiblePage === 0 ? 'Diagram title' : `Row ${visiblePage + 1} label`}
                                value={getDiagramName(diagrams[visiblePage], visiblePage)}
                                onChange={e => handleDiagramNameChange(visiblePage, e.target.value)}
                                placeholder="Click to Edit"
                                style={{ ...chordInputStyle, marginBottom: 0 }}
                            />
                        )}
                    </div>

                    {/* Fretboard below — scaled to fit, same as fit mode */}
                    <div style={{
                        position: 'relative',
                        marginTop: '1rem',
                        transform: `scale(${effectiveScale})`,
                        transformOrigin: 'top center',
                        marginBottom: `${svgHeight * (effectiveScale - 1)}px`,
                    }}>
                        {renderSVG(diagrams[visiblePage], visiblePage, true, false)}
                    </div>

                </div>
            </div>
        );
    }

    // ── FIT MODE ───────────────────────────────────────────────────────────

    // CSS transform doesn't affect layout — compensate with negative bottom margin
    const marginFix = contentNaturalHeight * (effectiveScale - 1);

    if (isVertical) {
        return (
            <div className="fretboard-container" ref={containerRef}>
                {zoomChip}
                <div
                className="fretboard-scroll-area vertical-fit-scroll-area"
                style={{
                    justifyContent: 'flex-start',
                    alignItems: 'flex-start',
                    overflow: 'auto',
                }}
                >
                    <div
                        style={{
                            transform: `scale(${effectiveScale})`,
                            transformOrigin: 'top left',
                            marginBottom: `${marginFix}px`,
                            transition: 'transform 0.2s ease-out',
                            flexShrink: 0,
                        }}
                    >
                        <div
                            ref={contentRef}
                            className="actual-download-target vertical-diagram-strip"
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                alignItems: 'start',
                                gap: `${GAP * 2}px`,
                                width: 'max-content',
                                maxWidth: verticalStripMaxWidth,
                                padding: '20px',
                                background: 'var(--bg-main,#ffffff)'
                            }}
                        >
                            {diagrams.map((d, i) => renderDiagramBlock(d, i, true, false))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fretboard-container" ref={containerRef}>
            {zoomChip}
            <div
                className="fretboard-scroll-area"
                style={userZoom > 1
                    ? { justifyContent: 'flex-start', alignItems: 'flex-start', overflow: 'auto' }
                    : { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}
            >
                <div style={{
                    transform: `scale(${effectiveScale})`,
                    transformOrigin: userZoom > 1 ? 'top left' : 'top center',
                    marginBottom: `${marginFix}px`,
                    transition: 'transform 0.2s ease-out',
                    flexShrink: 0,
                }}>
                    <div
                        ref={contentRef}
                        className="actual-download-target"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0,
                            width: 'auto',
                            padding: '20px',
                            background: 'var(--bg-main,#ffffff)'
                        }}
                    >
                        {diagrams.map((d, i) => renderDiagramBlock(d, i, true, true))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Fretboard;
