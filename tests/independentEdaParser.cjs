/**
 * independentEdaParser.cjs
 * =========================
 * Independent Token & BNF Grammar Parser for LEF 5.8 and DEF 5.8 subsets.
 * Validates syntax, coordinate tokens, block boundaries, orientation tokens,
 * and declared-vs-actual component/pin counts without using any application code.
 */

const LEGAL_DEF_ORIENTATIONS = new Set(['N', 'S', 'E', 'W', 'FN', 'FS', 'FW', 'FE']);

/**
 * Tokenize LEF or DEF string into lexical tokens.
 */
function tokenizeEDA(source) {
  const tokens = [];
  const lines = source.split(/\r?\n/);

  for (let lineNum = 1; lineNum <= lines.length; lineNum++) {
    const rawLine = lines[lineNum - 1];
    // Remove comments
    const commentIdx = rawLine.indexOf('#');
    const line = commentIdx !== -1 ? rawLine.slice(0, commentIdx) : rawLine;

    // Regex matching quoted strings, standalone minus/plus/parens/semicolons, numbers (including negative), or identifiers
    const regex = /"([^"\\]|\\.)*"|[();\+]|-(?=\s|$)|-?\d+(?:\.\d+)?|[^ \t\r\n();\+\-]+/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      tokens.push({
        value: match[0],
        line: lineNum,
        col: match.index + 1,
      });
    }
  }

  return tokens;
}

/**
 * Independent Parser for Physical Library Format (LEF 5.8 subset)
 */
function parseLEF58(lefContent) {
  const tokens = tokenizeEDA(lefContent);
  let pos = 0;
  const errors = [];

  function peek() {
    return tokens[pos];
  }

  function next() {
    return tokens[pos++];
  }

  function expect(val) {
    const t = next();
    if (!t || t.value.toUpperCase() !== val.toUpperCase()) {
      errors.push(`Line ${t ? t.line : 'EOF'}: Expected '${val}', found '${t ? t.value : 'EOF'}'`);
      return false;
    }
    return true;
  }

  function expectSemicolon() {
    return expect(';');
  }

  const result = {
    version: null,
    busbitchars: null,
    dividerchar: null,
    unitsMicrons: null,
    macros: [],
    errors,
  };

  while (pos < tokens.length) {
    const t = peek();
    if (!t) break;
    const upper = t.value.toUpperCase();

    if (upper === 'VERSION') {
      next();
      result.version = next()?.value;
      expectSemicolon();
    } else if (upper === 'BUSBITCHARS') {
      next();
      result.busbitchars = next()?.value;
      expectSemicolon();
    } else if (upper === 'DIVIDERCHAR') {
      next();
      result.dividerchar = next()?.value;
      expectSemicolon();
    } else if (upper === 'UNITS') {
      next();
      while (pos < tokens.length && peek()?.value.toUpperCase() !== 'END') {
        const uToken = next();
        if (uToken.value.toUpperCase() === 'DATABASE') {
          const type = next()?.value;
          const val = next()?.value;
          result.unitsMicrons = Number(val);
          expectSemicolon();
        }
      }
      expect('END');
      expect('UNITS');
    } else if (upper === 'MACRO') {
      next();
      const macroName = next()?.value;
      const macro = { name: macroName, pins: [] };

      while (pos < tokens.length) {
        const mToken = peek();
        if (!mToken) break;
        const mUpper = mToken.value.toUpperCase();

        if (mUpper === 'END') {
          next();
          const endName = next()?.value;
          if (endName !== macroName) {
            errors.push(`Line ${mToken.line}: Mismatched MACRO END: expected ${macroName}, found ${endName}`);
          }
          break;
        } else if (mUpper === 'CLASS') {
          next();
          macro.class = next()?.value;
          expectSemicolon();
        } else if (mUpper === 'ORIGIN') {
          next();
          macro.origin = [Number(next()?.value), Number(next()?.value)];
          expectSemicolon();
        } else if (mUpper === 'SIZE') {
          next();
          const w = Number(next()?.value);
          expect('BY');
          const h = Number(next()?.value);
          macro.size = [w, h];
          expectSemicolon();
        } else if (mUpper === 'SYMMETRY') {
          next();
          while (peek() && peek().value !== ';') next();
          expectSemicolon();
        } else if (mUpper === 'PIN') {
          next();
          const pinName = next()?.value;
          const pin = { name: pinName };
          while (pos < tokens.length) {
            const pTok = peek();
            if (!pTok) break;
            const pUp = pTok.value.toUpperCase();
            if (pUp === 'END') {
              next();
              const pEndName = next()?.value;
              if (pEndName !== pinName) {
                errors.push(`Line ${pTok.line}: Mismatched PIN END: expected ${pinName}, found ${pEndName}`);
              }
              break;
            } else if (pUp === 'DIRECTION') {
              next();
              pin.direction = next()?.value;
              expectSemicolon();
            } else if (pUp === 'USE') {
              next();
              pin.use = next()?.value;
              expectSemicolon();
            } else if (pUp === 'PORT') {
              next();
              while (pos < tokens.length && peek()?.value.toUpperCase() !== 'END') {
                next();
              }
              expect('END');
            } else {
              next();
            }
          }
          macro.pins.push(pin);
        } else if (mUpper === 'OBS') {
          next();
          while (pos < tokens.length && peek()?.value.toUpperCase() !== 'END') {
            next();
          }
          expect('END');
        } else {
          next();
        }
      }
      result.macros.push(macro);
    } else if (upper === 'END') {
      next();
      const endWhat = next()?.value?.toUpperCase();
      if (endWhat === 'LIBRARY') {
        // Complete LEF parse
        break;
      }
    } else {
      next();
    }
  }

  return result;
}

