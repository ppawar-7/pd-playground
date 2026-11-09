/**
 * floorplanPDN.test.js
 * ====================
 * Unit tests for educational PDN connectivity, shorts, missing vias, and IR-drop models.
 */

import { describe, it, expect } from 'vitest';
import {
  detectOpenConnections,
  detectVDDVSSShort,
  detectMissingVias,
  computeIRDropEstimate,
  addRing,
  addStrap,
  addVia,
  removeVia,
} from '../../engine/floorplanPDN.js';

const makeConnectedPDN = () => ({
  rings: [
    { id: 'ring_vdd', net: 'VDD', layer: 'M5', x: 20, y: 20, width: 360, height: 260, lineWidth: 6 },
    { id: 'ring_vss', net: 'VSS', layer: 'M5', x: 10, y: 10, width: 380, height: 280, lineWidth: 6 },
  ],
  straps: [
    { id: 'strap_vdd_1', net: 'VDD', layer: 'M4', x1: 20, y1: 150, x2: 380, y2: 150, width: 4 },
    { id: 'strap_vss_1', net: 'VSS', layer: 'M4', x1: 10, y1: 180, x2: 390, y2: 180, width: 4 },
  ],
  vias: [
    { id: 'v1', layer1: 'M4', layer2: 'M5', x: 20, y: 150, net: 'VDD' },
    { id: 'v2', layer1: 'M4', layer2: 'M5', x: 380, y: 150, net: 'VDD' },
    { id: 'v3', layer1: 'M4', layer2: 'M5', x: 10, y: 180, net: 'VSS' },
    { id: 'v4', layer1: 'M4', layer2: 'M5', x: 390, y: 180, net: 'VSS' },
  ],
  sources: [
    { nodeId: 'ring_vdd', net: 'VDD' },
    { nodeId: 'ring_vss', net: 'VSS' },
  ],
  loads: [
    { nodeId: 'strap_vdd_1', net: 'VDD' },
    { nodeId: 'strap_vss_1', net: 'VSS' },
  ],
});

