import React, { useState, useEffect } from 'react';
import { Trash2, Download, Plus, HelpCircle, Info, Guitar, FolderOpen, Save, Volume2, VolumeX } from 'lucide-react';
import './ControlPanel.css';
import CustomColorPicker from './CustomColorPicker';

const COLORS = [
    '#ef4444', '#ec4899', '#f97316', '#eab308',
    '#15803d', '#3b82f6', '#a855f7', '#713f12',
    '#000000', '#64748b', 'transparent',
];

const SHAPES = ['circle', 'square', 'triangle', 'star', 'pentagon', 'heart', 'cross'];

const ControlPanel = ({
    config, setConfig,
    activeTool, setActiveTool,
    transpose, onTransposeChange,
    onNumDiagramsChange,
    zoomMode, onZoomModeChange,
    onClear, onDownload, onSave,
    onModalToggle,
    isLoadSidebarOpen, setIsLoadSidebarOpen,
    soundEnabled, onSoundToggle,
    onPlayHarmonic, onPlayMelodic,
    rootNoteName, rootSelectorActive, onRootSelectorToggle,
    autoScaleDegree, onAutoScaleDegreeToggle,
    autoNoteLabel, onAutoNoteLabelToggle,
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [customPalette, setCustomPalette] = useState(() => {
        const saved = localStorage.getItem('custom_guitar_palette');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        if (onModalToggle) onModalToggle(showColorPicker || showHelp);
    }, [showColorPicker, showHelp, onModalToggle]);

    useEffect(() => {
        const sync = () => {
            const saved = localStorage.getItem('custom_guitar_palette');
            if (saved) setCustomPalette(JSON.parse(saved));
        };
        window.addEventListener('storage', sync);
        if (!showColorPicker) sync();
        return () => window.removeEventListener('storage', sync);
    }, [showColorPicker]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    };

    const allColors = [...COLORS, ...customPalette];

    return (
        <div className="toolbar">

            {/* Top row: brand, shape, setup, playback, save/export */}
            <div className="toolbar-row toolbar-row-top">
                <div className="tb-brand">
                    <Guitar size={18} />
                    FretDiagram
                </div>

                <div className="tb-sep" />

                <div className="tb-group tb-group-shapes">
                    <span className="tb-label">Shape</span>
                    <div className="tb-row-items">
                        {SHAPES.map(shape => (
                            <button
                                key={shape}
                                className={`tb-shape ${activeTool.shape === shape ? 'is-active' : ''}`}
                                onClick={() => setActiveTool({ ...activeTool, shape })}
                                title={shape}
                            >
                                <div
                                    className={`ps ${shape}`}
                                    style={activeTool.color2
                                        ? { background: `linear-gradient(to right, ${activeTool.color} 50%, ${activeTool.color2} 50%)` }
                                        : { backgroundColor: activeTool.color }
                                    }
                                />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="tb-sep" />

                <div className="tb-group">
                    <div className="tb-row-items">
                        <label className="tb-num">
                            <span>Strings</span>
                            <input type="number" name="strings" value={config.strings} onChange={handleChange} min="1" max="12" />
                        </label>
                        <label className="tb-num">
                            <span>Frets</span>
                            <input type="number" name="frets" value={config.frets} onChange={handleChange} min="1" max="24" />
                        </label>
                        <label className="tb-num">
                            <span>Start</span>
                            <input type="number" name="startFret" value={config.startFret} onChange={handleChange} min="1" max="24" />
                        </label>
                        <label className="tb-num">
                            <span>Transpose</span>
                            <input
                                type="number"
                                value={transpose}
                                onChange={(e) => onTransposeChange(parseInt(e.target.value, 10))}
                                min="-24"
                                max="24"
                            />
                        </label>
                        <label className="tb-num">
                            <span>Rows</span>
                            <input
                                type="number"
                                value={config.numDiagrams || 1}
                                onChange={(e) => onNumDiagramsChange(parseInt(e.target.value, 10))}
                                min="1"
                                max="6"
                            />
                        </label>
                        <div className="tb-zoom-toggle tb-zoom-top">
                            <button
                                className={`tb-zoom-btn ${zoomMode === 'fit' ? 'is-active' : ''}`}
                                onClick={() => onZoomModeChange('fit')}
                                title="Fit all rows in view"
                            >Fit</button>
                            <button
                                className={`tb-zoom-btn ${zoomMode === 'scroll' ? 'is-active' : ''}`}
                                onClick={() => onZoomModeChange('scroll')}
                                title="1:1 size, scroll to navigate"
                            >Scroll</button>
                        </div>
                    </div>
                </div>

                <div className="tb-spacer" />

                <div className="tb-group">
                    <span className="tb-label">Sound</span>
                    <div className="tb-row-items">
                        <button
                            className={`tb-btn ${soundEnabled ? 'is-active' : ''}`}
                            onClick={onSoundToggle}
                            title={soundEnabled ? 'Sound on — click to turn off' : 'Sound off — click to turn on'}
                        >
                            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                            {soundEnabled ? 'On' : 'Off'}
                        </button>
                        <button className="tb-btn" onClick={onPlayHarmonic} title="Play all notes together">
                            Harmonic
                        </button>
                        <button className="tb-btn" onClick={onPlayMelodic} title="Play notes one at a time">
                            Melodic
                        </button>
                    </div>
                </div>

                <div className="tb-sep" />

                <div className="tb-group">
                    <span className="tb-label">Scale</span>
                    <div className="tb-row-items">
                        <button
                            className={`tb-btn ${rootSelectorActive ? 'is-active' : ''}`}
                            onClick={onRootSelectorToggle}
                            title="Click to arm, then click a fret to set as root (1)"
                        >
                            {rootSelectorActive ? 'Pick Root…' : rootNoteName ? `Root: ${rootNoteName}` : 'Set Root'}
                        </button>
                        <button
                            className={`tb-btn ${autoScaleDegree !== 'off' ? 'is-active' : ''}`}
                            onClick={onAutoScaleDegreeToggle}
                            title="Cycle: off → flats → sharps"
                        >
                            {autoScaleDegree === 'off' ? 'Scale °' : autoScaleDegree === 'flats' ? 'Scale b' : 'Scale #'}
                        </button>
                        <button
                            className={`tb-btn ${autoNoteLabel !== 'off' ? 'is-active' : ''}`}
                            onClick={onAutoNoteLabelToggle}
                            title="Cycle: off → flats → sharps"
                        >
                            {autoNoteLabel === 'off' ? 'Note °' : autoNoteLabel === 'flats' ? 'Note b' : 'Note #'}
                        </button>
                    </div>
                </div>

                <div className="tb-sep" />

                <div className="tb-group">
                    <span className="tb-label">Diagram</span>
                    <div className="tb-row-items">
                        <button className="tb-btn" onClick={onSave}><Save size={14} />Save</button>
                        <button className={`tb-btn ${isLoadSidebarOpen ? 'is-active' : ''}`} onClick={() => setIsLoadSidebarOpen(!isLoadSidebarOpen)}>
                            <FolderOpen size={14} />Load
                        </button>
                    </div>
                </div>

                <div className="tb-sep" />

                <div className="tb-group">
                    <span className="tb-label">Export</span>
                    <div className="tb-row-items">
                        <button className="tb-btn tb-btn-danger" onClick={onClear}><Trash2 size={14} />Clear</button>
                        <button className="tb-btn tb-btn-primary" onClick={onDownload}><Download size={14} />Save Image</button>
                    </div>
                </div>

                <button className="tb-help-btn" onClick={() => setShowHelp(true)} title="Help">
                    <HelpCircle size={20} />
                </button>
            </div>

            {/* Bottom row: colors, split, orientation, view */}
            <div className="toolbar-row toolbar-row-bottom">
                <div className="tb-brand-spacer" />

                <div className="tb-group tb-group-colors">
                    <span className="tb-label">Color</span>
                    <div className="tb-row-items">
                        {allColors.map((color, i) => (
                            <button
                                key={i}
                                className={`tb-color ${activeTool.color === color ? 'is-active' : ''}`}
                                style={color === 'transparent'
                                    ? { backgroundColor: 'transparent', border: '2px dashed #94a3b8' }
                                    : { backgroundColor: color }}
                                onClick={() => setActiveTool({ ...activeTool, color })}
                                title={color === 'transparent' ? 'Ghost (transparent)' : color}
                            />
                        ))}
                        <button className="tb-color tb-color-add" onClick={() => setShowColorPicker(true)} title="Custom color">
                            <Plus size={13} />
                        </button>
                    </div>
                </div>

                <div className="tb-sep" />

                <div className="tb-group">
                    <span className="tb-label">Split Color</span>
                    <div className="tb-row-items">
                        <button
                            className={`tb-split-btn ${activeTool.color2 ? 'is-active' : ''}`}
                            onClick={() => setActiveTool({ ...activeTool, color2: activeTool.color2 ? null : COLORS[5] })}
                        >
                            {activeTool.color2 ? 'On' : 'Off'}
                        </button>
                        {activeTool.color2 && (
                            <>
                                {COLORS.map((color, i) => (
                                    <button
                                        key={i}
                                        className={`tb-color ${activeTool.color2 === color ? 'is-active' : ''}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setActiveTool({ ...activeTool, color2: color })}
                                        title={color}
                                    />
                                ))}
                                <button className="tb-color tb-color-add" onClick={() => setShowColorPicker('color2')}>
                                    <Plus size={13} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="tb-sep" />

                <div className="tb-group">
                    <span className="tb-label">Orientation</span>
                    <div className="tb-row-items">
                        <button
                            className={`tb-orient ${config.orientation === 'horizontal' ? 'is-active' : ''}`}
                            onClick={() => setConfig({ ...config, orientation: 'horizontal' })}
                            title="Horizontal"
                            aria-label="Horizontal orientation"
                        >
                            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                                <rect x="2" y="2" width="3" height="18" fill="#050505" />
                                <g stroke="#8d949d" strokeWidth="0.9" strokeLinecap="square">
                                    <line x1="5" y1="2" x2="20" y2="2" />
                                    <line x1="5" y1="8" x2="20" y2="8" />
                                    <line x1="5" y1="14" x2="20" y2="14" />
                                    <line x1="5" y1="20" x2="20" y2="20" />
                                    <line x1="10" y1="2" x2="10" y2="20" />
                                    <line x1="15" y1="2" x2="15" y2="20" />
                                    <line x1="20" y1="2" x2="20" y2="20" />
                                </g>
                            </svg>
                        </button>
                        <button
                            className={`tb-orient ${config.orientation === 'vertical' ? 'is-active' : ''}`}
                            onClick={() => setConfig({ ...config, orientation: 'vertical' })}
                            title="Vertical"
                            aria-label="Vertical orientation"
                        >
                            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                                <rect x="2" y="2" width="18" height="3" fill="#050505" />
                                <g stroke="#8d949d" strokeWidth="0.9" strokeLinecap="square">
                                    <line x1="2" y1="5" x2="2" y2="20" />
                                    <line x1="8" y1="5" x2="8" y2="20" />
                                    <line x1="14" y1="5" x2="14" y2="20" />
                                    <line x1="20" y1="5" x2="20" y2="20" />
                                    <line x1="2" y1="10" x2="20" y2="10" />
                                    <line x1="2" y1="15" x2="20" y2="15" />
                                    <line x1="2" y1="20" x2="20" y2="20" />
                                </g>
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="tb-sep" />

                <div className="tb-group">
                    <span className="tb-label">View</span>
                    <div className="tb-row-items">
                        <button
                            className={`tb-btn ${config.showFretNumbers ? 'is-active' : ''}`}
                            onClick={() => setConfig({ ...config, showFretNumbers: !config.showFretNumbers })}
                            title="Toggle fret numbers"
                        >
                            Fret #s
                        </button>
                        <button
                            className={`tb-btn ${config.showInlays ? 'is-active' : ''}`}
                            onClick={() => setConfig({ ...config, showInlays: !config.showInlays })}
                            title="Toggle fret inlays"
                        >
                            Inlays
                        </button>
                        <button
                            className={`tb-btn ${config.showNut ? 'is-active' : ''}`}
                            onClick={() => setConfig({ ...config, showNut: !config.showNut })}
                            title="Toggle nut"
                        >
                            Nut
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showColorPicker && (
                <CustomColorPicker
                    activeColor={showColorPicker === 'color2' ? (activeTool.color2 || activeTool.color) : activeTool.color}
                    onSelectColor={(color) => {
                        if (showColorPicker === 'color2') setActiveTool(prev => ({ ...prev, color2: color }));
                        else setActiveTool(prev => ({ ...prev, color }));
                    }}
                    onClose={() => setShowColorPicker(false)}
                />
            )}

            {showHelp && (
                <div className="help-overlay" onClick={() => setShowHelp(false)}>
                    <div className="help-box" onClick={e => e.stopPropagation()}>
                        <div className="help-box-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Info size={18} />
                                <strong>Controls</strong>
                            </div>
                            <button className="help-close" onClick={() => setShowHelp(false)}>✕</button>
                        </div>
                        <div className="help-box-body">
                            <p><strong>Left click</strong> — place / remove a dot</p>
                            <p><strong>Right click on dot</strong> — label it</p>
                            <p><strong>Right click empty</strong> — place an X</p>
                            <p><strong>Smart Swap</strong> — change color/shape, click existing dot to update it</p>
                            <p><strong>Split Color</strong> — enable split mode, pick two colors</p>
                            <p><strong>+</strong> — add a custom color to your palette</p>
                        </div>
                        <div className="help-box-footer">
                            <button className="help-got-it" onClick={() => setShowHelp(false)}>Got it</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ControlPanel;
