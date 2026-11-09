/**
 * floorplanExport.test.js
 * =======================
 * Validates standards compliance of LEF 5.8, DEF 5.8, and ASCII Signoff Report exporters.
 */

import { describe, it, expect } from 'vitest';
import { generateLEF, generateDEF, generateSignoffReportText } from '../../engine/floorplanExport.js';
import { SCENARIO_SMALL_SOC } from '../../engine/floorplanProjectModel.js';

describe('floorplanExport Engine', () => {
  it('generates syntactically valid LEF 5.8 with macro definitions and obstructions', () => {
    const lef = generateLEF(SCENARIO_SMALL_SOC);
    expect(lef).toContain('VERSION 5.8 ;');
    expect(lef).toContain('UNITS');
    expect(lef).toContain('DATABASE MICRONS 1000 ;');
    expect(lef).toContain('MACRO');
    expect(lef).toContain('CLASS BLOCK ;');
    expect(lef).toContain('SIZE');
    expect(lef).toContain('PIN');
    expect(lef).toContain('OBS');
    expect(lef).toContain('END LIBRARY');
  });

  it('generates syntactically valid DEF 5.8 with die area, components, pins, and specialnets', () => {
    const def = generateDEF(SCENARIO_SMALL_SOC);
    expect(def).toContain('VERSION 5.8 ;');
    expect(def).toContain('DIVIDERCHAR "/" ;');
    expect(def).toContain('DESIGN');
    expect(def).toContain('UNITS DISTANCE MICRONS 1000 ;');
    expect(def).toContain('DIEAREA ( 0 0 ) ( 720000 540000 ) ;');
    expect(def).toContain('COMPONENTS 5 ;');
    expect(def).toContain('+ PLACED');
    expect(def).toContain('PINS 6 ;');
    expect(def).toContain('SPECIALNETS 2 ;');
    expect(def).toContain('END DESIGN');
  });

  it('generates structured plain-text signoff report with honest handoff milestone', () => {
    const txt = generateSignoffReportText(SCENARIO_SMALL_SOC);
    expect(txt).toContain('PHYSICAL DESIGN SIGNOFF');
    expect(txt).toContain('GEOMETRY & AREA METRICS');
    expect(txt).toContain('POWER DISTRIBUTION & ELECTRICAL SIGN-OFF');
    expect(txt).toContain('Standard Cell Placement & Clock Tree Synthesis');
    // Does NOT claim GDS tapeout
    expect(txt).not.toContain('Ready for GDS tapeout');
  });
});