describe('floorplanPDN Engine Tests', () => {
  describe('detectOpenConnections', () => {
    it('returns vddOpen: false and vssOpen: false for fully connected PDN', () => {
      const pdn = makeConnectedPDN();
      const result = detectOpenConnections(pdn);
      expect(result.vddOpen).toBe(false);
      expect(result.vssOpen).toBe(false);
      expect(result.vddDisconnectedLoads.length).toBe(0);
      expect(result.vssDisconnectedLoads.length).toBe(0);
    });

    it('detects open connection when VDD vias are removed', () => {
      let pdn = makeConnectedPDN();
      pdn = removeVia(pdn, 'v1');
      pdn = removeVia(pdn, 'v2');
      const result = detectOpenConnections(pdn);
      expect(result.vddOpen).toBe(true);
      expect(result.vddDisconnectedLoads.length).toBeGreaterThan(0);
      // VSS is unaffected
      expect(result.vssOpen).toBe(false);
    });

    it('detects open connection when VSS load is unreachable', () => {
      let pdn = makeConnectedPDN();
      pdn = removeVia(pdn, 'v3');
      pdn = removeVia(pdn, 'v4');
      const result = detectOpenConnections(pdn);
      expect(result.vssOpen).toBe(true);
      expect(result.vddOpen).toBe(false);
    });

    it('handles empty or null powerNetwork safely', () => {
      const result = detectOpenConnections(null);
      expect(result.vddOpen).toBe(true);
      expect(result.vssOpen).toBe(true);
    });
  });

  describe('detectVDDVSSShort', () => {
    it('returns hasShort: false for clean PDN with no short circuits', () => {
      const pdn = makeConnectedPDN();
      const result = detectVDDVSSShort(pdn);
      expect(result.hasShort).toBe(false);
      expect(result.shorts.length).toBe(0);
    });

    it('detects short circuit when a via bridges VDD and VSS geometries', () => {
      const pdn = makeConnectedPDN();
      // Add via at (20, 20) which is on ring_vdd and near strap/ring coordinates
      // Place via bridging VDD ring and VSS ring
      const shortVia = { id: 'v_short', layer1: 'M4', layer2: 'M5', x: 20, y: 20, net: 'VDD' };
      // Move ring_vss right onto (20, 20)
      const shortedPDN = {
        ...pdn,
        vias: [...pdn.vias, shortVia],
        rings: [
          ...pdn.rings,
          { id: 'ring_vss_short', net: 'VSS', layer: 'M5', x: 20, y: 20, width: 100, height: 100, lineWidth: 6 },
        ],
      };
      const result = detectVDDVSSShort(shortedPDN);
      expect(result.hasShort).toBe(true);
      expect(result.shorts.length).toBeGreaterThan(0);
    });
  });

  describe('detectMissingVias', () => {
    it('finds 0 missing vias when all strap-to-ring crossings have vias', () => {
      const pdn = makeConnectedPDN();
      const result = detectMissingVias(pdn);
      expect(result.missingViaCount).toBe(0);
      expect(result.details.length).toBe(0);
    });

    it('detects missing via when a strap crosses a ring without a via', () => {
      const pdn = makeConnectedPDN();
      const withoutVias = removeVia(pdn, 'v1');
      const result = detectMissingVias(withoutVias);
      expect(result.missingViaCount).toBe(1);
      expect(result.details[0].net).toBe('VDD');
    });
  });

  describe('computeIRDropEstimate', () => {
    it('computes educational IR drop estimates with disclaimers', () => {
      const pdn = makeConnectedPDN();
      const result = computeIRDropEstimate(pdn, [{ nodeId: 'strap_vdd_1', currentMa: 20 }]);
      expect(result.maxDropMv).toBeGreaterThan(0);
      expect(result.educationalDisclaimer).toContain('Educational');
      expect(result.assumptions).toBeDefined();
    });

    it('higher current yields higher IR drop proportionally', () => {
      const pdn = makeConnectedPDN();
      const lowResult = computeIRDropEstimate(pdn, [{ nodeId: 'strap_vdd_1', currentMa: 10 }]);
      const highResult = computeIRDropEstimate(pdn, [{ nodeId: 'strap_vdd_1', currentMa: 30 }]);
      expect(highResult.maxDropMv).toBeGreaterThan(lowResult.maxDropMv);
    });
  });

  describe('Immutable PDN manipulation helpers', () => {
    it('addRing appends ring without mutating original', () => {
      const pdn = makeConnectedPDN();
      const newRing = { id: 'r_new', net: 'VDD', layer: 'M6', x: 0, y: 0, width: 400, height: 300, lineWidth: 8 };
      const updated = addRing(pdn, newRing);
      expect(updated.rings.length).toBe(pdn.rings.length + 1);
      expect(pdn.rings.length).toBe(2);
    });

    it('addStrap appends strap immutably', () => {
      const pdn = makeConnectedPDN();
      const newStrap = { id: 's_new', net: 'VDD', layer: 'M4', x1: 0, y1: 50, x2: 400, y2: 50, width: 4 };
      const updated = addStrap(pdn, newStrap);
      expect(updated.straps.length).toBe(pdn.straps.length + 1);
    });

    it('addVia and removeVia manage via list immutably', () => {
      const pdn = makeConnectedPDN();
      const newVia = { id: 'v_extra', layer1: 'M4', layer2: 'M5', x: 50, y: 50, net: 'VDD' };
      const withVia = addVia(pdn, newVia);
      expect(withVia.vias.length).toBe(5);

      const withoutVia = removeVia(withVia, 'v_extra');
      expect(withoutVia.vias.length).toBe(4);
      expect(withoutVia.vias.some((v) => v.id === 'v_extra')).toBe(false);
    });
  });
});
