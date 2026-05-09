import React, { useState, useEffect } from 'react';
import { Trash2, Download, Plus, HelpCircle, Info, Guitar, FolderOpen, Save } from 'lucide-react';
import './ControlPanel.css';
import CustomColorPicker from './CustomColorPicker';

const COLORS = [
    '#ef4444', '#ec4899', '#f97316', '#eab308',
    '#15803d', '#3b82f6', '#a855f7', '#713f12',
    '#000000', '#64748b',
];

const SHAPES = ['circle', 'square', 'triangle', 'star', 'pentagon', 'cross'];

const ControlPanel = ({
    config, setConfig,
    activeTool, setActiveTool,
    onClear, onDownload, onSave,
    onModalToggle,
    isLoadSidebarOpen, setIsLoadSidebarOpen,
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

            {/* ── ROW 1: Brand · Orientation · Settings · Actions ── */}
            <div className="toolbar-row toolbar-row-top">

                {/* Brand */}
                <div className="tb-brand">
                    <Guitar size={18} />
                    FretDiagram
                </div>

                <div className="tb-sep" />

                {/* Orientation */}
                <div className="tb-group">
                    <span className="tb-label">Orientation</span>
                    <div className="tb-row-items">
                        <button
                            className={`tb-orient ${config.orientation === 'horizontal' ? 'is-active' : ''}`}
                            onClick={() => setConfig({ ...config, orientation: 'horizontal' })}
                            title="Horizontal"
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
                </div>

                <div className="tb-sep" />

                {/* Fretboard numeric settings */}
                <div className="tb-group">
                    <span className="tb-label">Fretboard</span>
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
                    </div>
                </div>

                <div className="tb-sep" />

                {/* Diagram actions */}
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

                {/* Export */}
                <div className="tb-group">
                    <span className="tb-label">Export</span>
                    <div className="tb-row-items">
                        <button className="tb-btn tb-btn-danger" onClick={onClear}><Trash2 size={14} />Clear</button>
                        <button className="tb-btn tb-btn-primary" onClick={onDownload}><Download size={14} />Save Image</button>
                    </div>
                </div>

                <div className="tb-sep" />

                <button className="tb-help-btn" onClick={() => setShowHelp(true)} title="Help">
                    <HelpCircle size={20} />
                </button>
            </div>

            {/* ── ROW 2: Shapes · Colors · Split ── */}
            <div className="toolbar-row toolbar-row-bottom">

                {/* Shapes */}
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

                <div className="tb-sep" />

                {/* Colors — no redundant swatch square */}
                <div className="tb-group">
                    <span className="tb-label">Color</span>
                    <div className="tb-row-items">
                        {allColors.map((color, i) => (
                            <button
                                key={i}
                                className={`tb-color ${activeTool.color === color && !activeTool.color2 ? 'is-active' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setActiveTool({ ...activeTool, color, color2: null })}
                                title={color}
                            />
                        ))}
                        <button className="tb-color tb-color-add" onClick={() => setShowColorPicker(true)} title="Custom color">
                            <Plus size={13} />
                        </button>
                    </div>
                </div>

                <div className="tb-sep" />

                {/* Split Color */}
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
            </div>

            {/* Modals */}
            {showColorPicker && (
                <CustomColorPicker
                    activeColor={showColorPicker === 'color2' ? (activeTool.color2 || activeTool.color) : activeTool.color}
                    onSelectColor={(color) => {
                        if (showColorPicker === 'color2') setActiveTool({ ...activeTool, color2: color });
                        else setActiveTool({ ...activeTool, color });
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
