import React, { useState, useEffect, useRef } from 'react';
import { Settings, Trash2, Download, Plus, HelpCircle, Info, Guitar, Music, FolderOpen, Save } from 'lucide-react';
import './ControlPanel.css';
import CustomColorPicker from './CustomColorPicker';

const COLORS = [
    '#ef4444', // Red
    '#ec4899', // Pink
    '#f97316', // Orange
    '#eab308', // Yellow
    '#15803d', // Dark Green
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#713f12', // Brown
    '#000000', // Black
    '#64748b', // Grey
];

const SHAPES = ['circle', 'square', 'triangle', 'star', 'pentagon', 'cross'];

// Small settings popover (for numeric fretboard params)
function SettingsPopover({ config, setConfig, isOpen, onToggle }) {
    const ref = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onToggle(false);
        };
        setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen, onToggle]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    };

    return (
        <div className="settings-popover-wrapper" ref={ref}>
            <button
                className={`tb-icon-btn ${isOpen ? 'active' : ''}`}
                onClick={() => onToggle(!isOpen)}
                title="Fretboard Settings"
            >
                <Settings size={16} />
            </button>
            {isOpen && (
                <div className="settings-dropdown">
                    <div className="settings-dropdown-title">Fretboard Settings</div>
                    <label className="settings-row">
                        <span>Strings</span>
                        <input type="number" name="strings" value={config.strings} onChange={handleChange} min="1" max="12" />
                    </label>
                    <label className="settings-row">
                        <span>Frets</span>
                        <input type="number" name="frets" value={config.frets} onChange={handleChange} min="1" max="24" />
                    </label>
                    <label className="settings-row">
                        <span>Start Fret</span>
                        <input type="number" name="startFret" value={config.startFret} onChange={handleChange} min="1" max="24" />
                    </label>
                </div>
            )}
        </div>
    );
}

