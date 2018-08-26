type State = (char: string, i: number) => State;

type Specifier = {
	name: string;
	as: string;
}

type ImportDeclaration = {
	start: number;
	end: number;
	specifiers: Specifier[];
	source: string;
	name: string;
	assignments: string[];
}

const keywords = /\b(case|default|delete|do|else|in|instanceof|new|return|throw|typeof|void)\s*$/;
const punctuators = /(^|\{|\(|\[\.|;|,|<|>|<=|>=|==|!=|===|!==|\+|-|\*\%|<<|>>|>>>|&|\||\^|!|~|&&|\|\||\?|:|=|\+=|-=|\*=|%=|<<=|>>=|>>>=|&=|\|=|\^=|\/=|\/)\s*$/;
const ambiguous = /(\}|\)|\+\+|--)\s*$/;

const punctuatorChars = /[{}()[.;,<>=+\-*%&|\^!~?:/]/;
const keywordChars = /[a-z]/;

const whitespace = /\s/;

function isWhitespace(char: string) {
	return whitespace.test(char);
}

function isPunctuatorChar(char: string) {
	return punctuatorChars.test(char);
}

function isKeywordChar(char: string) {
	return keywordChars.test(char);
}

function isPunctuator(str: string) {
	return punctuators.test(str);
}

function isKeyword(str: string) {
	return keywords.test(str);
}

function isAmbiguous(str: string) {
	return ambiguous.test(str);
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
		const [name, , as] = part.split(/[^\S]+/);
		return { name, as: as || name };
	});
}

function find(str: string) {
	let quote: string;
	let escapedFrom: State;
	let regexEnabled = true;
	let pfixOp = false;

	const stack: State[] = [];
	const importDeclarations: ImportDeclaration[] = [];

	let start: number;
	let state = base;

	let lsci = -1; // last significant character index
	const lsc = () => str[lsci];

	var parenMatches: Record<string, number> = {};
	var openingParenPositions: Record<string, number> = {};
	var parenDepth = 0;

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

	function base(char: string, i: number): State {
		// the order of these tests is based on which characters are
		// typically more prevalent in a codebase
		if (char === '(') {
			lsci = i;
			openingParenPositions[parenDepth++] = i;
			return base;
		}

		if (char === ')') {
			lsci = i;
			parenMatches[i] = openingParenPositions[--parenDepth];
			return base;
		}

		if (char === '{') {
			lsci = i;
			stack.push(base);
			return base;
		}

		if (char === '}') {
			lsci = i;
			return (start = i + 1), stack.pop();
		}

		if (char === '"' || char === "'") {
			start = i + 1;
			quote = char;
			stack.push(base);
			return string;
		}

		if (char === '/') {
			// could be start of regex literal OR division punctuator. Solution via
			// http://stackoverflow.com/questions/5519596/when-parsing-javascript-what-determines-the-meaning-of-a-slash/27120110#27120110

			var b = i;
			while (b > 0 && isWhitespace(str[b - 1])) {
				b -= 1;
			}

			if (b > 0) {
				var a = b;

				if (isPunctuatorChar(str[a - 1])) {
					while (a > 0 && isPunctuatorChar(str[a - 1])) {
						a -= 1;
					}
				} else {
					while (a > 0 && isKeywordChar(str[a - 1])) {
						a -= 1;
					}
				}

				var token = str.slice(a, b);

				regexEnabled = token
					? isKeyword(token) ||
					  isPunctuator(token) ||
					  (isAmbiguous(token) && !tokenClosesExpression())
					: false;
			} else {
				regexEnabled = true;
			}

			start = i;
			return slash;
		}

		if (char === '`') {
			start = i + 1;
			return templateString;
		}

		if (char === '+' && !pfixOp && str[i - 1] === '+') {
			pfixOp = true;
		} else if (char === '-' && !pfixOp && str[i - 1] === '-') {
			pfixOp = true;
		}

		if (char === 'i') {
			if (str.slice(i, i + 7) === 'import ') return importDeclaration(i);
			if (str.slice(i, i + 7) === 'import(') return importStatement;
		}

		if (char === 'e') {
			if (str.slice(i, i + 7) === 'export ') return exportDeclaration;
		}

		if (!isWhitespace(char)) {
			lsci = i;
		}
		return base;
	}

	function importDeclaration(i: number): State {
		const start = i;

		const specifierStart = i += 7;
		while (!isQuote(str[i])) i += 1;
		const specifierEnd = i;

		const sourceStart = i += 1;
		while (!isQuote(str[i])) i += 1;
		const sourceEnd = i++;

		importDeclarations.push({
			start,
			end: i,
			specifiers: processImportSpecifiers(str.slice(specifierStart, specifierEnd).replace(/from\s*$/, '').trim()),
			source: str.slice(sourceStart, sourceEnd),
			// figure these out later
			name: null,
			assignments: null
		});

		return base;
	}

	function importStatement(char: string, i: number): State {
		throw new Error(`TODO import statements`);
	}

	function exportDeclaration(char: string, i: number): State {
		throw new Error(`TODO export declarations`);
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
			throw new Error(`Error parsing module`);
		}

		state = state(str[i], i);
	}

	// cheeky hack
	if (state.name === 'lineComment') {
		state('\n', str.length);
	}

	return [importDeclarations];
}

export function transform(source: string, id: string) {
	const imports = [];

	const [importDeclarations] = find(source);

	// TODO dedupe imports
	importDeclarations.forEach((d, i) => {
		const hint = d.specifiers.find(s => s.name === '*' || s.name === 'default');
		d.name = hint ? hint.as : `__import_${i}`;

		d.assignments = d.specifiers
			.sort((a, b) => {
				if (a.name === 'default') return 1;
				if (b.name === 'default') return -1;
			})
			.map(s => {
				if (s.name === '*') return null;
				if (s.name === 'default') return `${s.as} = ${d.name}.default;`;
				return `var ${s.as} = ${d.name}.${s.name};`;
			});
	});

	const sources = importDeclarations.map(x => x.source);

	// TODO account for dynamic imports

	const deps = importDeclarations.map(d => `'${d.source}'`).join(', ');
	const names = importDeclarations.map(d => d.name).join(', ');

	let transformed = `__shimport__.load('${id}', [${deps}], function(${names}){`;

	let c = 0;

	for (let i = 0; i < importDeclarations.length; i += 1) {
		const d = importDeclarations[i];
		transformed += (
			source.slice(c, d.start) +
			d.assignments.join(' ') + ' /*' +
			source.slice(d.start, c = d.end) + '*/'
		);
	}

	transformed += source.slice(c) + '\n});'

	return transformed;
}
