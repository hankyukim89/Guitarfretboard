import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Fretboard.css';

const STRING_SPACING = 50;
const FRET_SPACING = 120;
const PADDING_X = 60; // Left padding for nut/start
const PADDING_Y = 40; // Top/bottom padding

// Standard single/double dot positions (0-indexed frets from nut)
const INLAYS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const DOUBLE_INLAYS = [12, 24];

const Fretboard = ({ config, marks, onToggleMark, onUpdateMarkText, chordName, setChordName }) => {
    const svgRef = useRef(null);
    const [editingMark, setEditingMark] = useState(null); // { string, fret }

    // Calculate dimensions
    const width = config.frets * FRET_SPACING + PADDING_X * 2;
    const height = (config.strings - 1) * STRING_SPACING + PADDING_Y * 2;

    const getCoordinates = (stringIdx, fretIdx) => {
        // stringIdx: 0 is top (High E), config.strings-1 is bottom (Low E)
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
        if (editingMark) {
            setEditingMark(null);
            return;
        }

        const rect = svgRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        let stringIdx = Math.round((clickY - PADDING_Y) / STRING_SPACING);
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

        const mark = marks.find(m => m.stringIndex === stringIdx && m.fretIndex === visualFretIdx);
        if (mark) {
            setEditingMark({ stringIndex: stringIdx, fretIndex: visualFretIdx, initialText: mark.text });
        }
    };

    return (
        <div className="fretboard-container">
            <div className="fretboard-scroll-area fretboard-download-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'var(--bg-primary)' }}>
                {/* Chord Name Input */}
                <input
                    value={chordName}
                    onChange={(e) => setChordName(e.target.value)}
                    placeholder="Click to Edit"
                    style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        border: '2px solid #000',
                        borderRadius: '4px',
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        marginBottom: '1rem',
                        width: '100%',
                        maxWidth: '400px',
                        outline: 'none',
                        padding: '0.25rem'
                    }}
                />

                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <svg
                        ref={svgRef}
                        width={width}
                        height={height}
                        onClick={handleClick}
                        onContextMenu={handleContextMenu}
                        className="fretboard-svg"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {/* Fretboard Background */}
                        <rect
                            x={PADDING_X}
                            y={PADDING_Y - 10}
                            width={config.frets * FRET_SPACING}
                            height={(config.strings - 1) * STRING_SPACING + 20}
                            fill="var(--fretboard-wood)"
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
                                stroke={i === 0 && config.startFret === 1 ? "var(--nut-color)" : "var(--fret-wire)"}
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
                                x1={PADDING_X - (config.startFret === 1 ? 20 : 0)}
                                y1={PADDING_Y + i * STRING_SPACING}
                                x2={width - PADDING_X}
                                y2={PADDING_Y + i * STRING_SPACING}
                                stroke="var(--string-color)"
                                strokeWidth={1 + i * 0.6}
                            />
                        ))}

                        {/* Inlays (Dots) */}
                        {Array.from({ length: config.frets }).map((_, i) => {
                            const fretNum = config.startFret + i;
                            if (!INLAYS.includes(fretNum)) return null;
                            const isDouble = DOUBLE_INLAYS.includes(fretNum);
                            const x = PADDING_X + i * FRET_SPACING + FRET_SPACING / 2;
                            const y = height / 2;

                            return (
                                <g key={`inlay-${i}`} style={{ opacity: 0.8, pointerEvents: 'none' }}>
                                    {isDouble ? (
                                        (() => {
                                            const midString = (config.strings - 1) / 2;
                                            return (
                                                <>
                                                    <circle cx={x} cy={PADDING_Y + (midString - 1) * STRING_SPACING} r={12} fill="#d4d4d8" />
                                                    <circle cx={x} cy={PADDING_Y + (midString + 1) * STRING_SPACING} r={12} fill="#d4d4d8" />
                                                </>
                                            );
                                        })()
                                    ) : (
                                        <circle cx={x} cy={y} r={12} fill="#d4d4d8" />
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
                                fontSize="16"
                                fontWeight="bold"
                                fontFamily="inherit"
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
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
                                        {mark.shape === 'circle' && (
                                            <circle cx={x} cy={y} r={16} fill={mark.color} />
                                        )}
                                        {mark.shape === 'square' && (
                                            <rect x={x - 14} y={y - 14} width={28} height={28} rx={4} fill={mark.color} />
                                        )}
                                        {mark.shape === 'triangle' && (
                                            <polygon
                                                points={`${x},${y - 16} ${x - 14},${y + 12} ${x + 14},${y + 12}`}
                                                fill={mark.color}
                                            />
                                        )}
                                        {mark.shape === 'star' && (
                                            <polygon
                                                points={`${x},${y - 18} ${x + 5},${y - 5} ${x + 18},${y - 5} ${x + 8},${y + 5} ${x + 12},${y + 18} ${x},${y + 10} ${x - 12},${y + 18} ${x - 8},${y + 5} ${x - 18},${y - 5} ${x - 5},${y - 5}`}
                                                fill={mark.color}
                                            />
                                        )}
                                        {mark.shape === 'pentagon' && (
                                            <polygon
                                                points={`${x},${y - 16} ${x + 15},${y - 5} ${x + 10},${y + 16} ${x - 10},${y + 16} ${x - 15},${y - 5}`}
                                                fill={mark.color}
                                            />
                                        )}
                                        {mark.shape === 'cross' && (
                                            <polygon
                                                points={`${x - 5},${y - 16} ${x + 5},${y - 16} ${x + 5},${y - 5} ${x + 16},${y - 5} ${x + 16},${y + 5} ${x + 5},${y + 5} ${x + 5},${y + 16} ${x - 5},${y + 16} ${x - 5},${y + 5} ${x - 16},${y + 5} ${x - 16},${y - 5} ${x - 5},${y - 5}`}
                                                fill={mark.color}
                                                transform={`rotate(45, ${x}, ${y})`}
                                            />
                                        )}

                                        {/* Text Overlay */}
                                        {mark.text && (
                                            <text
                                                x={x}
                                                y={y}
                                                dy="0.35em"
                                                textAnchor="middle"
                                                fill="white"
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

                    {/* Text Editor Overlay via Wrapper */}
                    {editingMark && (() => {
                        const { x, y } = getCoordinates(editingMark.stringIndex, editingMark.fretIndex);
                        return (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: x,
                                    top: y - 24,
                                    transform: 'translate(-50%, -100%)',
                                    zIndex: 50
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
        </div>
    );
};

export default Fretboard;
