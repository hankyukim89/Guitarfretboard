import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Fretboard.css';

const STRING_SPACING = 50;
const FRET_SPACING = 100;
const PADDING_X = 60; // Left padding for nut/start
const PADDING_Y = 40; // Top/bottom padding

// Standard single/double dot positions (0-indexed frets from nut)
const INLAYS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const DOUBLE_INLAYS = [12, 24];

const Fretboard = ({ config, marks, onToggleMark, onUpdateMarkText }) => {
    const svgRef = useRef(null);
    const [editingMark, setEditingMark] = useState(null); // { string, fret }

    // Calculate dimensions
    const width = config.frets * FRET_SPACING + PADDING_X * 2;
    const height = (config.strings - 1) * STRING_SPACING + PADDING_Y * 2;

    const getCoordinates = (stringIdx, fretIdx) => {
        // stringIdx: 0 is top (High E), config.strings-1 is bottom (Low E)
        // fretIdx: 0 is "open" area (before nut) if we support it, 1 is first fret column...
        // Actually, let's say fretIdx starts at 0 (leftmost column in view).
        // If startFret=1, fretIdx 0 is "Fret 1" area.
        // X position should be centered in the fret space.

        // In diagram view:
        // Vertical lines at: PADDING_X, PADDING_X + FRET_SPACING, ...
        // Mark should be centered between i and i+1 lines.

        // Special case for open strings (fretIdx = -1)
        if (fretIdx < 0) {
            const x = PADDING_X - 25; // 25px to the left of the nut
            const y = PADDING_Y + stringIdx * STRING_SPACING;
            return { x, y };
        }

        const x = PADDING_X + fretIdx * FRET_SPACING + (FRET_SPACING / 2);
        const y = PADDING_Y + stringIdx * STRING_SPACING;
        return { x, y };
    };

    const handleClick = (e) => {
        // If editing text, stop.
        if (editingMark) {
            setEditingMark(null);
            return;
        }

        const rect = svgRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Inverse calculate
        // y = PADDING_Y + sIdx * SPACING => sIdx = (y - PADDING_Y) / SPACING
        let stringIdx = Math.round((clickY - PADDING_Y) / STRING_SPACING);

        // x = PADDING_X + fIdx * SPACING - SPACING/2 => fIdx ...
        // Actually simpler:
        // The fret "columns" are [PADDING_X, PADDING_X + FRET_SPACING].
        // Marks are at 0.5, 1.5, 2.5...
        // Let's find which fret interval clickX falls into.
        // Interval 0 (Fret 1 if start=1): PADDING_X - FRET_SPACING to PADDING_X? No.
        // Let's assume the Fretboard starts at x = PADDING_X (Left vertical line).
        // The area for "Fret N" is between x and x + FRET_SPACING.
        // So fretIdx = floor((clickX - PADDING_X) / FRET_SPACING) + 1. (1-indexed for internal logic?)

        // Let's standarize: 
        // Visual columns are 0, 1, 2... up to config.frets-1.
        // "Fret Value" = config.startFret + visualColumnIndex.

        let visualFretIdx = Math.floor((clickX - PADDING_X) / FRET_SPACING);

        // Clamp
        if (stringIdx < 0) stringIdx = 0;
        if (stringIdx >= config.strings) stringIdx = config.strings - 1;

        // Allow Fret 0 (visual -1) if startFret is 1
        const minFretIdx = config.startFret === 1 ? -1 : 0;

        if (visualFretIdx < minFretIdx) visualFretIdx = minFretIdx;
        if (visualFretIdx >= config.frets) visualFretIdx = config.frets - 1;

        onToggleMark(stringIdx, visualFretIdx);
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        const rect = svgRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        let stringIdx = Math.round((clickY - PADDING_Y) / STRING_SPACING);
        let visualFretIdx = Math.floor((clickX - PADDING_X) / FRET_SPACING);

        // Check if mark exists
        const mark = marks.find(m => m.stringIndex === stringIdx && m.fretIndex === visualFretIdx);
        if (mark) {
            setEditingMark({ stringIndex: stringIdx, fretIndex: visualFretIdx, initialText: mark.text });
        }
    };

    return (
        <div className="fretboard-container">
            <div className="fretboard-scroll-area">
                <svg
                    ref={svgRef}
                    width={width}
                    height={height}
                    onClick={handleClick}
                    onContextMenu={handleContextMenu}
                    className="fretboard-svg"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Defs for shadows etc */}
                    <defs>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Fretboard Background (Wood) */}
                    <rect
                        x={PADDING_X}
                        y={PADDING_Y - 10}
                        width={config.frets * FRET_SPACING}
                        height={(config.strings - 1) * STRING_SPACING + 20}
                        fill="#1e1e1e" // Dark board
                        stroke="none"
                    />

                    {/* Frets (Vertical Lines) */}
                    {Array.from({ length: config.frets + 1 }).map((_, i) => (
                        <line
                            key={`line-v-${i}`}
                            x1={PADDING_X + i * FRET_SPACING}
                            y1={PADDING_Y}
                            x2={PADDING_X + i * FRET_SPACING}
                            y2={height - PADDING_Y}
                            stroke={i === 0 && config.startFret === 1 ? "#e2e8f0" : "#64748b"} // Nut is bright, frets are distinct gray
                            strokeWidth={
                                (i === 0 && config.startFret === 1) ? 8 : 2
                            }
                            strokeLinecap="square"
                        />
                    ))}

                    {/* Strings (Horizontal Lines) */}
                    {Array.from({ length: config.strings }).map((_, i) => (
                        <line
                            key={`line-h-${i}`}
                            x1={PADDING_X - (config.startFret === 1 ? 40 : 0)}
                            y1={PADDING_Y + i * STRING_SPACING}
                            x2={width - PADDING_X}
                            y2={PADDING_Y + i * STRING_SPACING}
                            stroke="#e2e8f0" // Much brighter strings
                            strokeWidth={1 + i * 0.6}
                            style={{ opacity: 0.8 }}
                        />
                    ))}

                    {/* Inlays (Dots) */}
                    {Array.from({ length: config.frets }).map((_, i) => {
                        const fretNum = config.startFret + i;
                        if (!INLAYS.includes(fretNum)) return null;
                        const isDouble = DOUBLE_INLAYS.includes(fretNum);
                        const x = PADDING_X + i * FRET_SPACING + FRET_SPACING / 2;
                        const y = height / 2; // Center of board vertically? Or on specific strings?
                        // Usually centered on board for standard inlays.

                        return (
                            <g key={`inlay-${i}`} style={{ opacity: 0.3, pointerEvents: 'none' }}>
                                {isDouble ? (
                                    <>
                                        <circle cx={x - 15} cy={y} r={6} fill="white" />
                                        <circle cx={x + 15} cy={y} r={6} fill="white" />
                                    </>
                                ) : (
                                    <circle cx={x} cy={y} r={6} fill="white" />
                                )}
                            </g>
                        );
                    })}

                    {/* Fret Numbers (Bottom) */}
                    {Array.from({ length: config.frets }).map((_, i) => (
                        <text
                            key={`fret-num-${i}`}
                            x={PADDING_X + i * FRET_SPACING + FRET_SPACING / 2}
                            y={height - PADDING_Y + 30}
                            textAnchor="middle"
                            fill="var(--text-secondary)"
                            fontSize="12"
                            fontFamily="inherit"
                            style={{ pointerEvents: 'none' }}
                        >
                            {config.startFret + i}
                        </text>
                    ))}

                    {/* Marks */}
                    <AnimatePresence>
                        {marks.map((mark) => {
                            const { x, y } = getCoordinates(mark.stringIndex, mark.fretIndex);

                            return (
                                <motion.g
                                    key={`${mark.stringIndex}-${mark.fretIndex}`}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                >
                                    {/* Shape Rendering */}
                                    {mark.shape === 'circle' && (
                                        <circle cx={x} cy={y} r={16} fill={mark.color} filter="url(#glow)" />
                                    )}
                                    {mark.shape === 'square' && (
                                        <rect x={x - 14} y={y - 14} width={28} height={28} rx={4} fill={mark.color} filter="url(#glow)" />
                                    )}
                                    {mark.shape === 'triangle' && (
                                        <polygon
                                            points={`${x},${y - 16} ${x - 14},${y + 12} ${x + 14},${y + 12}`}
                                            fill={mark.color}
                                            filter="url(#glow)"
                                        />
                                    )}

                                    {/* Text Overlay */}
                                    {mark.text && (
                                        <text
                                            x={x}
                                            y={y}
                                            dy="0.35em"
                                            textAnchor="middle"
                                            fill="white" // Text always white? Or contrast?
                                            fontSize="14"
                                            fontWeight="bold"
                                            style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)', pointerEvents: 'none' }}
                                        >
                                            {mark.text}
                                        </text>
                                    )}
                                </motion.g>
                            );
                        })}
                    </AnimatePresence>

                </svg>

                {/* Text Editor Overlay */}
                {editingMark && (() => {
                    const { x, y } = getCoordinates(editingMark.stringIndex, editingMark.fretIndex);
                    return (
                        <div
                            style={{
                                position: 'absolute',
                                left: x,
                                top: y,
                                transform: 'translate(-50%, -50%)'
                            }}
                        >
                            <input
                                autoFocus
                                className="mark-text-input"
                                defaultValue={editingMark.initialText}
                                onBlur={() => setEditingMark(null)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        onUpdateMarkText(editingMark.stringIndex, editingMark.fretIndex, e.target.value);
                                        setEditingMark(null);
                                    }
                                    if (e.key === 'Escape') setEditingMark(null);
                                }}
                            />
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default Fretboard;
