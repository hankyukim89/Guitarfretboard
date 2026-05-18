import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import './Fretboard.css';

const STRING_SPACING = 50;
const FRET_SPACING = 120;
const PADDING_X = 100;
const PADDING_Y = 60;

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
    isLoadSidebarOpen,
    isMainModalOpen
}) => {
    const svgRefs = useRef([]);
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const wasEditing = useRef(false);
    const [editingMark, setEditingMark] = useState(null);
    const [scale, setScale] = useState(1);
    const [contentNaturalHeight, setContentNaturalHeight] = useState(0);

    const isVertical = config.orientation === 'vertical';

    const boardWidth = config.frets * FRET_SPACING + PADDING_X * 2;
    const boardHeight = (config.strings - 1) * STRING_SPACING + PADDING_Y * 2;

    const svgWidth = isVertical ? boardHeight : boardWidth;
    const svgHeight = isVertical ? boardWidth : boardHeight;

    const GAP = 12;

    // Measure content height so we can fix the CSS-transform whitespace problem
    React.useLayoutEffect(() => {
        if (contentRef.current) {
            setContentNaturalHeight(contentRef.current.offsetHeight);
        }
    });

    // Auto-scale (fit mode only)
    React.useLayoutEffect(() => {
        if (zoomMode !== 'fit') { setScale(1); return; }

        const updateScale = () => {
            if (!containerRef.current || !contentRef.current) return;
            const availableWidth = containerRef.current.clientWidth - 80;
            const availableHeight = containerRef.current.clientHeight - 40;
            const naturalWidth = contentRef.current.offsetWidth || svgWidth + 40;
            const naturalHeight = contentRef.current.offsetHeight || svgHeight * diagrams.length + 80;
            setScale(Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight, 1));
        };

        const observer = new ResizeObserver(updateScale);
        if (containerRef.current) observer.observe(containerRef.current);
        updateScale();
        return () => observer.disconnect();
    }, [diagrams.length, svgWidth, svgHeight, isLoadSidebarOpen, zoomMode]);

    const getCoordinates = (stringIdx, fretIdx) => {
        let x, y;
        if (fretIdx < 0) {
            x = PADDING_X - 40;
            y = PADDING_Y + stringIdx * STRING_SPACING;
        } else {
            x = PADDING_X + fretIdx * FRET_SPACING + (FRET_SPACING / 2);
            y = PADDING_Y + stringIdx * STRING_SPACING;
        }
        if (isVertical) {
            const flippedStringIdx = (config.strings - 1) - stringIdx;
            return { x: PADDING_Y + flippedStringIdx * STRING_SPACING, y: x };
        }
        return { x, y };
    };

    const computeIndices = (e, diagramIndex) => {
        const svgEl = svgRefs.current[diagramIndex];
        if (!svgEl) return null;
        const rect = svgEl.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) / scale;
        const clickY = (e.clientY - rect.top) / scale;

        let stringIdx, visualFretIdx;
        if (isVertical) {
            let flippedStringIdx = Math.round((clickX - PADDING_Y) / STRING_SPACING);
            stringIdx = (config.strings - 1) - flippedStringIdx;
            visualFretIdx = Math.floor((clickY - PADDING_X) / FRET_SPACING);
        } else {
            stringIdx = Math.round((clickY - PADDING_Y) / STRING_SPACING);
            visualFretIdx = Math.floor((clickX - PADDING_X) / FRET_SPACING);
        }

        if (stringIdx < 0) stringIdx = 0;
        if (stringIdx >= config.strings) stringIdx = config.strings - 1;
        const minFretIdx = config.startFret === 1 ? -1 : 0;
        if (visualFretIdx < minFretIdx) visualFretIdx = minFretIdx;
        if (visualFretIdx >= config.frets) visualFretIdx = config.frets - 1;

        return { stringIdx, visualFretIdx };
    };

    const handleClick = (e, diagramIndex) => {
        if (editingMark || wasEditing.current) {
            setEditingMark(null);
            wasEditing.current = false;
            return;
        }
        const result = computeIndices(e, diagramIndex);
        if (!result) return;
        onToggleMark(diagramIndex, result.stringIdx, result.visualFretIdx);
    };

    const handleContextMenu = (e, diagramIndex) => {
        e.preventDefault();
        const result = computeIndices(e, diagramIndex);
        if (!result) return;
        const { stringIdx, visualFretIdx } = result;
        const mark = diagrams[diagramIndex].marks.find(
            m => m.stringIndex === stringIdx && m.fretIndex === visualFretIdx
        );
        if (mark) {
            setEditingMark({ diagramIndex, stringIndex: stringIdx, fretIndex: visualFretIdx, initialText: mark.text });
        } else {
            onToggleMark(diagramIndex, stringIdx, visualFretIdx, 'cross');
        }
    };

    const renderFretboardSVG = (diagram, diagramIndex) => {
        const marks = diagram.marks;
        return (
            <div
                key={diagram.id}
                style={{ position: 'relative', marginBottom: diagramIndex < diagrams.length - 1 ? `${GAP}px` : 0 }}
            >
                <svg
                    ref={el => svgRefs.current[diagramIndex] = el}
                    width={svgWidth}
                    height={svgHeight}
                    onClick={(e) => handleClick(e, diagramIndex)}
                    onContextMenu={(e) => handleContextMenu(e, diagramIndex)}
                    className="fretboard-svg"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Background */}
                    <rect
                        x={isVertical ? PADDING_Y - 10 : PADDING_X}
                        y={isVertical ? PADDING_X : PADDING_Y - 10}
                        width={isVertical ? (config.strings - 1) * STRING_SPACING + 20 : config.frets * FRET_SPACING}
                        height={isVertical ? config.frets * FRET_SPACING : (config.strings - 1) * STRING_SPACING + 20}
                        fill="var(--fretboard-wood)"
                        stroke="none"
                    />

                    {/* Strings */}
                    {Array.from({ length: config.strings }).map((_, i) => {
                        if (isVertical) {
                            const flippedI = (config.strings - 1) - i;
                            const lineX = PADDING_Y + flippedI * STRING_SPACING;
                            return (
                                <line key={`s-${i}`} x1={lineX} y1={PADDING_X} x2={lineX} y2={svgHeight - PADDING_X}
                                    stroke="var(--string-color)" strokeWidth={3} />
                            );
                        }
                        return (
                            <line key={`s-${i}`} x1={PADDING_X} y1={PADDING_Y + i * STRING_SPACING} x2={svgWidth - PADDING_X} y2={PADDING_Y + i * STRING_SPACING}
                                stroke="var(--string-color)" strokeWidth={3} />
                        );
                    })}

                    {/* Frets */}
                    {Array.from({ length: config.frets + 1 }).map((_, i) => {
                        const isNut = i === 0 && config.startFret === 1 && config.showNut !== false;
                        if (isVertical) {
                            const lineY = PADDING_X + i * FRET_SPACING;
                            return (
                                <line key={`f-${i}`} x1={PADDING_Y - 1.5} y1={lineY} x2={svgWidth - PADDING_Y + 1.5} y2={lineY}
                                    stroke={isNut ? "var(--nut-color)" : "var(--fret-wire)"}
                                    strokeWidth={isNut ? 14 : 2} strokeLinecap="butt" />
                            );
                        }
                        return (
                            <line key={`f-${i}`} x1={PADDING_X + i * FRET_SPACING} y1={PADDING_Y - 1.5} x2={PADDING_X + i * FRET_SPACING} y2={svgHeight - PADDING_Y + 1.5}
                                stroke={isNut ? "var(--nut-color)" : "var(--fret-wire)"}
                                strokeWidth={isNut ? 14 : 2} strokeLinecap="butt" />
                        );
                    })}

                    {/* Inlays */}
                    {config.showInlays !== false && Array.from({ length: config.frets }).map((_, i) => {
                        const fretNum = config.startFret + i;
                        if (!INLAYS.includes(fretNum)) return null;
                        const isDouble = DOUBLE_INLAYS.includes(fretNum);
                        const xHoriz = PADDING_X + i * FRET_SPACING + FRET_SPACING / 2;
                        const yHoriz = boardHeight / 2;
                        return (
                            <g key={`inlay-${i}`} style={{ opacity: 0.8, pointerEvents: 'none' }}>
                                {isDouble ? (() => {
                                    const midString = (config.strings - 1) / 2;
                                    const cy1 = PADDING_Y + (midString - 1) * STRING_SPACING;
                                    const cy2 = PADDING_Y + (midString + 1) * STRING_SPACING;
                                    if (isVertical) return (<><circle cx={cy1} cy={xHoriz} r={12} fill="#d4d4d8" /><circle cx={cy2} cy={xHoriz} r={12} fill="#d4d4d8" /></>);
                                    return (<><circle cx={xHoriz} cy={cy1} r={12} fill="#d4d4d8" /><circle cx={xHoriz} cy={cy2} r={12} fill="#d4d4d8" /></>);
                                })() : (
                                    <circle cx={isVertical ? yHoriz : xHoriz} cy={isVertical ? xHoriz : yHoriz} r={12} fill="#d4d4d8" />
                                )}
                            </g>
                        );
                    })}

                    {/* Fret Numbers */}
                    {config.showFretNumbers !== false && Array.from({ length: config.frets }).map((_, i) => {
                        if (isVertical) {
                            return (
                                <text key={`fn-${i}`}
                                    x={PADDING_Y - 30} y={PADDING_X + i * FRET_SPACING + FRET_SPACING / 2 + 6}
                                    textAnchor="end" fill="var(--text-secondary)"
                                    fontSize={16 / Math.pow(scale, 0.5)} fontWeight="bold" fontFamily="inherit"
                                    style={{ pointerEvents: 'none', userSelect: 'none', transition: 'all 0.2s ease-out' }}>
                                    {config.startFret + i}
                                </text>
                            );
                        }
                        return (
                            <text key={`fn-${i}`}
                                x={PADDING_X + i * FRET_SPACING + FRET_SPACING / 2}
                                y={svgHeight - PADDING_Y + 45}
                                textAnchor="middle" fill="var(--text-secondary)"
                                fontSize={16 / Math.pow(scale, 0.5)} fontWeight="bold" fontFamily="inherit"
                                style={{ pointerEvents: 'none', userSelect: 'none', transition: 'all 0.2s ease-out' }}>
                                {config.startFret + i}
                            </text>
                        );
                    })}

                    {/* Split-Color ClipPaths */}
                    <defs>
                        {marks.filter(m => m.color2).map((mark) => {
                            const { x } = getCoordinates(mark.stringIndex, mark.fretIndex);
                            const clipId = `split-clip-${diagramIndex}-${mark.stringIndex}-${mark.fretIndex}`;
                            return (
                                <clipPath key={clipId} id={clipId}>
                                    <rect x={x - 30} y={-9999} width={30} height={99999} />
                                </clipPath>
                            );
                        })}
                    </defs>

                    {/* Marks */}
                    <AnimatePresence>
                        {marks.map((mark) => {
                            const { x, y } = getCoordinates(mark.stringIndex, mark.fretIndex);
                            const hasSplit = !!mark.color2;
                            const clipId = `split-clip-${diagramIndex}-${mark.stringIndex}-${mark.fretIndex}`;

                            const renderShape = (color, clipPath = null) => {
                                const props = clipPath ? { clipPath: `url(#${clipPath})` } : {};
                                if (mark.shape === 'circle') return <circle cx={x} cy={y} r={21} fill={color} {...props} />;
                                if (mark.shape === 'square') return <rect x={x - 21} y={y - 21} width={42} height={42} rx={6} fill={color} {...props} />;
                                if (mark.shape === 'triangle') return <polygon points={`${x},${y - 24} ${x - 21},${y + 18} ${x + 21},${y + 18}`} fill={color} {...props} />;
                                if (mark.shape === 'star') return <polygon points={`${x},${y - 27} ${x + 8},${y - 8} ${x + 27},${y - 8} ${x + 12},${y + 8} ${x + 18},${y + 27} ${x},${y + 15} ${x - 18},${y + 27} ${x - 12},${y + 8} ${x - 27},${y - 8} ${x - 8},${y - 8}`} fill={color} {...props} />;
                                if (mark.shape === 'pentagon') return <polygon points={`${x},${y - 24} ${x + 22},${y - 7} ${x + 15},${y + 24} ${x - 15},${y + 24} ${x - 22},${y - 7}`} fill={color} {...props} />;
                                if (mark.shape === 'cross') return <polygon points={`${x - 8},${y - 24} ${x + 8},${y - 24} ${x + 8},${y - 8} ${x + 24},${y - 8} ${x + 24},${y + 8} ${x + 8},${y + 8} ${x + 8},${y + 24} ${x - 8},${y + 24} ${x - 8},${y + 8} ${x - 24},${y + 8} ${x - 24},${y - 8} ${x - 8},${y - 8}`} fill={color} transform={`rotate(45, ${x}, ${y})`} {...props} />;
                                return null;
                            };

                            return (
                                <motion.g
                                    key={`${mark.stringIndex}-${mark.fretIndex}`}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                >
                                    {hasSplit ? (
                                        <>
                                            {renderShape(mark.color2)}
                                            {renderShape(mark.color, clipId)}
                                        </>
                                    ) : (
                                        renderShape(mark.color)
                                    )}
                                    {mark.text && (
                                        <text x={x} y={y} dy="0.35em" textAnchor="middle" fill="white" fontSize="14"
                                            style={{ fontWeight: "bold", textShadow: "0px 1px 2px rgba(0,0,0,0.8)", pointerEvents: "none", userSelect: "none" }}>
                                            {mark.text}
                                        </text>
                                    )}
                                </motion.g>
                            );
                        })}
                    </AnimatePresence>
                </svg>

                {/* Label editor overlay */}
                {editingMark && editingMark.diagramIndex === diagramIndex && (() => {
                    const { x, y } = getCoordinates(editingMark.stringIndex, editingMark.fretIndex);
                    return (
                        <div style={{ position: 'absolute', left: x, top: y - 24, transform: 'translate(-50%, -50%)', zIndex: 50 }}>
                            <input
                                autoFocus
                                className="mark-text-input"
                                defaultValue={editingMark.initialText}
                                onFocus={(e) => e.target.select()}
                                onBlur={(e) => {
                                    onUpdateMarkText(editingMark.diagramIndex, editingMark.stringIndex, editingMark.fretIndex, e.target.value);
                                    setEditingMark(null);
                                    wasEditing.current = true;
                                    setTimeout(() => { wasEditing.current = false; }, 200);
                                }}
                                onKeyDown={(e) => {
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

    // CSS transform doesn't affect layout, so we compensate with a negative bottom margin
    // so there's no dead whitespace below the visually scaled content.
    const marginFix = zoomMode === 'fit' ? contentNaturalHeight * (scale - 1) : 0;

    const isScrollMode = zoomMode === 'scroll';

    return (
        <div className="fretboard-container" ref={containerRef}>
            <div
                className="fretboard-scroll-area fretboard-download-area"
                style={isScrollMode
                    ? { justifyContent: 'flex-start', alignItems: 'center', overflowY: 'auto' }
                    : { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }
                }
            >
                <div style={{
                    transform: isScrollMode ? 'none' : `scale(${scale})`,
                    transformOrigin: 'top center',
                    marginBottom: `${marginFix}px`,
                    transition: 'transform 0.2s ease-out',
                    flexShrink: 0,
                }}>
                    <div
                        ref={contentRef}
                        className="actual-download-target"
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '20px', background: 'var(--bg-main, #ffffff)' }}
                    >
                        {/* Single chord name at the top */}
                        <input
                            value={chordName}
                            onChange={(e) => setChordName(e.target.value)}
                            placeholder="Click to Edit"
                            style={{
                                fontSize: `${2 / Math.pow(scale, 0.5)}rem`,
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
                                transition: 'all 0.2s ease-out'
                            }}
                        />

                        {/* All fretboard rows stacked */}
                        {diagrams.map((diagram, idx) => renderFretboardSVG(diagram, idx))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Fretboard;
