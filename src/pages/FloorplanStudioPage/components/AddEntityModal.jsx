/**
 * AddEntityModal.jsx
 * ==================
 * Interactive dialog for creating Floorplan entities:
 * - Macro instance (selected from MACRO_MASTERS_LIBRARY)
 * - I/O Pin (edge, coordinate, layer, net)
 * - Placement Blockage (hard / soft, dimensions)
 * - PDN Strap (net, layer, orientation, coordinate, width)
 * - PDN Via (interlayer connection at x, y)
 */

import React, { useState } from 'react';
import { MACRO_MASTERS_LIBRARY } from '../../../engine/floorplanProjectModel.js';

export default function AddEntityModal({
  isOpen,
  onClose,
  onAddMacro,
  onAddPin,
  onAddBlockage,
  onAddStrap,
  onAddVia,
  project,
}) {
  const [activeTab, setActiveTab] = useState('macro');

  // Macro form state
  const [macroMasterId, setMacroMasterId] = useState('SRAM_64KB');
  const [macroName, setMacroName] = useState('u_sram_0');
  const [macroX, setMacroX] = useState(60);
  const [macroY, setMacroY] = useState(60);
  const [macroHalo, setMacroHalo] = useState(10);

  // Pin form state
  const [pinId, setPinId] = useState('io_pin_0');
  const [pinEdge, setPinEdge] = useState('top');
  const [pinCoord, setPinCoord] = useState(100);
  const [pinNet, setPinNet] = useState('net_0');
  const [pinLayer, setPinLayer] = useState('M3');

  // Blockage form state
  const [blkId, setBlkId] = useState('blk_0');
  const [blkType, setBlkType] = useState('hard');
  const [blkX, setBlkX] = useState(150);
  const [blkY, setBlkY] = useState(150);
  const [blkW, setBlkW] = useState(80);
  const [blkH, setBlkH] = useState(80);

  // Strap form state
  const [strapId, setStrapId] = useState('strap_vdd_new');
  const [strapNet, setStrapNet] = useState('VDD');
  const [strapLayer, setStrapLayer] = useState('M4');
  const [strapOrient, setStrapOrient] = useState('horizontal');
  const [strapCoord, setStrapCoord] = useState(150);
  const [strapWidth, setStrapWidth] = useState(4);

  // Via form state
  const [viaId, setViaId] = useState('via_new');
  const [viaNet, setViaNet] = useState('VDD');
  const [viaX, setViaX] = useState(150);
  const [viaY, setViaY] = useState(150);
  const [viaL1, setViaL1] = useState('M4');
  const [viaL2, setViaL2] = useState('M5');

  if (!isOpen) return null;

  const handleCreateMacro = (e) => {
    e.preventDefault();
    const master = MACRO_MASTERS_LIBRARY[macroMasterId] || {
      width: 100,
      height: 80,
      pins: [],
    };
    const newMacro = {
      id: macroName.trim() || `macro_${Date.now()}`,
      name: macroName.trim() || `macro_${Date.now()}`,
      masterId: macroMasterId,
      width: master.width,
      height: master.height,
      x: Number(macroX) || 0,
      y: Number(macroY) || 0,
      orientation: 'R0',
      halo: Number(macroHalo) || 0,
      pins: JSON.parse(JSON.stringify(master.pins || [])),
    };
    onAddMacro(newMacro);
    onClose();
  };

  const handleCreatePin = (e) => {
    e.preventDefault();
    const newPin = {
      id: pinId.trim() || `pin_${Date.now()}`,
      edge: pinEdge,
      coord: Number(pinCoord) || 0,
      net: pinNet.trim() || pinId.trim(),
      layer: pinLayer,
    };
    onAddPin(newPin);
    onClose();
  };

  const handleCreateBlockage = (e) => {
    e.preventDefault();
    const newBlk = {
      id: blkId.trim() || `blk_${Date.now()}`,
      type: blkType,
      x: Number(blkX) || 0,
      y: Number(blkY) || 0,
      width: Number(blkW) || 50,
      height: Number(blkH) || 50,
    };
    onAddBlockage(newBlk);
    onClose();
  };

  const handleCreateStrap = (e) => {
    e.preventDefault();
    const core = project?.core || { x: 40, y: 40, width: 420, height: 320 };
    const coord = Number(strapCoord) || 100;
    const isHoriz = strapOrient === 'horizontal';
    const newStrap = {
      id: strapId.trim() || `strap_${Date.now()}`,
      net: strapNet,
      layer: strapLayer,
      x1: isHoriz ? core.x : coord,
      y1: isHoriz ? coord : core.y,
      x2: isHoriz ? core.x + core.width : coord,
      y2: isHoriz ? coord : core.y + core.height,
      width: Number(strapWidth) || 4,
    };
    onAddStrap(newStrap);
    onClose();
  };

  const handleCreateVia = (e) => {
    e.preventDefault();
    const newVia = {
      id: viaId.trim() || `via_${Date.now()}`,
      net: viaNet,
      x: Number(viaX) || 0,
      y: Number(viaY) || 0,
      layer1: viaL1,
      layer2: viaL2,
    };
    onAddVia(newVia);
    onClose();
  };

  return (
    <div className="fp-modal-backdrop" onClick={onClose} data-testid="add-entity-modal">
      <div className="fp-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="fp-modal-header">
          <h3>➕ Add Design Entity</h3>
          <button type="button" className="fp-modal-close-btn" onClick={onClose} data-testid="btn-close-modal">✕</button>
        </div>

        <div className="fp-modal-tabs">
          <button
            type="button"
            className={`fp-modal-tab ${activeTab === 'macro' ? 'fp-modal-tab--active' : ''}`}
            onClick={() => setActiveTab('macro')}
            data-testid="tab-add-macro"
          >
            🧱 Macro
          </button>
          <button
            type="button"
            className={`fp-modal-tab ${activeTab === 'pin' ? 'fp-modal-tab--active' : ''}`}
            onClick={() => setActiveTab('pin')}
            data-testid="tab-add-pin"
          >
            📍 Pin
          </button>
          <button
            type="button"
            className={`fp-modal-tab ${activeTab === 'blockage' ? 'fp-modal-tab--active' : ''}`}
            onClick={() => setActiveTab('blockage')}
            data-testid="tab-add-blockage"
          >
            🚫 Blockage
          </button>
          <button
            type="button"
            className={`fp-modal-tab ${activeTab === 'strap' ? 'fp-modal-tab--active' : ''}`}
            onClick={() => setActiveTab('strap')}
            data-testid="tab-add-strap"
          >
            ⚡ Strap
          </button>
          <button
            type="button"
            className={`fp-modal-tab ${activeTab === 'via' ? 'fp-modal-tab--active' : ''}`}
            onClick={() => setActiveTab('via')}
            data-testid="tab-add-via"
          >
            ✦ Via
          </button>
        </div>

        <div className="fp-modal-body">
          {/* TAB 1: MACRO */}
          {activeTab === 'macro' && (
            <form onSubmit={handleCreateMacro} data-testid="form-add-macro">
              <div className="fp-form-row">
                <label>Macro Master:</label>
                <select
                  value={macroMasterId}
                  onChange={(e) => {
                    setMacroMasterId(e.target.value);
                    const master = MACRO_MASTERS_LIBRARY[e.target.value];
                    if (master) {
                      setMacroName(`u_${e.target.value.toLowerCase()}_${Date.now() % 1000}`);
                    }
                  }}
                  data-testid="select-master-id"
                >
                  {Object.keys(MACRO_MASTERS_LIBRARY).map((mid) => {
                    const m = MACRO_MASTERS_LIBRARY[mid];
                    return (
                      <option key={mid} value={mid}>
                        {mid} ({m.width}×{m.height}µm, {m.category || 'Macro'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="fp-form-row">
                <label>Instance Name:</label>
                <input
                  type="text"
                  value={macroName}
                  onChange={(e) => setMacroName(e.target.value)}
                  required
                  data-testid="input-new-macro-name"
                />
              </div>

              <div className="fp-form-row-group">
                <div className="fp-form-row">
                  <label>X Position (µm):</label>
                  <input
                    type="number"
                    value={macroX}
                    onChange={(e) => setMacroX(e.target.value)}
                    required
                    data-testid="input-new-macro-x"
                  />
                </div>
                <div className="fp-form-row">
                  <label>Y Position (µm):</label>
                  <input
                    type="number"
                    value={macroY}
                    onChange={(e) => setMacroY(e.target.value)}
                    required
                    data-testid="input-new-macro-y"
                  />
                </div>
              </div>

              <div className="fp-form-row">
                <label>Keepout Halo (µm):</label>
                <input
                  type="number"
                  min="0"
                  value={macroHalo}
                  onChange={(e) => setMacroHalo(e.target.value)}
                  data-testid="input-new-macro-halo"
                />
              </div>

              <div className="fp-modal-actions">
                <button type="button" className="fp-toolbar-btn" onClick={onClose}>Cancel</button>
                <button type="submit" className="fp-toolbar-btn fp-toolbar-btn--primary" data-testid="btn-submit-add-macro">
                  Add Macro
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PIN */}
          {activeTab === 'pin' && (
            <form onSubmit={handleCreatePin} data-testid="form-add-pin">
              <div className="fp-form-row">
                <label>Pin Identifier:</label>
                <input
                  type="text"
                  value={pinId}
                  onChange={(e) => setPinId(e.target.value)}
                  required
                  data-testid="input-new-pin-id"
                />
              </div>

              <div className="fp-form-row-group">
                <div className="fp-form-row">
                  <label>Die Edge:</label>
                  <select
                    value={pinEdge}
                    onChange={(e) => setPinEdge(e.target.value)}
                    data-testid="select-new-pin-edge"
                  >
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div className="fp-form-row">
                  <label>Offset Coord (µm):</label>
                  <input
                    type="number"
                    value={pinCoord}
                    onChange={(e) => setPinCoord(e.target.value)}
                    required
                    data-testid="input-new-pin-coord"
                  />
                </div>
              </div>

              <div className="fp-form-row-group">
                <div className="fp-form-row">
                  <label>Logical Net:</label>
                  <input
                    type="text"
                    value={pinNet}
                    onChange={(e) => setPinNet(e.target.value)}
                    data-testid="input-new-pin-net"
                  />
                </div>
                <div className="fp-form-row">
                  <label>Metal Layer:</label>
                  <select
                    value={pinLayer}
                    onChange={(e) => setPinLayer(e.target.value)}
                    data-testid="select-new-pin-layer"
                  >
                    <option value="M2">M2</option>
                    <option value="M3">M3</option>
                    <option value="M4">M4</option>
                  </select>
                </div>
              </div>

              <div className="fp-modal-actions">
                <button type="button" className="fp-toolbar-btn" onClick={onClose}>Cancel</button>
                <button type="submit" className="fp-toolbar-btn fp-toolbar-btn--primary" data-testid="btn-submit-add-pin">
                  Add Pin
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: BLOCKAGE */}
          {activeTab === 'blockage' && (
            <form onSubmit={handleCreateBlockage} data-testid="form-add-blockage">
              <div className="fp-form-row-group">
                <div className="fp-form-row">
                  <label>Blockage ID:</label>
                  <input
                    type="text"
                    value={blkId}
                    onChange={(e) => setBlkId(e.target.value)}
                    required
                    data-testid="input-new-blk-id"
                  />
                </div>
                <div className="fp-form-row">
                  <label>Blockage Type:</label>
                  <select
                    value={blkType}
                    onChange={(e) => setBlkType(e.target.value)}
                    data-testid="select-new-blk-type"
                  >
                    <option value="hard">Hard (Prohibits StdCells + Macros)</option>
                    <option value="soft">Soft (Limits Local Density)</option>
                  </select>
                </div>
              </div>

              <div className="fp-form-row-group">
                <div className="fp-form-row">
                  <label>X Position (µm):</label>
                  <input
                    type="number"
                    value={blkX}
                    onChange={(e) => setBlkX(e.target.value)}
                    required
                    data-testid="input-new-blk-x"
                  />
                </div>
                <div className="fp-form-row">
                  <label>Y Position (µm):</label>
                  <input
                    type="number"
                    value={blkY}
                    onChange={(e) => setBlkY(e.target.value)}
                    required
                    data-testid="input-new-blk-y"
                  />
                </div>
              </div>

              <div className="fp-form-row-group">
                <div className="fp-form-row">
                  <label>Width (µm):</label>
                  <input
                    type="number"
                    value={blkW}
                    onChange={(e) => setBlkW(e.target.value)}
                    required
                    data-testid="input-new-blk-w"
                  />
                </div>
                <div className="fp-form-row">
                  <label>Height (µm):</label>
                  <input
                    type="number"
                    value={blkH}
                    onChange={(e) => setBlkH(e.target.value)}
                    required
                    data-testid="input-new-blk-h"
                  />
                </div>
              </div>

              <div className="fp-modal-actions">
                <button type="button" className="fp-toolbar-btn" onClick={onClose}>Cancel</button>
                <button type="submit" className="fp-toolbar-btn fp-toolbar-btn--primary" data-testid="btn-submit-add-blk">
                  Add Blockage
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: STRAP */}
          {activeTab === 'strap' && (
            <form onSubmit={handleCreateStrap} data-testid="form-add-strap">
              <div className="fp-form-row-group">
                <div className="fp-form-row">
                  <label>Strap ID:</label>
                  <input
                    type="text"
                    value={strapId}
                    onChange={(e) => setStrapId(e.target.value)}
                    required
                    data-testid="input-new-strap-id"
                  />
                </div>
                <div className="fp-form-row">
                  <label>Power Net:</label>
                  <select
                    value={strapNet}
                    onChange={(e) => setStrapNet(e.target.value)}
                    data-testid="select-new-strap-net"
                  >
                    <option value="VDD">VDD (Power)</option>
                    <option value="VSS">VSS (Ground)</option>
                  </select>
                </div>
              </div>

              <div className="fp-form-row-group">
                <div className="fp-form-row">
                  <label>Orientation:</label>
                  <select
                    value={strapOrient}
                    onChange={(e) => setStrapOrient(e.target.value)}
                    data-testid="select-new-strap-orient"
                  >
                    <option value="horizontal">Horizontal (across X)</option>
                    <option value="vertical">Vertical (across Y)</option>
                  </select>
                </div>
                <div className="fp-form-row">
                  <label>Metal Layer:</label>
                  <select
                    value={strapLayer}
                    onChange={(e) => setStrapLayer(e.target.value)}
                    data-testid="select-new-strap-layer"
                  >
                    <option value="M4">M4 (Horizontal preferred)</option>
                    <option value="M5">M5 (Vertical preferred)</option>
                  </select>
                </div>
              </div>

              <div className="fp-form-row-group">
                <div className="fp-form-row">
                  <label>Position Along Span (µm):</label>
                  <input
                    type="number"
                    value={strapCoord}
                    onChange={(e) => setStrapCoord(e.target.value)}
                    required
                    data-testid="input-new-strap-coord"
                  />
                </div>
                <div className="fp-form-row">
                  <label>Strap Width (µm):</label>
                  <input
                    type="number"
                    value={strapWidth}
                    onChange={(e) => setStrapWidth(e.target.value)}
                    required
                    data-testid="input-new-strap-width"
                  />
                </div>
              </div>

              <div className="fp-modal-actions">
                <button type="button" className="fp-toolbar-btn" onClick={onClose}>Cancel</button>
                <button type="submit" className="fp-toolbar-btn fp-toolbar-btn--primary" data-testid="btn-submit-add-strap">
                  Add Strap
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: VIA */}
          {activeTab === 'via' && (
            <form onSubmit={handleCreateVia} data-testid="form-add-via">
              <div className="fp-form-row-group">
                <div className="fp-form-row">
                  <label>Via ID:</label>
                  <input
                    type="text"
                    value={viaId}
                    onChange={(e) => setViaId(e.target.value)}
                    required
                    data-testid="input-new-via-id"
                  />
                </div>
                <div className="fp-form-row">
                  <label>Power Net:</label>
                  <select
                    value={viaNet}
                    onChange={(e) => setViaNet(e.target.value)}
                    data-testid="select-new-via-net"
                  >
                    <option value="VDD">VDD</option>
                    <option value="VSS">VSS</option>
                  </select>
                </div>
              </div>

              <div className="fp-form-row-group">
                <div className="fp-form-row">
                  <label>X Position (µm):</label>
                  <input
                    type="number"
                    value={viaX}
                    onChange={(e) => setViaX(e.target.value)}
                    required
                    data-testid="input-new-via-x"
                  />
                </div>
                <div className="fp-form-row">
                  <label>Y Position (µm):</label>
                  <input
                    type="number"
                    value={viaY}
                    onChange={(e) => setViaY(e.target.value)}
                    required
                    data-testid="input-new-via-y"
                  />
                </div>
              </div>

              <div className="fp-form-row-group">
                <div className="fp-form-row">
                  <label>Layer 1:</label>
                  <select
                    value={viaL1}
                    onChange={(e) => setViaL1(e.target.value)}
                    data-testid="select-new-via-l1"
                  >
                    <option value="M4">M4</option>
                    <option value="M3">M3</option>
                  </select>
                </div>
                <div className="fp-form-row">
                  <label>Layer 2:</label>
                  <select
                    value={viaL2}
                    onChange={(e) => setViaL2(e.target.value)}
                    data-testid="select-new-via-l2"
                  >
                    <option value="M5">M5</option>
                    <option value="M4">M4</option>
                  </select>
                </div>
              </div>

              <div className="fp-modal-actions">
                <button type="button" className="fp-toolbar-btn" onClick={onClose}>Cancel</button>
                <button type="submit" className="fp-toolbar-btn fp-toolbar-btn--primary" data-testid="btn-submit-add-via">
                  Add Via
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
