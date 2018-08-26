type State = (char: string, i: number) => State;

type Specifier = {
	name: string;
	as: string;
}

interface Range {
	start: number;
	end: number;
	[key: string]: any;
}

function importDecl(str: string, start: number, end: number, specifiers: Specifier[], source: string) {
	const hint = specifiers.find(s => s.name === '*' || s.name === 'default');
	const name = hint && hint.as;

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
					if (s.name === 'default') return `${s.as} = ${name}.default;`;
					return `var ${s.as} = ${name}.${s.name};`;
				});

			return (
				assignments.join(' ') + ' /*' +
				str.slice(start, end) + '*/'
			).trim();
		}
	};
}

function importStmt(start: number, end: number) {
	return {
		start,
		end,
		toString() {
			return '__import'
		}
	};
}

function exportDefaultDeclaration(str: string, start: number, end: number) {
	while (/\S/.test(str[end])) end += 1;

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
					return `__exports.${s.as} = ${name ? `${name}.${s.name}` : s.name};`;
				})
				.join(' ') + ` /*${str.slice(start, end)}*/`
		}
	};
}

function exportDecl(str: string, start: number, c: number) {
	const end = c;

	while (/\S/.test(str[c])) c += 1;
	while (str[c] && !/\S/.test(str[c])) c += 1;

	const nameStart = c;
	while (/\S/.test(str[c])) c += 1;
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
const keywordChars = /[a-z]/;

const whitespace_obj = { ' ': 1, '\t': 1, '\n': 1, '\r': 1, '\f': 1, '\v': 1, '\u00A0': 1, '\u2028': 1, '\u2029': 1 };

function isWhitespace(char: string) {
	// this is faster than testing a regex
	return char in whitespace_obj;
}

function isQuote(char: string) {
	return char === "'" || char === '"';
}

const namespaceImport = /^\*\s+as\s+(\w+)$/;
const defaultAndNamedImport = /(\w+)\s*,\s*{(.+)}$/;

function processImportSpecifiers(str: string): Specifier[] {
	let match = namespaceImport.exec(str);
	if (match) {
		return [{ name: '*', as: match[1] }];
	}

	match = defaultAndNamedImport.exec(str);
	if (match) {
		return [{ name: 'default', as: match[1] }].concat(processSpecifiers(match[2].trim()));
	}

	if (str[0] === '{') return processSpecifiers(str.slice(1, -1).trim());

	return [{ name: 'default', as: str }];
}

function processSpecifiers(str: string) {
	return str.split(',').map(part => {
		const [name, , as] = part.trim().split(/[^\S]+/);
		return { name, as: as || name };
	});
}

function find(str: string): [Range[], Range[], Range[]] {
	let quote: string;
	let escapedFrom: State;
	let regexEnabled = true;
	let pfixOp = false;

	const stack: State[] = [];

	let start: number;
	let state = base;

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

	const handlers: Record<string, (i: number) => State> = {
		'(': (i: number) => {
			lsci = i;
			openingParenPositions[parenDepth++] = i;
			return base;
		},

		')': (i: number) => {
			lsci = i;
			parenMatches[i] = openingParenPositions[--parenDepth];
			return base;
		},

		'{': (i: number) => {
			lsci = i;
			stack.push(base);
			return base;
		},

		'}': (i: number) => {
			lsci = i;
			return (start = i + 1), stack.pop();
		},

		'"': (i: number) => {
			start = i + 1;
			quote = '"';
			stack.push(base);
			return string;
		},

		"'": (i: number) => {
			start = i + 1;
			quote = "'";
			stack.push(base);
			return string;
		},

		'/': (i: number) => {
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

			start = i;
			return slash;
		},

		'`': (i: number) => {
			start = i + 1;
			return templateString;
		},

		'i': (i: number) => {
			if (/import[\s\n]/.test(str.slice(i, i + 7))) return importDeclaration(i);
			if (str.slice(i, i + 7) === 'import(') return importStatement(i);
			return base;
		},

		'e': (i: number) => {
			if (str.slice(i, i + 7) === 'export ') return exportDeclaration(i);
			return base;
		},

		'+': (i: number) => {
			pfixOp = (!pfixOp && str[i - 1] === '+');
			return base;
		},

		'-': (i: number) => {
			pfixOp = (!pfixOp && str[i - 1] === '-');
			return base;
		}
	}

	function base(char: string, i: number): State {
		if (char in handlers) return handlers[char](i);

		if (!isWhitespace(char)) lsci = i;
		pfixOp = false;

		return base;
	}

	function importDeclaration(i: number): State {
		const start = i;

		const specifierStart = i += 7;
		while (str[i] && !isQuote(str[i])) i += 1;
		const specifierEnd = i;

		const sourceStart = i += 1;
		while (str[i] && !isQuote(str[i])) i += 1;
		const sourceEnd = i++;

		importDeclarations.push(importDecl(
			str,
			start,
			i,
			processImportSpecifiers(str.slice(specifierStart, specifierEnd).replace(/from\s*$/, '').trim()),
			str.slice(sourceStart, sourceEnd)
		));

		return base;
	}

	function importStatement(i: number): State {
		importStatements.push(importStmt(
			i,
			i += 6
		));

		return base;
	}

	function exportDeclaration(i: number): State {
		const start = i;

		i += 7;
		while (isWhitespace(str[i])) i += 1;

		const declarationStart = i;

		if (str[i] === '{') {
			while (str[i] !== '}') i += 1;
			i += 1;

			const specifiersEnd = i;

			let source = null;

			while (isWhitespace(str[i])) i += 1;
			if (/^from[\s\n]/.test(str.slice(i, i + 5))) {
				i += 5;

				while (str[i] && !isQuote(str[i])) i += 1;
				const sourceStart = i += 1;
				while (str[i] && !isQuote(str[i])) i += 1;

				source = str.slice(sourceStart, i);
				i += 1;
			}

			exportDeclarations.push(exportSpecifiersDeclaration(
				str,
				start,
				declarationStart,
				specifiersEnd,
				i,
				source
			));
		}

		else if (str[i] === '*') {
			i += 1;
			while (isWhitespace(str[i])) i += 1;
			i += 4;
			while (str[i] && !isQuote(str[i])) i += 1;

			const sourceStart = i += 1;
			while (str[i] && !isQuote(str[i])) i += 1;
			const sourceEnd = i++;

			exportDeclarations.push(exportStarDeclaration(
				str,
				start,
				i,
				str.slice(sourceStart, sourceEnd)
			));
		}

		else if (/default[\s\n]/.test(str.slice(i, i + 8))) {
			exportDeclarations.push(exportDefaultDeclaration(
				str,
				start,
				declarationStart
			));
		}

		else {
			exportDeclarations.push(exportDecl(
				str,
				start,
				declarationStart
			));
		}

		return base;
	}

	function slash(char: string, i: number) {
		if (char === '/') {
			return (start = i + 1), lineComment;
		}
		if (char === '*') {
			return (start = i + 1), blockComment;
		}
		if (char === '[') {
			return regexEnabled ? ((start = i), regexCharacter) : base;
		}
		if (char === '\\') {
			return (start = i), (escapedFrom = regex), escaped;
		}
		return regexEnabled && !pfixOp ? ((start = i), regex) : base;
	}

	function regex(char: string, i: number): State {
		if (char === '[') {
			return regexCharacter;
		}
		if (char === '\\') {
			return (escapedFrom = regex), escaped;
		}

		if (char === '/') {
			return base;
		}

		return regex;
	}

	function regexCharacter(char: string): State {
		if (char === ']') {
			return regex;
		}
		if (char === '\\') {
			return (escapedFrom = regexCharacter), escaped;
		}
		return regexCharacter;
	}

	function string(char: string, i: number): State {
		if (char === '\\') {
			return (escapedFrom = string), escaped;
		}
		if (char === quote) {
			return stack.pop();
		}

		return string;
	}

	function escaped() {
		return escapedFrom;
	}

	function templateString(char: string, i: number): State {
		if (char === '$') templateStringDollar;
		if (char === '\\') return (escapedFrom = templateString), escaped;
		if (char === '`') return base;

		return templateString;
	}

	function templateStringDollar(char: string, i: number) {
		if (char === '{') {
			stack.push(templateString);
			return base;
		}
		return templateString(char, i);
	}

	function lineComment(char: string): State {
		return (char === '\n') ? base : lineComment;
	}

	function blockComment(char: string): State {
		return (char === '*') ? blockCommentEnding : blockComment;
	}

	function blockCommentEnding(char: string) {
		return (char === '/') ? base : blockComment(char);
	}

	for (var i = 0; i < str.length; i += 1) {
		if (!state) {
			throw new Error(`Error parsing module at character ${i}`);
		}

		state = state(str[i], i);
	}

	// cheeky hack
	if (state.name === 'lineComment') {
		state('\n', str.length);
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
		if (d.name) transformed += `\n__exports.${d.name} = ${d.name};`;
	});

	transformed += `\n});\n//# sourceURL=${id}`;

	return transformed;
}
