//@ts-check

/** @typedef {{
	name?: string;
	pattern: RegExp;
	handlers: Array<(i?: number, token?: string) => State | void>
}} State */

/** @typedef {{
	name: string;
	as: string;
}} Specifier */

/** @typedef {{
	start: number;
	end: number;
	toString: (nameBySource?: Map<string, string>) => string;
	specifiers?: Specifier[];
	[key: string]: any;
}} Range */

/**
 *
 * @param {Specifier[]} specifiers
 * @param {string} name
 */
function get_alias(specifiers, name) {
	let i = specifiers.length;
	while (i--) {
		if (specifiers[i].name === name) return specifiers[i].as;
	}
}

/**
 * @param {string} str
 * @param {number} start
 * @param {number} end
 * @param {Specifier[]} specifiers
 * @param {string} source
 */
function importDecl(str, start, end, specifiers, source) {
	const name = get_alias(specifiers, '*') || get_alias(specifiers, 'default');

	return {
		start,
		end,
		source,
		name,
		specifiers,
		toString() {
			return `/*${str.slice(start, end)}*/`;
		}
	};
}

/**
 * @param {string} str
 * @param {number} start
 * @param {number} end
 */
function exportDefaultDeclaration(str, start, end) {
	const match = /^\s*(?:(class)(\s+extends|\s*{)|(function)\s*\()/.exec(str.slice(end));

	if (match) {
		// anonymous class declaration
		end += match[0].length;

		const name = '__default_export';

		return {
			start,
			end,
			name,
			as: 'default',
			toString() {
				return match[1]
					? `class ${name}${match[2]}`
					: `function ${name}(`;
			}
		};
	}

	return {
		start,
		end,
		toString() {
			return `__exports.default =`;
		}
	};
}

/**
 * @param {string} str
 * @param {number} start
 * @param {number} specifiersStart
 * @param {number} specifiersEnd
 * @param {number} end
 * @param {string} source
 */
function exportSpecifiersDeclaration(str, start, specifiersStart, specifiersEnd, end, source) {
	const specifiers = processSpecifiers(str.slice(specifiersStart + 1, specifiersEnd - 1).trim());

	return {
		start,
		end,
		source,
		/**
		 * @param {Map<string, string>} nameBySource
		 */
		toString(nameBySource) {
			const name = source && nameBySource.get(source);

			return specifiers
				.map(s => {
					return `__exports.${s.as} = ${name ? `${name}.${s.name}` : s.name}; `;
				})
				.join('') + `/*${str.slice(start, end)}*/`
		}
	};
}

/**
 * @param {string} str
 * @param {number} start
 * @param {number} c
 */
function exportDecl(str, start, c) {
	const end = c;

	while (str[c] && /\S/.test(str[c])) c += 1;
	while (str[c] && !/\S/.test(str[c])) c += 1;

	const nameStart = c;
	while (str[c] && !punctuatorChars.test(str[c]) && !isWhitespace(str[c])) c += 1;
	const nameEnd = c;

	const name = str.slice(nameStart, nameEnd);

	return {
		start,
		end,
		name,
		toString() {
			return '';
		}
	};
}

/**
 * @param {string} str
 * @param {number} start
 * @param {number} end
 * @param {string} source
 */
function exportStarDeclaration(str, start, end, source) {
	return {
		start,
		end,
		source,
		/**
		 * @param {Map<string, string>} nameBySource
		 */
		toString(nameBySource) {
			return `Object.assign(__exports, ${nameBySource.get(source)}); /*${str.slice(start, end)}*/`;
		}
	};
}

const keywords = /\b(case|default|delete|do|else|in|instanceof|new|return|throw|typeof|void)\s*$/;
const punctuators = /(^|\{|\(|\[\.|;|,|<|>|<=|>=|==|!=|===|!==|\+|-|\*\%|<<|>>|>>>|&|\||\^|!|~|&&|\|\||\?|:|=|\+=|-=|\*=|%=|<<=|>>=|>>>=|&=|\|=|\^=|\/=|\/)\s*$/;
const ambiguous = /(\}|\)|\+\+|--)\s*$/;

const punctuatorChars = /[{}()[.;,<>=+\-*%&|\^!~?:/]/;
const keywordChars = /[a-zA-Z_$0-9]/;

const whitespace_obj = { ' ': 1, '\t': 1, '\n': 1, '\r': 1, '\f': 1, '\v': 1, '\u00A0': 1, '\u2028': 1, '\u2029': 1 };

/**
 * @param {string} char
 */
function isWhitespace(char) {
	// this is faster than testing a regex
	return char in whitespace_obj;
}

/**
 * @param {string} char
 */
function isQuote(char) {
	return char === "'" || char === '"';
}

const namespaceImport = /^\*\s+as\s+(\w+)$/;
const defaultAndStarImport = /(\w+)\s*,\s*\*\s*as\s*(\w+)$/;
const defaultAndNamedImport = /(\w+)\s*,\s*{(.+)}$/;

/**
 * @param {string} str
 * @returns {Specifier[]}
 */
function processImportSpecifiers(str) {
	let match = namespaceImport.exec(str);
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

	if (str[0] === '{') return processSpecifiers(str.slice(1, -1).trim());

	if (str) return [{ name: 'default', as: str }];

	return [];
}

/**
 * @param {string} str
 * @returns {Specifier[]}
 */
function processSpecifiers(str) {
	return str
		? str.split(',').map(part => {
			const [name, , as] = part.trim().split(/[^\S]+/);
			return { name, as: as || name };
		})
		: [];
}

/**
 * @param {string} str
 * @param {number} i
 */
function getImportDeclaration(str, i) {
	const start = i;

	const specifierStart = i += 6;
	while (str[i] && isWhitespace(str[i])) i += 1;
	while (str[i] && !isQuote(str[i])) i += 1;
	const specifierEnd = i;

	const sourceStart = i += 1;
	while (str[i] && !isQuote(str[i])) i += 1;
	const sourceEnd = i++;

	return importDecl(
		str,
		start,
		i,
		processImportSpecifiers(str.slice(specifierStart, specifierEnd).replace(/from\s*$/, '').trim()),
		str.slice(sourceStart, sourceEnd)
	);
}

/**
 * @param {number} i
 */
function getImportStatement(i) {
	return {
		start: i,
		end: i + 6,
		toString() {
			return '__import'
		}
	};
}

const importMetaUrlPattern = /^import\s*\.\s*meta\s*\.\s*url/;

/**
 * @param {string} str
 * @param {number} start
 * @param {string} id
 */
function getImportMetaUrl(str, start, id) {
	const match = importMetaUrlPattern.exec(str.slice(start));
	if (match) {
		return {
			start,
			end: start + match[0].length,
			toString() {
				return JSON.stringify('' + id);
			}
		}
	}
}

/**
 * @param {string} str
 * @param {number} i
 */
function getExportDeclaration(str, i) {
	const start = i;

	i += 6;
	while (str[i] && isWhitespace(str[i])) i += 1;

	const declarationStart = i;

	if (str[i] === '{') {
		while (str[i] !== '}') i += 1;
		i += 1;

		const specifiersEnd = i;

		let source = null;

		while (isWhitespace(str[i])) i += 1;
		if (/^from[\s\n'"]/.test(str.slice(i, i + 5))) {
			i += 4;
			while (isWhitespace(str[i])) i += 1;

			while (str[i] && !isQuote(str[i])) i += 1;
			const sourceStart = i += 1;
			while (str[i] && !isQuote(str[i])) i += 1;

			source = str.slice(sourceStart, i);
			i += 1;
		}

		return exportSpecifiersDeclaration(
			str,
			start,
			declarationStart,
			specifiersEnd,
			i,
			source
		);
	}

	if (str[i] === '*') {
		i += 1;
		while (isWhitespace(str[i])) i += 1;
		i += 4;
		while (str[i] && !isQuote(str[i])) i += 1;

		const sourceStart = i += 1;
		while (str[i] && !isQuote(str[i])) i += 1;
		const sourceEnd = i++;

		return exportStarDeclaration(
			str,
			start,
			i,
			str.slice(sourceStart, sourceEnd)
		);
	}

	if (/^default\b/.test(str.slice(i, i + 8))) {
		return exportDefaultDeclaration(
			str,
			start,
			declarationStart + 7
		);
	}

	return exportDecl(
		str,
		start,
		declarationStart
	);
}

/**
 * @param {string} str
 * @param {string} id
 * @returns {[Range[], Range[], Range[], Range[]]}
 */
function find(str, id) {
	/** @type {State} */
	let escapedFrom;
	let regexEnabled = true;
	let pfixOp = false;

	/** @type {State[]} */
	const stack = [];

	let lsci = -1; // last significant character index
	const lsc = () => str[lsci];

	/** @type {Record<string, number>} */
	const parenMatches = {};

	/** @type {Record<string, number>} */
	const openingParenPositions = {};
	let parenDepth = 0;

	/** @type {Range[]} */
	const importDeclarations = [];

	/** @type {Range[]} */
	const importStatements = [];

	/** @type {Range[]} */
	const importMetaUrls = [];

	/** @type {Range[]} */
	const exportDeclarations = [];

	function tokenClosesExpression() {
		if (lsc() === ')') {
			let c = parenMatches[lsci];
			while (isWhitespace(str[c - 1])) {
				c -= 1;
			}

			// if parenthesized expression is immediately preceded by `if`/`while`, it's not closing an expression
			return !/(if|while)$/.test(str.slice(c - 5, c));
		}

		// TODO handle }, ++ and -- tokens immediately followed by / character
		return true;
	}

	/** @type {State} */
	const base = {
		pattern: /(?:(\()|(\))|({)|(})|(")|(')|(\/\/)|(\/\*)|(\/)|(`)|(import)|(export)|(\+\+|--))/g,

		handlers: [
			// (
			(i) => {
				lsci = i;
				openingParenPositions[parenDepth++] = i;
			},

			// )
			(i) => {
				lsci = i;
				parenMatches[i] = openingParenPositions[--parenDepth];
			},

			// {
			(i) => {
				lsci = i;
				stack.push(base);
			},

			// }
			(i) => {
				lsci = i;
				return stack.pop();
			},

			// "
			(i) => {
				stack.push(base);
				return double_quoted;
			},

			// '
			(i) => {
				stack.push(base);
				return single_quoted;
			},

			// //
			(i) => line_comment,

			// /*
			(i) => block_comment,

			// /
			(i) => {
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
					} else {
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
				} else {
					regexEnabled = true;
				}

				return slash;
			},

			// `
			(i) => template_string,

			// import
			(i) => {
				if (i === 0 || isWhitespace(str[i - 1]) || punctuatorChars.test(str[i - 1])) {
					let j = i + 6;
					let char;

					do {
						char = str[j++];
					} while (isWhitespace(char));

					const hasWhitespace = j > i + 7;

					if (/^['"{*]$/.test(char) || (hasWhitespace && /^[a-zA-Z_$]$/.test(char))) {
						const d = getImportDeclaration(str, i);
						importDeclarations.push(d);
						p = d.end;
					}

					else if (char === '(') {
						const s = getImportStatement(i);
						importStatements.push(s);
						p = s.end;
					}

					else if (char === '.') {
						const u = getImportMetaUrl(str, i, id);
						if (u) {
							importMetaUrls.push(u);
							p = u.end;
						}
					}
				}
			},

			// export
			(i) => {
				if (i === 0 || isWhitespace(str[i - 1]) || punctuatorChars.test(str[i - 1])) {
					if (/export[\s\n{]/.test(str.slice(i, i + 7))) {
						const d = getExportDeclaration(str, i);
						exportDeclarations.push(d);
						p = d.end;
					}
				}
			},

			// ++/--
			(i) => {
				pfixOp = (!pfixOp && str[i - 1] === '+');
			}
		]
	};

	/** @type {State} */
	const slash = {
		pattern: /(?:(\[)|(\\)|(.))/g,

		handlers: [
			// [
			(i) => regexEnabled ? regex_character : base,

			// \\
			(i) => ((escapedFrom = regex), escaped),

			// anything else
			(i) => regexEnabled && !pfixOp ? regex : base
		]
	};

	/** @type {State} */
	const regex = {
		pattern: /(?:(\[)|(\\)|(\/))/g,

		handlers: [
			// [
			() => regex_character,

			// \\
			() => ((escapedFrom = regex), escaped),

			// /
			() => base
		]
	};

	/** @type {State} */
	const regex_character = {
		pattern: /(?:(\])|(\\))/g,

		handlers: [
			// ]
			() => regex,

			// \\
			() => ((escapedFrom = regex_character), escaped)
		]
	};

	/** @type {State} */
	const double_quoted = {
		pattern: /(?:(\\)|("))/g,

		handlers: [
			// \\
			() => ((escapedFrom = double_quoted), escaped),

			// "
			() => stack.pop()
		]
	};

	/** @type {State} */
	const single_quoted = {
		pattern: /(?:(\\)|('))/g,

		handlers: [
			// \\
			() => ((escapedFrom = single_quoted), escaped),

			// '
			() => stack.pop()
		]
	};

	/** @type {State} */
	const escaped = {
		pattern: /(.)/g,

		handlers: [
			() => escapedFrom
		]
	};

	/** @type {State} */
	const template_string = {
		pattern: /(?:(\${)|(\\)|(`))/g,

		handlers: [
			// ${
			() => {
				stack.push(template_string);
				return base;
			},

			// \\
			() => ((escapedFrom = template_string), escaped),

			// `
			() => base
		]
	};

	/** @type {State} */
	const line_comment = {
		pattern: /((?:\n|$))/g,

		handlers: [
			// \n
			() => base
		]
	};

	/** @type {State} */
	const block_comment = {
		pattern: /(\*\/)/g,

		handlers: [
			// \n
			() => base
		]
	};

	let state = base;

	let p = 0;

	while (p < str.length) {
		state.pattern.lastIndex = p;
		const match = state.pattern.exec(str);

		if (!match) {
			if (stack.length > 0 || state !== base) {
				throw new Error(`Unexpected end of file`);
			}

			break;
		}

		p = match.index + match[0].length;

		for (let j = 1; j < match.length; j += 1) {
			if (match[j]) {
				state = state.handlers[j - 1](match.index) || state;
				break;
			}
		}
	}

	return [
		importDeclarations,
		importStatements,
		importMetaUrls,
		exportDeclarations
	];
}

/**
 * @param {string} source
 * @param {string} id
 */
export function transform(source, id) {
	const [
		importDeclarations,
		importStatements,
		importMetaUrls,
		exportDeclarations
	] = find(source, id);

	const nameBySource = new Map();

	importDeclarations.forEach(d => {
		if (nameBySource.has(d.source)) return;
		nameBySource.set(d.source, d.name || `__dep_${nameBySource.size}`);
	});

	exportDeclarations.forEach(d => {
		if (!d.source) return;
		if (nameBySource.has(d.source)) return;
		nameBySource.set(d.source, d.name || `__dep_${nameBySource.size}`);
	});

	const deps = Array.from(nameBySource.keys())
		.map(s => `'${s}'`)
		.join(', ');

	const names = ['__import', '__exports'].concat(Array.from(nameBySource.values()))
		.join(', ');

	/** @type {string[]} */
	const hoisted = [];
	importDeclarations.forEach(decl => {
		const name = nameBySource.get(decl.source);

		decl.specifiers
			.sort((a, b) => {
				if (a.name === 'default') return 1;
				if (b.name === 'default') return -1;
			})
			.forEach((s) => {
				if (s.name !== '*') {
					const assignment = (s.name === 'default' && s.as === name)
						? `${s.as} = ${name}.default; `
						: `var ${s.as} = ${name}.${s.name}; `;

					hoisted.push(assignment);
				}
			});
	});

	let transformed = `__shimport__.define('${id}', [${deps}], function(${names}){ ${hoisted.join('')}`;

	const ranges = [
		...importDeclarations,
		...importStatements,
		...importMetaUrls,
		...exportDeclarations
	].sort((a, b) => a.start - b.start);

	let c = 0;

	for (let i = 0; i < ranges.length; i += 1) {
		const range = ranges[i];
		transformed += (
			source.slice(c, range.start) +
			range.toString(nameBySource)
		);

		c = range.end;
	}

	transformed += source.slice(c);

	exportDeclarations.forEach(d => {
		if (d.name) transformed += `\n__exports.${d.as || d.name} = ${d.name};`;
	});

	transformed += `\n});\n//# sourceURL=${id}`;

	return transformed;
}
