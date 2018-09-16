'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function get_alias(specifiers, name) {
    var i = specifiers.length;
    while (i--) {
        if (specifiers[i].name === name)
            return specifiers[i].as;
    }
}
function importDecl(str, start, end, specifiers, source) {
    var name = get_alias(specifiers, '*') || get_alias(specifiers, 'default');
    return {
        start: start,
        end: end,
        source: source,
        name: name,
        toString: function (nameBySource) {
            var name = nameBySource.get(source);
            var assignments = specifiers
                .sort(function (a, b) {
                if (a.name === 'default')
                    return 1;
                if (b.name === 'default')
                    return -1;
            })
                .map(function (s) {
                if (s.name === '*')
                    return null;
                if (s.name === 'default' && s.as === name)
                    return s.as + " = " + name + ".default;";
                return "var " + s.as + " = " + name + "." + s.name + ";";
            });
            return (assignments.join(' ') + ' /*' +
                str.slice(start, end) + '*/').trim();
        }
    };
}
function exportDefaultDeclaration(str, start, end) {
    while (/\S/.test(str[end]))
        end += 1;
    return {
        start: start,
        end: end,
        toString: function () {
            return "__exports.default =";
        }
    };
}
function exportSpecifiersDeclaration(str, start, specifiersStart, specifiersEnd, end, source) {
    var specifiers = processSpecifiers(str.slice(specifiersStart + 1, specifiersEnd - 1).trim());
    return {
        start: start,
        end: end,
        source: source,
        toString: function (nameBySource) {
            var name = nameBySource.get(source);
            return specifiers
                .map(function (s) {
                return "__exports." + s.as + " = " + (name ? name + "." + s.name : s.name) + "; ";
            })
                .join('') + ("/*" + str.slice(start, end) + "*/");
        }
    };
}
function exportDecl(str, start, c) {
    var end = c;
    while (str[c] && /\S/.test(str[c]))
        c += 1;
    while (str[c] && !/\S/.test(str[c]))
        c += 1;
    var nameStart = c;
    while (str[c] && !punctuatorChars.test(str[c]) && !isWhitespace(str[c]))
        c += 1;
    var nameEnd = c;
    var name = str.slice(nameStart, nameEnd);
    return {
        start: start,
        end: end,
        name: name,
        toString: function () {
            return '';
        }
    };
}
function exportStarDeclaration(str, start, end, source) {
    return {
        start: start,
        end: end,
        source: source,
        toString: function (nameBySource) {
            return "Object.assign(__exports, " + nameBySource.get(source) + "); /*" + str.slice(start, end) + "*/";
        }
    };
}
var keywords = /\b(case|default|delete|do|else|in|instanceof|new|return|throw|typeof|void)\s*$/;
var punctuators = /(^|\{|\(|\[\.|;|,|<|>|<=|>=|==|!=|===|!==|\+|-|\*\%|<<|>>|>>>|&|\||\^|!|~|&&|\|\||\?|:|=|\+=|-=|\*=|%=|<<=|>>=|>>>=|&=|\|=|\^=|\/=|\/)\s*$/;
var ambiguous = /(\}|\)|\+\+|--)\s*$/;
var punctuatorChars = /[{}()[.;,<>=+\-*%&|\^!~?:/]/;
var keywordChars = /[a-z]/;
var whitespace_obj = { ' ': 1, '\t': 1, '\n': 1, '\r': 1, '\f': 1, '\v': 1, '\u00A0': 1, '\u2028': 1, '\u2029': 1 };
function isWhitespace(char) {
    // this is faster than testing a regex
    return char in whitespace_obj;
}
function isQuote(char) {
    return char === "'" || char === '"';
}
var namespaceImport = /^\*\s+as\s+(\w+)$/;
var defaultAndStarImport = /(\w+)\s*,\s*\*\s*as\s*(\w+)$/;
var defaultAndNamedImport = /(\w+)\s*,\s*{(.+)}$/;
function processImportSpecifiers(str) {
    var match = namespaceImport.exec(str);
    if (match) {
        return [{ name: '*', as: match[1] }];
    }
    match = defaultAndStarImport.exec(str);
    if (match) {
        return [{ name: 'default', as: match[1] }, { name: '*', as: match[2] }];
    }
    match = defaultAndNamedImport.exec(str);
    if (match) {
        return [{ name: 'default', as: match[1] }].concat(processSpecifiers(match[2].trim()));
    }
    if (str[0] === '{')
        return processSpecifiers(str.slice(1, -1).trim());
    if (str)
        return [{ name: 'default', as: str }];
    return [];
}
function processSpecifiers(str) {
    return str
        ? str.split(',').map(function (part) {
            var _a = part.trim().split(/[^\S]+/), name = _a[0], as = _a[2];
            return { name: name, as: as || name };
        })
        : [];
}
function getImportDeclaration(str, i) {
    var start = i;
    var specifierStart = i += 6;
    while (str[i] && isWhitespace(str[i]))
        i += 1;
    while (str[i] && !isQuote(str[i]))
        i += 1;
    var specifierEnd = i;
    var sourceStart = i += 1;
    while (str[i] && !isQuote(str[i]))
        i += 1;
    var sourceEnd = i++;
    return importDecl(str, start, i, processImportSpecifiers(str.slice(specifierStart, specifierEnd).replace(/from\s*$/, '').trim()), str.slice(sourceStart, sourceEnd));
}
function getImportStatement(i) {
    return {
        start: i,
        end: i + 6,
        toString: function () {
            return '__import';
        }
    };
}
function getExportDeclaration(str, i) {
    var start = i;
    i += 6;
    while (str[i] && isWhitespace(str[i]))
        i += 1;
    var declarationStart = i;
    if (str[i] === '{') {
        while (str[i] !== '}')
            i += 1;
        i += 1;
        var specifiersEnd = i;
        var source = null;
        while (isWhitespace(str[i]))
            i += 1;
        if (/^from[\s\n]/.test(str.slice(i, i + 5))) {
            i += 5;
            while (str[i] && !isQuote(str[i]))
                i += 1;
            var sourceStart = i += 1;
            while (str[i] && !isQuote(str[i]))
                i += 1;
            source = str.slice(sourceStart, i);
            i += 1;
        }
        return exportSpecifiersDeclaration(str, start, declarationStart, specifiersEnd, i, source);
    }
    if (str[i] === '*') {
        i += 1;
        while (isWhitespace(str[i]))
            i += 1;
        i += 4;
        while (str[i] && !isQuote(str[i]))
            i += 1;
        var sourceStart = i += 1;
        while (str[i] && !isQuote(str[i]))
            i += 1;
        var sourceEnd = i++;
        return exportStarDeclaration(str, start, i, str.slice(sourceStart, sourceEnd));
    }
    if (/default[\s\n]/.test(str.slice(i, i + 8))) {
        return exportDefaultDeclaration(str, start, declarationStart);
    }
    return exportDecl(str, start, declarationStart);
}
function find(str) {
    var escapedFrom;
    var regexEnabled = true;
    var pfixOp = false;
    var stack = [];
    var lsci = -1; // last significant character index
    var lsc = function () { return str[lsci]; };
    var parenMatches = {};
    var openingParenPositions = {};
    var parenDepth = 0;
    var importDeclarations = [];
    var importStatements = [];
    var exportDeclarations = [];
    function tokenClosesExpression() {
        if (lsc() === ')') {
            var c = parenMatches[lsci];
            while (isWhitespace(str[c - 1])) {
                c -= 1;
            }
            // if parenthesized expression is immediately preceded by `if`/`while`, it's not closing an expression
            return !/(if|while)$/.test(str.slice(c - 5, c));
        }
        // TODO handle }, ++ and -- tokens immediately followed by / character
        return true;
    }
    var base = {
        pattern: /(?:(\()|(\))|({)|(})|(")|(')|(\/\/)|(\/\*)|(\/)|(`)|(import)|(export)|(\+\+|--))/g,
        handlers: [
            // (
            function (i) {
                lsci = i;
                openingParenPositions[parenDepth++] = i;
            },
            // )
            function (i) {
                lsci = i;
                parenMatches[i] = openingParenPositions[--parenDepth];
            },
            // {
            function (i) {
                lsci = i;
                stack.push(base);
            },
            // }
            function (i) {
                lsci = i;
                return stack.pop();
            },
            // "
            function (i) {
                stack.push(base);
                return double_quoted;
            },
            // '
            function (i) {
                stack.push(base);
                return single_quoted;
            },
            // //
            function (i) { return line_comment; },
            // /*
            function (i) { return block_comment; },
            // /
            function (i) {
                // could be start of regex literal OR division punctuator. Solution via
                // http://stackoverflow.com/questions/5519596/when-parsing-javascript-what-determines-the-meaning-of-a-slash/27120110#27120110
                var b = i;
                while (b > 0 && isWhitespace(str[b - 1])) {
                    b -= 1;
                }
                if (b > 0) {
                    var a = b;
                    if (punctuatorChars.test(str[a - 1])) {
                        while (a > 0 && punctuatorChars.test(str[a - 1])) {
                            a -= 1;
                        }
                    }
                    else {
                        while (a > 0 && keywordChars.test(str[a - 1])) {
                            a -= 1;
                        }
                    }
                    var token = str.slice(a, b);
                    regexEnabled = token
                        ? keywords.test(token) ||
                            punctuators.test(token) ||
                            (ambiguous.test(token) && !tokenClosesExpression())
                        : false;
                }
                else {
                    regexEnabled = true;
                }
                return slash;
            },
            // `
            function (i) { return template_string; },
            // import
            function (i) {
                if (i === 0 || isWhitespace(str[i - 1]) || punctuatorChars.test(str[i - 1])) {
                    if (/import[\s\n{"']/.test(str.slice(i, i + 7))) {
                        var d = getImportDeclaration(str, i);
                        importDeclarations.push(d);
                        p = d.end;
                    }
                    else if (str.slice(i, i + 7) === 'import(') {
                        var s = getImportStatement(i);
                        importStatements.push(s);
                        p = s.end;
                    }
                }
            },
            // export
            function (i) {
                if (i === 0 || isWhitespace(str[i - 1]) || punctuatorChars.test(str[i - 1])) {
                    if (/export[\s\n{]/.test(str.slice(i, i + 7))) {
                        var d = getExportDeclaration(str, i);
                        exportDeclarations.push(d);
                        p = d.end;
                    }
                }
            },
            // ++/--
            function (i) {
                pfixOp = (!pfixOp && str[i - 1] === '+');
            }
        ]
    };
    var slash = {
        pattern: /(?:(\[)|(\\)|(.))/g,
        handlers: [
            // [
            function (i) { return regexEnabled ? regex_character : base; },
            // \\
            function (i) { return (escapedFrom = regex, escaped); },
            // anything else
            function (i) { return regexEnabled && !pfixOp ? regex : base; }
        ]
    };
    var regex = {
        pattern: /(?:(\[)|(\\)|(\/))/g,
        handlers: [
            // [
            function () { return regex_character; },
            // \\
            function () { return (escapedFrom = regex, escaped); },
            // /
            function () { return base; }
        ]
    };
    var regex_character = {
        pattern: /(?:(\])|(\\))/g,
        handlers: [
            // ]
            function () { return regex; },
            // \\
            function () { return (escapedFrom = regex_character, escaped); }
        ]
    };
    var double_quoted = {
        pattern: /(?:(\\)|("))/g,
        handlers: [
            // \\
            function () { return (escapedFrom = double_quoted, escaped); },
            // "
            function () { return stack.pop(); }
        ]
    };
    var single_quoted = {
        pattern: /(?:(\\)|('))/g,
        handlers: [
            // \\
            function () { return (escapedFrom = single_quoted, escaped); },
            // '
            function () { return stack.pop(); }
        ]
    };
    var escaped = {
        pattern: /(.)/g,
        handlers: [
            function () { return escapedFrom; }
        ]
    };
    var template_string = {
        pattern: /(?:(\$)|(\\)|(`))/g,
        handlers: [
            // $
            function () { return template_string_dollar; },
            // \\
            function () { return (escapedFrom = template_string, escaped); },
            // `
            function () { return base; }
        ]
    };
    var template_string_dollar = {
        pattern: /({)/g,
        handlers: [
            // {
            function () {
                stack.push(template_string);
                return base;
            },
            function () { return template_string; }
        ]
    };
    var line_comment = {
        pattern: /((?:\n|$))/g,
        handlers: [
            // \n
            function () { return base; }
        ]
    };
    var block_comment = {
        pattern: /(\*\/)/g,
        handlers: [
            // \n
            function () { return base; }
        ]
    };
    var state = base;
    var p = 0;
    while (p < str.length) {
        state.pattern.lastIndex = p;
        var match = state.pattern.exec(str);
        if (!match) {
            if (stack.length > 0 || state !== base) {
                throw new Error("Unexpected end of file");
            }
            break;
        }
        p = match.index + match[0].length;
        for (var j = 1; j < match.length; j += 1) {
            if (match[j]) {
                state = state.handlers[j - 1](match.index) || state;
                break;
            }
        }
    }
    return [importDeclarations, importStatements, exportDeclarations];
}
function transform(source, id) {
    var _a = find(source), importDeclarations = _a[0], importStatements = _a[1], exportDeclarations = _a[2];
    var nameBySource = new Map();
    importDeclarations.forEach(function (d) {
        if (nameBySource.has(d.source))
            return;
        nameBySource.set(d.source, d.name || "__dep_" + nameBySource.size);
    });
    exportDeclarations.forEach(function (d) {
        if (!d.source)
            return;
        if (nameBySource.has(d.source))
            return;
        nameBySource.set(d.source, d.name || "__dep_" + nameBySource.size);
    });
    var deps = Array.from(nameBySource.keys())
        .map(function (s) { return "'" + s + "'"; })
        .join(', ');
    var names = ['__import', '__exports'].concat(Array.from(nameBySource.values()))
        .join(', ');
    var transformed = "__shimport__.define('" + id + "', [" + deps + "], function(" + names + "){ ";
    var ranges = importDeclarations.concat(importStatements, exportDeclarations).sort(function (a, b) { return a.start - b.start; });
    var c = 0;
    for (var i = 0; i < ranges.length; i += 1) {
        var range = ranges[i];
        transformed += (source.slice(c, range.start) +
            range.toString(nameBySource));
        c = range.end;
    }
    transformed += source.slice(c);
    exportDeclarations.forEach(function (d) {
        if (d.name)
            transformed += "\n__exports." + d.name + " = " + d.name + ";";
    });
    transformed += "\n});\n//# sourceURL=" + id;
    return transformed;
}

var VERSION = "0.0.12";

exports.transform = transform;
exports.find = find;
exports.VERSION = VERSION;
