import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react';
import './Piano.css';

// All 12 note names in chromatic order starting from C
const NOTE_NAMES = [
    { white: true,  name: 'C',  sharp: null,   flat: null },
    { white: false, name: 'C#', sharp: 'C♯',   flat: 'D♭' },
    { white: true,  name: 'D',  sharp: null,   flat: null },
    { white: false, name: 'D#', sharp: 'D♯',   flat: 'E♭' },
    { white: true,  name: 'E',  sharp: null,   flat: null },
    { white: true,  name: 'F',  sharp: null,   flat: null },
    { white: false, name: 'F#', sharp: 'F♯',   flat: 'G♭' },
    { white: true,  name: 'G',  sharp: null,   flat: null },
    { white: false, name: 'G#', sharp: 'G♯',   flat: 'A♭' },
    { white: true,  name: 'A',  sharp: null,   flat: null },
    { white: false, name: 'A#', sharp: 'A♯',   flat: 'B♭' },
    { white: true,  name: 'B',  sharp: null,   flat: null },
];

// Generate keys for a range of octaves
const generateKeys = (startOctave, endOctave) => {
    const keys = [];
    for (let octave = startOctave; octave <= endOctave; octave++) {
        NOTE_NAMES.forEach((note) => {
            keys.push({
                ...note,
                octave,
                id: `${note.name}${octave}`,
                noteName: note.white ? note.name : note.name,
            });
        });
    }
    return keys;
};

// Map of which semitone indices are black keys within an octave
const BLACK_KEY_INDICES = [1, 3, 6, 8, 10];

const Piano = ({
    pianoMarks,
    onTogglePianoMark,
    activeTool,
    pianoConfig,
    setPianoConfig,
    showWhiteNames,
    showBlackNames,
}) => {
    const { startOctave, endOctave } = pianoConfig;

    const allKeys = generateKeys(startOctave, endOctave);
    const whiteKeys = allKeys.filter(k => k.white);
    const blackKeys = allKeys.filter(k => !k.white);

    // Get position of a black key relative to white keys
    const getBlackKeyPosition = (blackKey) => {
        // Find the white key index just before this black key
        const blackIdx = allKeys.indexOf(blackKey);
        // Count how many white keys are before this index
        let whiteCount = 0;
        for (let i = 0; i < blackIdx; i++) {
            if (allKeys[i].white) whiteCount++;
        }
        // Black key sits between whiteCount-1 and whiteCount white keys
        return whiteCount;
    };

    const handleAddOctaveDown = () => {
        if (startOctave > 0) {
            setPianoConfig(prev => ({ ...prev, startOctave: prev.startOctave - 1 }));
        }
    };

    const handleRemoveOctaveDown = () => {
        if (startOctave < endOctave) {
            setPianoConfig(prev => ({ ...prev, startOctave: prev.startOctave + 1 }));
        }
    };

    const handleAddOctaveUp = () => {
        if (endOctave < 8) {
            setPianoConfig(prev => ({ ...prev, endOctave: prev.endOctave + 1 }));
        }
    };

    const handleRemoveOctaveUp = () => {
        if (endOctave > startOctave) {
            setPianoConfig(prev => ({ ...prev, endOctave: prev.endOctave - 1 }));
        }
    };

    const getMark = (keyId) => pianoMarks.find(m => m.keyId === keyId);

    const WHITE_KEY_WIDTH = 56;
    const totalWidth = whiteKeys.length * WHITE_KEY_WIDTH;

    return (
        <div className="piano-wrapper">
            {/* Octave Controls - Left */}
            <div className="octave-controls octave-controls-left">
                <button
                    className="octave-btn"
                    onClick={handleAddOctaveDown}
                    disabled={startOctave <= 0}
                    title="Add octave down"
                >
                    <Plus size={14} />
                </button>
                <span className="octave-label">C{startOctave}</span>
                <button
                    className="octave-btn"
                    onClick={handleRemoveOctaveDown}
                    disabled={startOctave >= endOctave}
                    title="Remove lowest octave"
                >
                    <Minus size={14} />
                </button>
            </div>

            {/* Piano Keyboard */}
            <div className="piano-scroll-container">
                <div className="piano-keyboard" style={{ width: totalWidth }}>
                    {/* White Keys */}
                    {whiteKeys.map((key, idx) => {
                        const mark = getMark(key.id);
                        return (
                            <div
                                key={key.id}
                                className="piano-key white-key"
                                style={{ left: idx * WHITE_KEY_WIDTH, width: WHITE_KEY_WIDTH }}
                                onClick={() => onTogglePianoMark(key.id)}
                            >
                                {/* Dot Mark */}
                                <AnimatePresence>
                                    {mark && (
                                        <motion.div
                                            className="piano-dot white-dot"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            style={mark.color2
                                                ? { background: `linear-gradient(to right, ${mark.color} 50%, ${mark.color2} 50%)` }
                                                : { backgroundColor: mark.color }
                                            }
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Note Name */}
                                {showWhiteNames && (
                                    <span className="key-note-name white-note-name">
                                        {key.name}
                                    </span>
                                )}
                            </div>
                        );
                    })}

                    {/* Black Keys */}
                    {blackKeys.map((key) => {
                        const whitePos = getBlackKeyPosition(key);
                        const left = whitePos * WHITE_KEY_WIDTH - 18;
                        const mark = getMark(key.id);

                        return (
                            <div
                                key={key.id}
                                className="piano-key black-key"
                                style={{ left }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTogglePianoMark(key.id);
                                }}
                            >
                                {/* Dot Mark (smaller for black keys) */}
                                <AnimatePresence>
                                    {mark && (
                                        <motion.div
                                            className="piano-dot black-dot"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            style={mark.color2
                                                ? { background: `linear-gradient(to right, ${mark.color} 50%, ${mark.color2} 50%)` }
                                                : { backgroundColor: mark.color }
                                            }
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Black Key Note Names - Sharp on top, Flat on bottom */}
                                {showBlackNames && (
                                    <div className="black-key-names">
                                        <span className="enharmonic-sharp">{key.sharp}</span>
                                        <span className="enharmonic-flat">{key.flat}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Octave Controls - Right */}
            <div className="octave-controls octave-controls-right">
                <button
                    className="octave-btn"
                    onClick={handleAddOctaveUp}
                    disabled={endOctave >= 8}
                    title="Add octave up"
                >
                    <Plus size={14} />
                </button>
                <span className="octave-label">C{endOctave + 1}</span>
                <button
                    className="octave-btn"
                    onClick={handleRemoveOctaveUp}
                    disabled={endOctave <= startOctave}
                    title="Remove highest octave"
                >
                    <Minus size={14} />
                </button>
            </div>
        </div>
    );
};

export default Piano;
