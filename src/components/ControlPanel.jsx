import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Download, Plus, HelpCircle, Info, FolderOpen, Save, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import './ControlPanel.css';
import CustomColorPicker from './CustomColorPicker';

const COLORS = [
    '#ef4444', '#ec4899', '#f97316', '#eab308',
    '#15803d', '#3b82f6', '#a855f7', '#713f12',
    '#000000', '#64748b', 'transparent',
];

const SHAPES = ['circle', 'square', 'triangle', 'star', 'pentagon', 'cross'];

const ControlPanel = ({
    config, setConfig,
    activeTool, setActiveTool,
    transpose, onTransposeChange,
    onNumDiagramsChange,
    zoomMode, onZoomModeChange,
    onClear, onDownload, onSave,
    user,
    onModalToggle,
    isLoadSidebarOpen, setIsLoadSidebarOpen,
    soundEnabled, onSoundToggle,
    onPlayHarmonic, onPlayMelodic,
    rootKeyOptions, rootKeyValue, onRootKeyChange,
    keyMode, onKeyModeChange,
    showScaleDegrees, onScaleDegreeToggle,
    showNoteLabels, onNoteLabelToggle,
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    // Draft text for the transpose field so "-" / "" can be typed without being reset
    const [transposeDraft, setTransposeDraft] = useState(null);
    const [showHelp, setShowHelp] = useState(false);
    const [showRootMenu, setShowRootMenu] = useState(false);
    const rootMenuRef = useRef(null);
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

    useEffect(() => {
        if (!showRootMenu) return;
        const closeMenu = (event) => {
            if (event.key === 'Escape' || !rootMenuRef.current?.contains(event.target)) {
                setShowRootMenu(false);
            }
        };
        document.addEventListener('pointerdown', closeMenu);
        document.addEventListener('keydown', closeMenu);
        return () => {
            document.removeEventListener('pointerdown', closeMenu);
            document.removeEventListener('keydown', closeMenu);
        };
    }, [showRootMenu]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    };

    const allColors = [...COLORS, ...customPalette];

    return (
        <div className="toolbar">

            {/* Row 1: setup, view, playback, and scale controls */}
            <div className="toolbar-row toolbar-row-top">

                <div className="tb-group tb-group-layout">
                    <span className="tb-label">Layout</span>
                    <div className="tb-row-items tb-row-items-layout">
                        <div className="tb-orient-pair" aria-label="Orientation">
                            <button
                                className={`tb-orient ${config.orientation === 'horizontal' ? 'is-active' : ''}`}
                                onClick={() => setConfig({ ...config, orientation: 'horizontal' })}
                                title="Horizontal"
                                aria-label="Horizontal orientation"
                            >
                                <svg width="26" height="18" viewBox="0 0 26 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                    <rect x="1" y="1" width="24" height="16" rx="2" />
                                    <line x1="1" y1="6.5" x2="25" y2="6.5" />
                                    <line x1="1" y1="11.5" x2="25" y2="11.5" />
                                    <line x1="8.5" y1="1" x2="8.5" y2="17" />
                                    <line x1="17.5" y1="1" x2="17.5" y2="17" />
                                </svg>
                            </button>
                            <button
                                className={`tb-orient ${config.orientation === 'vertical' ? 'is-active' : ''}`}
                                onClick={() => setConfig({ ...config, orientation: 'vertical' })}
                                title="Vertical"
                                aria-label="Vertical orientation"
                            >
                                <svg width="18" height="26" viewBox="0 0 18 26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                    <rect x="1" y="1" width="16" height="24" rx="2" />
                                    <line x1="6.5" y1="1" x2="6.5" y2="25" />
                                    <line x1="11.5" y1="1" x2="11.5" y2="25" />
                                    <line x1="1" y1="8.5" x2="17" y2="8.5" />
                                    <line x1="1" y1="17.5" x2="17" y2="17.5" />
                                </svg>
                            </button>
                        </div>
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
                                value={transposeDraft ?? transpose}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    setTransposeDraft(raw);
                                    const parsed = parseInt(raw, 10);
                                    if (!isNaN(parsed)) onTransposeChange(parsed);
                                }}
                                onBlur={() => setTransposeDraft(null)}
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
                                max={config.orientation === 'vertical' ? 24 : 6}
                                title="Max 6 rows horizontal, 24 vertical"
                            />
                        </label>
                        <div className="tb-zoom-toggle">
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
                        <button
                            className={`tb-btn ${config.showRowLabels ? 'is-active' : ''}`}
                            onClick={() => setConfig({ ...config, showRowLabels: !config.showRowLabels })}
                            title="Show a name label on every row"
                        >
                            Row labels
                        </button>
                    </div>
                </div>

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

                <div className="tb-group">
                    <span className="tb-label">Scale</span>
                    <div className="tb-row-items">
                        <div className="tb-mode-toggle" aria-label="Key mode">
                            <button
                                className={`tb-mode-btn ${keyMode === 'major' ? 'is-active' : ''}`}
                                onClick={() => onKeyModeChange('major')}
                                title="Major key"
                                aria-pressed={keyMode === 'major'}
                            >
                                Major
                            </button>
                            <button
                                className={`tb-mode-btn ${keyMode === 'minor' ? 'is-active' : ''}`}
                                onClick={() => onKeyModeChange('minor')}
                                title="Minor key"
                                aria-pressed={keyMode === 'minor'}
                            >
                                Minor
                            </button>
                        </div>
                        <div className="tb-root-picker" ref={rootMenuRef}>
                            <span className="tb-control-label">Key</span>
                            <button
                                className={`tb-root-trigger ${showRootMenu ? 'is-open' : ''}`}
                                onClick={() => setShowRootMenu(open => !open)}
                                title="Choose root key"
                                aria-label={`Root key: ${rootKeyValue}`}
                                aria-haspopup="listbox"
                                aria-expanded={showRootMenu}
                            >
                                <span>{rootKeyValue}</span>
                                <ChevronDown size={12} />
                            </button>
                            {showRootMenu && (
                                <div className="tb-root-menu" role="listbox" aria-label="Root key">
                                    {rootKeyOptions.map(key => (
                                        <button
                                            key={key.value}
                                            className={rootKeyValue === key.value ? 'is-active' : ''}
                                            onClick={() => {
                                                onRootKeyChange(key.value);
                                                setShowRootMenu(false);
                                            }}
                                            role="option"
                                            aria-selected={rootKeyValue === key.value}
                                            title={key.label}
                                        >
                                            {key.display || key.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            className={`tb-btn ${showScaleDegrees ? 'is-active' : ''}`}
                            onClick={onScaleDegreeToggle}
                            title={showScaleDegrees ? 'Hide scale degrees' : 'Show scale degrees'}
                            aria-pressed={showScaleDegrees}
                        >
                            Scale °
                        </button>
                        <button
                            className={`tb-btn ${showNoteLabels ? 'is-active' : ''}`}
                            onClick={onNoteLabelToggle}
                            title={showNoteLabels ? 'Hide note names' : 'Show note names'}
                            aria-pressed={showNoteLabels}
                        >
                            Note #
                        </button>
                    </div>
                </div>

            </div>

            {/* Row 2: drawing, color, file, and export controls */}
            <div className="toolbar-row toolbar-row-bottom">

                <div className="tb-group">
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

                <div className="tb-group">
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

                <div className="tb-group">
                    <span className="tb-label">Split Color</span>
                    <div className="tb-row-items">
                        <button
                            className={`tb-split-btn ${activeTool.color2 ? 'is-active' : ''}`}
                            onClick={() => setActiveTool({ ...activeTool, color2: activeTool.color2 ? null : COLORS[5] })}
                            title="Toggle split color"
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

                <div className="tb-group tb-group-actions">
                    <span className="tb-label">Files</span>
                    <div className="tb-row-items">
                        <button className="tb-btn tb-btn-icon" onClick={onSave} title={user ? 'Save diagram and sync to cloud' : 'Save diagram on this device'} aria-label="Save diagram">
                            <Save size={15} />
                        </button>
                        <button
                            className={`tb-btn tb-btn-icon ${isLoadSidebarOpen ? 'is-active' : ''}`}
                            onClick={() => setIsLoadSidebarOpen(!isLoadSidebarOpen)}
                            title="Load diagrams"
                            aria-label="Load diagrams"
                        >
                            <FolderOpen size={15} />
                        </button>
                    </div>
                </div>

                <div className="tb-group tb-group-actions">
                    <span className="tb-label">Export</span>
                    <div className="tb-row-items">
                        <button className="tb-btn tb-btn-icon tb-btn-danger" onClick={onClear} title="Clear diagram" aria-label="Clear diagram">
                            <Trash2 size={15} />
                        </button>
                        <button className="tb-btn tb-btn-icon tb-btn-primary" onClick={onDownload} title="Save image" aria-label="Save image">
                            <Download size={15} />
                        </button>
                    </div>
                </div>

                <button className="tb-help-btn toolbar-help" onClick={() => setShowHelp(true)} title="Help" aria-label="Help">
                    <HelpCircle size={20} />
                </button>
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