const ControlPanel = ({
    config,
    setConfig,
    activeTool,
    setActiveTool,
    onClear,
    onDownload,
    onSave,
    onModalToggle,
    showFretboard,
    setShowFretboard,
    showPiano,
    setShowPiano,
    showWhiteNames,
    setShowWhiteNames,
    showBlackNames,
    setShowBlackNames,
    isLoadSidebarOpen,
    setIsLoadSidebarOpen,
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [customPalette, setCustomPalette] = useState(() => {
        const saved = localStorage.getItem('custom_guitar_palette');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        if (onModalToggle) onModalToggle(showColorPicker || showHelp);
    }, [showColorPicker, showHelp, onModalToggle]);

    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('custom_guitar_palette');
            if (saved) setCustomPalette(JSON.parse(saved));
        };
        window.addEventListener('storage', handleStorageChange);
        if (!showColorPicker) handleStorageChange();
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [showColorPicker]);

    const allColors = [...COLORS, ...customPalette];

    return (
        <div className="top-toolbar">

            {/* ── Brand ── */}
            <div className="tb-brand">
                <Guitar size={17} />
                <span>FretDiagram</span>
            </div>

            <div className="tb-divider" />

            {/* ── Instrument Toggles ── */}
            <div className="tb-group">
                <div className="tb-group-label">Instruments</div>
                <div className="tb-group-row">
                    <button
                        className={`tb-instrument-btn ${showFretboard ? 'active' : ''}`}
                        onClick={() => setShowFretboard(!showFretboard)}
                        title="Toggle Fretboard"
                    >
                        <Guitar size={15} />
                        <span>Fretboard</span>
                    </button>
                    <button
                        className={`tb-instrument-btn ${showPiano ? 'active' : ''}`}
                        onClick={() => setShowPiano(!showPiano)}
                        title="Toggle Piano"
                    >
                        <Music size={15} />
                        <span>Piano</span>
                    </button>
                </div>
            </div>

            <div className="tb-divider" />

            {/* ── Fretboard: Orientation + Settings gear ── */}
            {showFretboard && (
                <>
                    <div className="tb-group">
                        <div className="tb-group-label">Orientation</div>
                        <div className="tb-group-row">
                            <button
                                className={`tb-orient-btn ${config.orientation === 'horizontal' ? 'active' : ''}`}
                                onClick={() => setConfig({ ...config, orientation: 'horizontal' })}
                                title="Horizontal"
                            >
                                {/* Horizontal fretboard icon */}
                                <svg width="22" height="16" viewBox="0 0 22 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                    <rect x="1" y="1" width="20" height="14" rx="2" />
                                    <line x1="1" y1="5.5" x2="21" y2="5.5" />
                                    <line x1="1" y1="10.5" x2="21" y2="10.5" />
                                    <line x1="7" y1="1" x2="7" y2="15" />
                                    <line x1="13" y1="1" x2="13" y2="15" />
                                </svg>
                            </button>
                            <button
                                className={`tb-orient-btn ${config.orientation === 'vertical' ? 'active' : ''}`}
                                onClick={() => setConfig({ ...config, orientation: 'vertical' })}
                                title="Vertical"
                            >
                                {/* Vertical fretboard icon */}
                                <svg width="16" height="22" viewBox="0 0 16 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                    <rect x="1" y="1" width="14" height="20" rx="2" />
                                    <line x1="5.5" y1="1" x2="5.5" y2="21" />
                                    <line x1="10.5" y1="1" x2="10.5" y2="21" />
                                    <line x1="1" y1="7" x2="15" y2="7" />
                                    <line x1="1" y1="13" x2="15" y2="13" />
                                </svg>
                            </button>
                            <SettingsPopover
                                config={config}
                                setConfig={setConfig}
                                isOpen={showSettings}
                                onToggle={setShowSettings}
                            />
                        </div>
                    </div>

                    <div className="tb-divider" />

                    {/* ── Shapes ── */}
                    <div className="tb-group">
                        <div className="tb-group-label">Shape</div>
                        <div className="tb-group-row">
                            {SHAPES.map(shape => (
                                <button
                                    key={shape}
                                    className={`tb-shape-btn ${activeTool.shape === shape ? 'active' : ''}`}
                                    onClick={() => setActiveTool({ ...activeTool, shape })}
                                    title={shape}
                                >
                                    <div
                                        className={`preview-shape ${shape}`}
                                        style={activeTool.color2
                                            ? { background: `linear-gradient(to right, ${activeTool.color} 50%, ${activeTool.color2} 50%)` }
                                            : { backgroundColor: activeTool.color }
                                        }
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="tb-divider" />
                </>
            )}

            {/* ── Colors ── */}
            <div className="tb-group">
                <div className="tb-group-label">Color</div>
                <div className="tb-group-row tb-colors-row">
                    {/* Active color swatch */}
                    <div className="tb-active-color" style={{ background: activeTool.color2
                        ? `linear-gradient(to right, ${activeTool.color} 50%, ${activeTool.color2} 50%)`
                        : activeTool.color
                    }} title="Active Color" />

                    {allColors.map((color, i) => (
                        <button
                            key={`col-${i}`}
                            className={`tb-color-btn ${activeTool.color === color && !activeTool.color2 ? 'active' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setActiveTool({ ...activeTool, color, color2: null })}
                            title={color}
                        />
                    ))}

                    {/* Custom color add */}
                    <button
                        className="tb-color-btn tb-color-add"
                        onClick={() => setShowColorPicker(true)}
                        title="Custom Color"
                    >
                        <Plus size={13} />
                    </button>
                </div>
            </div>

            {/* ── Split Color ── */}
            {showFretboard && (
                <div className="tb-split-section">
                    <div className="tb-group-label">Split</div>
                    <div className="tb-group-row">
                        <div
                            className={`tb-split-toggle ${activeTool.color2 ? 'on' : 'off'}`}
                            onClick={() => setActiveTool({
                                ...activeTool,
                                color2: activeTool.color2 ? null : COLORS[5]
                            })}
                            title="Toggle split color"
                        >
                            <div className="tb-split-knob" />
                        </div>
                        {activeTool.color2 && (
                            <>
                                {COLORS.map((color, i) => (
                                    <button
                                        key={`c2-${i}`}
                                        className={`tb-color-btn ${activeTool.color2 === color ? 'active' : ''}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setActiveTool({ ...activeTool, color2: color })}
                                        title={color}
                                    />
                                ))}
                                <button
                                    className="tb-color-btn tb-color-add"
                                    onClick={() => setShowColorPicker('color2')}
                                    title="Custom Color 2"
                                >
                                    <Plus size={13} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Piano Options (inline) ── */}
            {showPiano && !showFretboard && (
                <>
                    <div className="tb-divider" />
                    <div className="tb-group">
                        <div className="tb-group-label">Piano Names</div>
                        <div className="tb-group-row">
                            <button
                                className={`tb-instrument-btn ${showWhiteNames ? 'active' : ''}`}
                                onClick={() => setShowWhiteNames(!showWhiteNames)}
                                title="White Key Names"
                            >White Keys</button>
                            <button
                                className={`tb-instrument-btn ${showBlackNames ? 'active' : ''}`}
                                onClick={() => setShowBlackNames(!showBlackNames)}
                                title="Black Key Names"
                            >Black Keys</button>
                        </div>
                    </div>
                </>
            )}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* ── Right Actions ── */}
            <div className="tb-divider" />

            <div className="tb-group">
                <div className="tb-group-label">Diagram</div>
                <div className="tb-group-row">
                    <button className="tb-action-btn" onClick={onSave} title="Save Diagram">
                        <Save size={14} />
                        <span>Save</span>
                    </button>
                    <button
                        className={`tb-action-btn ${isLoadSidebarOpen ? 'active' : ''}`}
                        onClick={() => setIsLoadSidebarOpen(!isLoadSidebarOpen)}
                        title="Load Diagram"
                    >
                        <FolderOpen size={14} />
                        <span>Load</span>
                    </button>
                </div>
            </div>

            <div className="tb-divider" />

            <div className="tb-group">
                <div className="tb-group-label">Export</div>
                <div className="tb-group-row">
                    <button className="tb-action-btn danger" onClick={onClear} title="Clear Board">
                        <Trash2 size={14} />
                        <span>Clear</span>
                    </button>
                    <button className="tb-action-btn primary" onClick={onDownload} title="Save as Image">
                        <Download size={14} />
                        <span>Image</span>
                    </button>
                </div>
            </div>

            <div className="tb-divider" />

            <button className="tb-icon-btn" onClick={() => setShowHelp(true)} title="Help">
                <HelpCircle size={17} />
            </button>

            {/* ── Custom Color Picker Modal ── */}
            {showColorPicker && (
                <CustomColorPicker
                    activeColor={showColorPicker === 'color2' ? (activeTool.color2 || activeTool.color) : activeTool.color}
                    onSelectColor={(color) => {
                        if (showColorPicker === 'color2') {
                            setActiveTool({ ...activeTool, color2: color });
                        } else {
                            setActiveTool({ ...activeTool, color });
                        }
                    }}
                    onClose={() => setShowColorPicker(false)}
                />
            )}

            {/* ── Help Modal ── */}
            {showHelp && (
                <div className="help-modal-overlay" onClick={() => setShowHelp(false)}>
                    <div className="help-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="help-header">
                            <div className="header-title">
                                <Info size={20} />
                                <h3>Controls &amp; Shortcuts</h3>
                            </div>
                            <button className="close-help-btn" onClick={() => setShowHelp(false)}>
                                <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
                            </button>
                        </div>
                        <div className="help-body">
                            <div className="help-section">
                                <h4>Fretboard</h4>
                                <ul>
                                    <li><span>Left Click</span> to place a dot or remove it.</li>
                                    <li><span>Right Click</span> on a dot to label/name it.</li>
                                    <li><span>Right Click</span> on empty fret to place an <b>'X'</b>.</li>
                                </ul>
                            </div>
                            <div className="help-section">
                                <h4>Piano</h4>
                                <ul>
                                    <li><span>Click</span> a key to place/remove a colored dot.</li>
                                    <li>Use <span>+/−</span> buttons to add/remove octaves.</li>
                                    <li>Toggle <span>note names</span> in the Piano settings.</li>
                                </ul>
                            </div>
                            <div className="help-section">
                                <h4>Advanced</h4>
                                <ul>
                                    <li><span>Smart Swap</span> – change color/shape then click a dot to swap its style.</li>
                                    <li><span>Split Color</span> – toggle split mode and pick two colors.</li>
                                    <li><span>Custom Palette</span> – use the '+' button to add your own colors.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="help-footer">
                            <button className="help-close-action-btn" onClick={() => setShowHelp(false)}>Got it!</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ControlPanel;