/**
 * Independent Parser for Design Exchange Format (DEF 5.8 subset)
 */
function parseDEF58(defContent) {
  const tokens = tokenizeEDA(defContent);
  let pos = 0;
  const errors = [];

  function peek() {
    return tokens[pos];
  }

  function next() {
    return tokens[pos++];
  }

  function expect(val) {
    const t = next();
    if (!t || t.value.toUpperCase() !== val.toUpperCase()) {
      errors.push(`Line ${t ? t.line : 'EOF'}: Expected '${val}', found '${t ? t.value : 'EOF'}'`);
      return false;
    }
    return true;
  }

  function expectSemicolon() {
    return expect(';');
  }

  const result = {
    version: null,
    design: null,
    unitsDistance: null,
    dieArea: null,
    declaredComponents: 0,
    components: [],
    declaredPins: 0,
    pins: [],
    declaredSpecialNets: 0,
    specialNets: [],
    declaredNets: 0,
    nets: [],
    errors,
  };

  while (pos < tokens.length) {
    const t = peek();
    if (!t) break;
    const upper = t.value.toUpperCase();

    if (upper === 'VERSION') {
      next();
      result.version = next()?.value;
      expectSemicolon();
    } else if (upper === 'DIVIDERCHAR' || upper === 'BUSBITCHARS') {
      next();
      next();
      expectSemicolon();
    } else if (upper === 'DESIGN') {
      next();
      result.design = next()?.value;
      expectSemicolon();
    } else if (upper === 'UNITS') {
      next();
      expect('DISTANCE');
      expect('MICRONS');
      result.unitsDistance = Number(next()?.value);
      expectSemicolon();
    } else if (upper === 'DIEAREA') {
      next();
      expect('(');
      const x1 = Number(next()?.value);
      const y1 = Number(next()?.value);
      expect(')');
      expect('(');
      const x2 = Number(next()?.value);
      const y2 = Number(next()?.value);
      expect(')');
      expectSemicolon();
      result.dieArea = { x1, y1, x2, y2 };
    } else if (upper === 'COMPONENTS') {
      next();
      result.declaredComponents = Number(next()?.value);
      expectSemicolon();

      while (pos < tokens.length) {
        if (peek()?.value.toUpperCase() === 'END') {
          next();
          expect('COMPONENTS');
          break;
        }
        if (peek()?.value === '-') {
          next();
          const compName = next()?.value;
          const compMaster = next()?.value;
          const comp = { name: compName, master: compMaster };

          while (pos < tokens.length && peek()?.value !== ';') {
            const propTok = next();
            if (propTok.value === '+' && peek()?.value.toUpperCase() === 'PLACED') {
              next(); // skip PLACED
              expect('(');
              comp.x = Number(next()?.value);
              comp.y = Number(next()?.value);
              expect(')');
              comp.orient = next()?.value;
              if (!LEGAL_DEF_ORIENTATIONS.has(comp.orient)) {
                errors.push(`Invalid DEF orientation token: ${comp.orient}`);
              }
            }
          }
          expectSemicolon();
          result.components.push(comp);
        } else {
          next();
        }
      }

      if (result.components.length !== result.declaredComponents) {
        errors.push(`Declared COMPONENTS ${result.declaredComponents} != actual components ${result.components.length}`);
      }
    } else if (upper === 'PINS') {
      next();
      result.declaredPins = Number(next()?.value);
      expectSemicolon();

      while (pos < tokens.length) {
        if (peek()?.value.toUpperCase() === 'END') {
          next();
          expect('PINS');
          break;
        }
        if (peek()?.value === '-') {
          next();
          const pinName = next()?.value;
          const pin = { name: pinName };
          while (pos < tokens.length && peek()?.value !== ';') {
            const pTok = next();
            if (pTok.value === '+' && peek()?.value.toUpperCase() === 'NET') {
              next();
              pin.net = next()?.value;
            } else if (pTok.value === '+' && peek()?.value.toUpperCase() === 'DIRECTION') {
              next();
              pin.direction = next()?.value;
            } else if (pTok.value === '+' && peek()?.value.toUpperCase() === 'LAYER') {
              next();
              pin.layer = next()?.value;
              // bbox
              expect('(');
              next(); next();
              expect(')');
              expect('(');
              next(); next();
              expect(')');
            } else if (pTok.value === '+' && peek()?.value.toUpperCase() === 'PLACED') {
              next();
              expect('(');
              pin.x = Number(next()?.value);
              pin.y = Number(next()?.value);
              expect(')');
              pin.orient = next()?.value;
            }
          }
          expectSemicolon();
          result.pins.push(pin);
        } else {
          next();
        }
      }

      if (result.pins.length !== result.declaredPins) {
        errors.push(`Declared PINS ${result.declaredPins} != actual pins ${result.pins.length}`);
      }
    } else if (upper === 'SPECIALNETS') {
      next();
      result.declaredSpecialNets = Number(next()?.value);
      expectSemicolon();

      while (pos < tokens.length) {
        if (peek()?.value.toUpperCase() === 'END') {
          next();
          expect('SPECIALNETS');
          break;
        }
        if (peek()?.value === '-') {
          next();
          const sNetName = next()?.value;
          const sNet = { name: sNetName, routes: [] };
          while (pos < tokens.length && peek()?.value !== ';') {
            next();
          }
          expectSemicolon();
          result.specialNets.push(sNet);
        } else {
          next();
        }
      }
    } else if (upper === 'NETS') {
      next();
      result.declaredNets = Number(next()?.value);
      expectSemicolon();

      while (pos < tokens.length) {
        if (peek()?.value.toUpperCase() === 'END') {
          next();
          expect('NETS');
          break;
        }
        if (peek()?.value === '-') {
          next();
          const netName = next()?.value;
          const net = { name: netName };
          while (pos < tokens.length && peek()?.value !== ';') {
            next();
          }
          expectSemicolon();
          result.nets.push(net);
        } else {
          next();
        }
      }
    } else if (upper === 'END') {
      next();
      const endWhat = next()?.value?.toUpperCase();
      if (endWhat === 'DESIGN') {
        break;
      }
    } else {
      next();
    }
  }

  return result;
}

module.exports = {
  tokenizeEDA,
  parseLEF58,
  parseDEF58,
  LEGAL_DEF_ORIENTATIONS,
};
