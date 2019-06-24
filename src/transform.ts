type State = {
	name?: string;
	pattern: RegExp;
	handlers: Array<(i?: number, token?: string) => State | void>
};

type Specifier = {
	name: string;
	as: string;
}

interface Range {
	start: number;
	end: number;
	[key: string]: any;
}

function get_alias(specifiers: Specifier[], name: string) {
	let i = specifiers.length;
	while (i--) {
		if (specifiers[i].name === name) return specifiers[i].as;
	}
}

function importDecl(str: string, start: number, end: number, specifiers: Specifier[], source: string) {
	const name = get_alias(specifiers, '*') || get_alias(specifiers, 'default');

	return {
		start,
		end,
		source,
		name,
		toString(nameBySource: Map<string, string>) {
			const name = nameBySource.get(source);

			const assignments = specifiers
				.sort((a, b) => {
					if (a.name === 'default') return 1;
					if (b.name === 'default') return -1;
				})
				.map(s => {
					if (s.name === '*') return null;
					if (s.name === 'default' && s.as === name) return `${s.as} = ${name}.default;`;
					return `var ${s.as} = ${name}.${s.name};`;
				});

			return (
				assignments.join(' ') + ' /*' +
				str.slice(start, end) + '*/'
			).trim();
		}
	};
}

function exportDefaultDeclaration(str: string, start: number, end: number) {
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

function exportSpecifiersDeclaration(str: string, start: number, specifiersStart: number, specifiersEnd: number, end: number, source: string) {
	const specifiers = processSpecifiers(str.slice(specifiersStart + 1, specifiersEnd - 1).trim());

	return {
		start,
		end,
		source,
		toString(nameBySource: Map<string, string>) {
			const name = nameBySource.get(source);

			return specifiers
				.map(s => {
					return `__exports.${s.as} = ${name ? `${name}.${s.name}` : s.name}; `;
				})
				.join('') + `/*${str.slice(start, end)}*/`
		}
	};
}

function exportDecl(str: string, start: number, c: number) {
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

function exportStarDeclaration(str: string, start: number, end: number, source: string) {
	return {
		start,
		end,
		source,
		toString(nameBySource: Map<string, string>) {
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

function isWhitespace(char: string) {
	// this is faster than testing a regex
	return char in whitespace_obj;
}

function isQuote(char: string) {
	return char === "'" || char === '"';
}

const namespaceImport = /^\*\s+as\s+(\w+)$/;
const defaultAndStarImport = /(\w+)\s*,\s*\*\s*as\s*(\w+)$/;
const defaultAndNamedImport = /(\w+)\s*,\s*{(.+)}$/;

function processImportSpecifiers(str: string): Specifier[] {
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

function processSpecifiers(str: string) {
	return str
		? str.split(',').map(part => {
			const [name, , as] = part.trim().split(/[^\S]+/);
			return { name, as: as || name };
		})
		: [];
}

function getImportDeclaration(str: string, i: number) {
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

function getImportStatement(i: number) {
	return {
		start: i,
		end: i + 6,
		toString() {
			return '__import'
		}
	};
}

function getExportDeclaration(str: string, i: number) {
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

function find(str: string): [Range[], Range[], Range[]] {
	let escapedFrom: State;
	let regexEnabled = true;
	let pfixOp = false;

	const stack: State[] = [];

	let lsci = -1; // last significant character index
	const lsc = () => str[lsci];

	var parenMatches: Record<string, number> = {};
	var openingParenPositions: Record<string, number> = {};
	var parenDepth = 0;

	const importDeclarations: Range[] = [];
	const importStatements: Range[] = [];
	const exportDeclarations: Range[] = [];

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

	const base: State = {
		pattern: /(?:(\()|(\))|({)|(})|(")|(')|(\/\/)|(\/\*)|(\/)|(`)|(import)|(export)|(\+\+|--))/g,

		handlers: [
			// (
			(i: number) => {
				lsci = i;
				openingParenPositions[parenDepth++] = i;
			},

			// )
			(i: number) => {
				lsci = i;
				parenMatches[i] = openingParenPositions[--parenDepth];
			},

			// {
			(i: number) => {
				lsci = i;
				stack.push(base);
			},

			// }
			(i: number) => {
				lsci = i;
				return stack.pop();
			},

			// "
			(i: number) => {
				stack.push(base);
				return double_quoted;
			},

			// '
			(i: number) => {
				stack.push(base);
				return single_quoted;
			},

			// //
			(i: number) => line_comment,

			// /*
			(i: number) => block_comment,

			// /
			(i: number) => {
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
			(i: number) => template_string,

			// import
			(i: number) => {
				if (i === 0 || isWhitespace(str[i - 1]) || punctuatorChars.test(str[i - 1])) {
					if (/import[\s\n{"']/.test(str.slice(i, i + 7))) {
						const d = getImportDeclaration(str, i);
						importDeclarations.push(d);
						p = d.end;
					}

					else if (str.slice(i, i + 7) === 'import(') {
						const s = getImportStatement(i);
						importStatements.push(s);
						p = s.end;
					}
				}
			},

			// export
			(i: number) => {
				if (i === 0 || isWhitespace(str[i - 1]) || punctuatorChars.test(str[i - 1])) {
					if (/export[\s\n{]/.test(str.slice(i, i + 7))) {
						const d = getExportDeclaration(str, i);
						exportDeclarations.push(d);
						p = d.end;
					}
				}
			},

			// ++/--
			(i: number) => {
				pfixOp = (!pfixOp && str[i - 1] === '+');
			}
		]
	};

	const slash: State = {
		pattern: /(?:(\[)|(\\)|(.))/g,

		handlers: [
			// [
			(i: number) => regexEnabled ? regex_character : base,

			// \\
			(i: number) => ((escapedFrom = regex), escaped),

			// anything else
			(i: number) => regexEnabled && !pfixOp ? regex : base
		]
	};

	const regex: State = {
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

	const regex_character: State = {
		pattern: /(?:(\])|(\\))/g,

		handlers: [
			// ]
			() => regex,

			// \\
			() => ((escapedFrom = regex_character), escaped)
		]
	};

	const double_quoted: State = {
		pattern: /(?:(\\)|("))/g,

		handlers: [
			// \\
			() => ((escapedFrom = double_quoted), escaped),

			// "
			() => stack.pop()
		]
	};

	const single_quoted: State = {
		pattern: /(?:(\\)|('))/g,

		handlers: [
			// \\
			() => ((escapedFrom = single_quoted), escaped),

			// '
			() => stack.pop()
		]
	};

	const escaped: State = {
		pattern: /(.)/g,

		handlers: [
			() => escapedFrom
		]
	};

	const template_string: State = {
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

	const line_comment = {
		pattern: /((?:\n|$))/g,

		handlers: [
			// \n
			() => base
		]
	};

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

	return [importDeclarations, importStatements, exportDeclarations];
}

export function transform(source: string, id: string) {
	const [importDeclarations, importStatements, exportDeclarations] = find(source);

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

	let transformed = `__shimport__.define('${id}', [${deps}], function(${names}){ `;

	const ranges: any[] = [
		...importDeclarations,
		...importStatements,
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
