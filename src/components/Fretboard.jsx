import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, FolderOpen, Save } from 'lucide-react';
import './Fretboard.css';

const STRING_SPACING = 50;
const FRET_SPACING = 120;
const PADDING_X = 100; // Increased left padding to prevent dots/nut from cutting off
const PADDING_Y = 50; // Increased padding to accommodate lower fret numbers

// Standard single/double dot positions (0-indexed frets from nut)
const INLAYS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const DOUBLE_INLAYS = [12, 24];

const Fretboard = ({
    config,
    marks,
    onToggleMark,
    onUpdateMarkText,
    chordName,
    setChordName,
    onSave,
    isCollapsed,
    isLoadSidebarOpen,
    setIsLoadSidebarOpen,
    isMainModalOpen
}) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const wasEditing = useRef(false);
    const [editingMark, setEditingMark] = useState(null); // { string, fret }
    const [scale, setScale] = useState(1);

    // Calculate dimensions
    const width = config.frets * FRET_SPACING + PADDING_X * 2;
    const height = (config.strings - 1) * STRING_SPACING + PADDING_Y * 2;

    // Handle auto-scaling
    React.useLayoutEffect(() => {
        const updateScale = () => {
            if (!containerRef.current) return;
            
            // Available area is the parent of the scroll area (the main view)
            const availableWidth = containerRef.current.clientWidth - 80; // Margin
            const availableHeight = containerRef.current.clientHeight - 120; // Margin + chord name space

            const scaleX = availableWidth / width;
            const scaleY = availableHeight / height;
            
            // Zoom out only if it doesn't fit, otherwise stay at 1
            const newScale = Math.min(scaleX, scaleY, 1);
            setScale(newScale);
        };

        const observer = new ResizeObserver(updateScale);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        
        updateScale(); // Initial call
        
        return () => observer.disconnect();
    }, [width, height, isCollapsed, isLoadSidebarOpen]); // re-run on load sidebar change too

    const getCoordinates = (stringIdx, fretIdx) => {
        // stringIdx: 0 is top (High E), config.strings-1 is bottom (Low E)
        if (fretIdx < 0) {
            const x = PADDING_X - 40; // 25px to the left of the nut
            const y = PADDING_Y + stringIdx * STRING_SPACING;
            return { x, y };
        }

        const x = PADDING_X + fretIdx * FRET_SPACING + (FRET_SPACING / 2);
        const y = PADDING_Y + stringIdx * STRING_SPACING;
        return { x, y };
    };

    const handleClick = (e) => {
        // If we were just editing, or are currently editing, the first click only saves/names
        if (editingMark || wasEditing.current) {
            setEditingMark(null);
            wasEditing.current = false;
            return;
        }

        const rect = svgRef.current.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) / scale;
        const clickY = (e.clientY - rect.top) / scale;

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
        const clickX = (e.clientX - rect.left) / scale;
        const clickY = (e.clientY - rect.top) / scale;

        let stringIdx = Math.round((clickY - PADDING_Y) / STRING_SPACING);
        let visualFretIdx = Math.floor((clickX - PADDING_X) / FRET_SPACING);

        // Clamp
        if (stringIdx < 0) stringIdx = 0;
        if (stringIdx >= config.strings) stringIdx = config.strings - 1;
        const minFretIdx = config.startFret === 1 ? -1 : 0;
        if (visualFretIdx < minFretIdx) visualFretIdx = minFretIdx;
        if (visualFretIdx >= config.frets) visualFretIdx = config.frets - 1;

        const mark = marks.find(m => m.stringIndex === stringIdx && m.fretIndex === visualFretIdx);
        if (mark) {
            setEditingMark({ stringIndex: stringIdx, fretIndex: visualFretIdx, initialText: mark.text });
        } else {
            onToggleMark(stringIdx, visualFretIdx, 'cross');
        }
    };

    return (
        <div className="fretboard-container" ref={containerRef}>
            {/* Top Left Actions */}
            <div className={`diagram-actions ${isMainModalOpen ? 'blurred' : ''}`}>
                <button className="action-btn primary" onClick={onSave}>
                    <Save size={18} />
                    Save
                </button>
                <button className={`action-btn ${isLoadSidebarOpen ? 'active' : ''}`} onClick={() => setIsLoadSidebarOpen(!isLoadSidebarOpen)}>
                    <FolderOpen size={18} />
                    Load
                </button>
            </div>

            <div className={`fretboard-scroll-area fretboard-download-area ${isLoadSidebarOpen ? 'shifted' : ''}`}>
                <div 
                    style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        transform: `scale(${scale})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.2s ease-out'
                    }}
                >
                    {/* Chord Name Input */}
                            <input
                                value={chordName}
                                onChange={(e) => setChordName(e.target.value)}
                                placeholder="Click to Edit"
                                style={{
                                    fontSize: `${2 / Math.pow(scale, 0.5)}rem`, // Grows as scale decreases
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    border: '2px solid #000',
                                    borderRadius: '4px',
                                    background: 'transparent',
                                    color: 'var(--text-primary)',
                                    marginBottom: '1rem', // Constant gap
                                    width: '100%',
                                    maxWidth: '600px',
                                    outline: 'none',
                                    padding: '0.25rem',
                                    userSelect: 'none',
                                    transition: 'all 0.2s ease-out'
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

                            {/* Strings (Horizontal Lines) */}
                            {Array.from({ length: config.strings }).map((_, i) => (
                                <line
                                    key={`line-h-${i}`}
                                    x1={PADDING_X - (config.startFret === 1 ? 0 : 0)}
                                    y1={PADDING_Y + i * STRING_SPACING}
                                    x2={width - PADDING_X}
                                    y2={PADDING_Y + i * STRING_SPACING}
                                    stroke="var(--string-color)"
                                    strokeWidth={3}
                                />
                            ))}

                            {/* Frets (Vertical Lines) */}
                            {Array.from({ length: config.frets + 1 }).map((_, i) => (
                                <line
                                    key={`line-v-${i}`}
                                    x1={PADDING_X + i * FRET_SPACING}
                                    y1={PADDING_Y - 1.5}
                                    x2={PADDING_X + i * FRET_SPACING}
                                    y2={height - PADDING_Y + 1.5}
                                    stroke={i === 0 && config.startFret === 1 ? "var(--nut-color)" : "var(--fret-wire)"}
                                    strokeWidth={
                                        (i === 0 && config.startFret === 1) ? 14 : 2
                                    }
                                    strokeLinecap="butt"
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
                                    y={height - PADDING_Y + 30} // Constant Y offset
                                    textAnchor="middle"
                                    fill="var(--text-secondary)"
                                    fontSize={16 / Math.pow(scale, 0.5)} // Dynamic font size
                                    fontWeight="bold"
                                    fontFamily="inherit"
                                    style={{ pointerEvents: 'none', userSelect: 'none', transition: 'all 0.2s ease-out' }}
                                >
                                    {config.startFret + i}
                                </text>
                            ))}

                            {/* Split-Color ClipPath Defs */}
                            <defs>
                                {marks.filter(m => m.color2).map((mark) => {
                                    const { x } = getCoordinates(mark.stringIndex, mark.fretIndex);
                                    const clipId = `split-clip-${mark.stringIndex}-${mark.fretIndex}`;
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
                                    const clipId = `split-clip-${mark.stringIndex}-${mark.fretIndex}`;

                                    const renderShape = (color, clipPath = null) => {
                                        const props = clipPath ? { clipPath: `url(#${clipPath})` } : {};
                                        if (mark.shape === 'circle') return <circle cx={x} cy={y} r={21} fill={color} {...props} />;
                                        if (mark.shape === 'square') return <rect x={x - 14} y={y - 14} width={28} height={28} rx={4} fill={color} {...props} />;
                                        if (mark.shape === 'triangle') return <polygon points={`${x},${y - 16} ${x - 14},${y + 12} ${x + 14},${y + 12}`} fill={color} {...props} />;
                                        if (mark.shape === 'star') return <polygon points={`${x},${y - 18} ${x + 5},${y - 5} ${x + 18},${y - 5} ${x + 8},${y + 5} ${x + 12},${y + 18} ${x},${y + 10} ${x - 12},${y + 18} ${x - 8},${y + 5} ${x - 18},${y - 5} ${x - 5},${y - 5}`} fill={color} {...props} />;
                                        if (mark.shape === 'pentagon') return <polygon points={`${x},${y - 16} ${x + 15},${y - 5} ${x + 10},${y + 16} ${x - 10},${y + 16} ${x - 15},${y - 5}`} fill={color} {...props} />;
                                        if (mark.shape === 'cross') return <polygon points={`${x - 5},${y - 16} ${x + 5},${y - 16} ${x + 5},${y - 5} ${x + 16},${y - 5} ${x + 16},${y + 5} ${x + 5},${y + 5} ${x + 5},${y + 16} ${x - 5},${y + 16} ${x - 5},${y + 5} ${x - 16},${y + 5} ${x - 16},${y - 5} ${x - 5},${y - 5}`} fill={color} transform={`rotate(45, ${x}, ${y})`} {...props} />;
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
                                                    {/* Full shape in color2 (right half) */}
                                                    {renderShape(mark.color2)}
                                                    {/* Left half clipped to color1 */}
                                                    {renderShape(mark.color, clipId)}
                                                </>
                                            ) : (
                                                renderShape(mark.color)
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
                                                    style={{
                                                        fontWeight: "bold",
                                                        textShadow: "0px 1px 2px rgba(0,0,0,0.8)",
                                                        pointerEvents: "none",
                                                        userSelect: "none"
                                                    }}
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
                                        onBlur={(e) => {
                                            onUpdateMarkText(editingMark.stringIndex, editingMark.fretIndex, e.target.value);
                                            setEditingMark(null);
                                            // Set flag to prevent immediate click actions on the same spot
                                            wasEditing.current = true;
                                            setTimeout(() => {
                                                wasEditing.current = false;
                                            }, 200);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.target.blur();
                                            }
                                            if (e.key === 'Escape') {
                                                setEditingMark(null);
                                            }
                                        }}
                                    />
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Fretboard;
