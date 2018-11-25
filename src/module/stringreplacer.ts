import { lookup, splitBracket, Marshaller, startsWith } from '@need-some/basic';

// variables start with ${
const VARSTART = '${';

// variables are terminated with }
const VAREND = '}';

// object parameters start with {
const OBJSTART = '{';

// object keys and values are separated by:
const OBJSEPARATOR = ':';

// Test if string matches a valid key:value pattern
const OBJSEPARATOR_REGEX = /^[a-zA-Z0-9_]+\s*:/;

// array parameters start with [
const ARRAYSTART = '[';

// array parameters are terminated with ]
const ARRAYEND = ']';

// multiple pipes are separated by |
const PIPESEPARATOR = '|';

// pipe parameters start with (
const PARAMSTART = '(';

// pipe parameters end with )
const PARAMEND = ')';

// multiple parameters for one pipe are separated by ,
const PARAMSEPARATOR = ',';

// Test if string is a number
const NUMBER_REGEX = /^[-+]?(\d+|\d+\.\d*|\d*\.\d+)$/;

/**
 * Define any type, to denote special kind of any.
 * Parameters are accessable objects, where values can be obtained.
 */
// tslint:disable-next-line: no-any // everything can be a parameter
export type anyParam = any;

/**
 * Define any type, to denote special kind of any.
 * Objects in the pipe processing are really anything, the next pipe understands
 */
// tslint:disable-next-line: no-any // everything can be a pipe input
export type anyObject = any;

/**
 * A StringReplacer instance is used to format strings with defined formatters.
 */
export class StringReplacer {
	/**
	 * Named formatted instances
	 */
	private formatter = {};

	/**
	 * Named default parameters, indexed by the formatter name
	 */
	private defaultParams = {};

	/**
	 * Functions to determine default formatters for certain objects.
	 */
	private resolvers: { name: string; check: (any) => boolean }[] = [];

	/**
	 * Replace a string using the given parameters.
	 * The name can be used for a resolver or in a pipe call
	 * @param input The string that should be formatted.
	 * @param params The parameters to use in the replacement variables
	 * @returns a formatted string
	 */
	replace(input: string, params?: anyParam): string {
		return '' + this.doReplace(input, params, true);
	}

	/**
	 * Replace a string using the given parameters.
	 * The name can be used for a resolver or in a pipe call
	 * @param input The string that should be formatted.
	 * @param params The parameters to use in the replacement variables
	 * @param applyResolver flag indication if the default pipe resolvers should be applied
	 * @returns a formatted string or an object if only an object is references
	 */
	private doReplace(input: string, params?: anyParam, applyResolver?: boolean): anyObject {
		const parts = splitBracket(input, VARSTART, VAREND, [OBJSTART]);
		let varmode = false;
		const result = parts
			.map(part => {
				if (varmode) {
					varmode = false;
					return this.resolveVar(part, params, applyResolver);
				} else {
					varmode = true;
					return part;
				}
			})
			.filter(v => v !== '');
		return result.length === 1 ? result[0] : result.join('');
	}

	/**
	 * Register a formatter with a given name.
	 * The name can be used for a resolver or in a pipe call.
	 * <strong>Note</strong> that the same marshaller can be registered using different names with different default params
	 * @param name The name to register
	 * @param formatter The formatter function
	 * @param defaultParams params that are applied, if the name is used without own parameters or in a resolver
	 */
	registerFormatter(name: string, formatter: Marshaller<anyObject, anyObject>, defaultParams?: string[]): void {
		this.formatter[name] = formatter;
		this.defaultParams[name] = defaultParams;
	}

	/**
	 * Register an automated formatter for defined objects.
	 * The resolvers are checked in the order they are registered.
	 * Note that the resolvers are only used if no pipe is given at all.
	 *
	 * @param name The registered formatter to be used as default
	 * @param check Function to check if a given object can be formatted
	 */
	registerResolver(name: string, check: (object: anyObject) => boolean): void {
		this.resolvers.push({ name: name, check: check });
	}

	/**
	 * Replace variable by a value.
	 * The value itself and parameters can be recursive evaluations.
	 * allowed syntax examples for pipes are
	 * <ul>
	 *   <li>var.path</li>
	 *   <li>${var.path}</li>
	 *   <li>var.path | pipe</li>
	 *   <li>var.path | pipe | pipe2</li>
	 *   <li>var.path | pipe(string1,string2) | pipe2</li>
	 *   <li>var.path | pipe(${varalt | pipe2(...)},string2) | pipe2</li>
	 * </ul>
	 *
	 * @param string the full variable declaration
	 * @param params the overall replace params object.
	 * @param applyResolver flag indication if the default pipe resolvers should be applied
	 * @returns the evaluation result
	 */
	private resolveVar(string: string, params: anyParam, applyResolvers: boolean): anyObject {
		if (string === '$' || string === ':') {
			return string;
		}
		const pipes = this.splitOuter(string, PIPESEPARATOR, VARSTART);
		const initialValue = lookup(params, ('' + this.doReplace(pipes.shift(), params)).trim());
		let result;
		if (pipes.length > 0) {
			result = pipes.reduce((value, pipe) => this.applyPipe(value, pipe, params), initialValue);
		} else {
			const pipeName = applyResolvers ? this.resolvers.filter(r => r.check(initialValue)).map(r => r.name)[0] : undefined;
			if (pipeName !== undefined) {
				result = this.applyPipe(initialValue, pipeName, params);
			} else {
				result = initialValue;
			}
		}
		return result;
	}

	/**
	 * Call pipe to process a replacement variable.
	 * Parameters can be recursive evaluations.
	 * allowed syntax examples for one pipe are
	 * <ul>
	 *   <li>pipe</li>
	 *   <li>pipe(string1, string2)</li>
	 *   <li>pipe(${varalt | pipe2(...)}, string2)</li>
	 * </ul>
	 *
	 * @param value the value to pass to the pipe
	 * @param pipe the pipe processor name. Must be registered in this replacer.
	 * @param params the overall replace params object.
	 * @returns the pipe output
	 */
	private applyPipe(value: anyObject, pipe: string, params: anyParam): anyObject {
		pipe = pipe.trim();
		const open = pipe.indexOf(PARAMSTART);
		// if not correctly terminated, parse as if the missing end was given
		const close = pipe.substr(-1) === PARAMEND ? pipe.length - (open + 2) : pipe.length - (open + 1);
		const pipeName = open === -1 ? pipe : pipe.substr(0, open).trim();
		const pipeInstance = this.formatter[pipeName];
		let result = '';
		if (pipeInstance === undefined) {
			result = value;
		} else {
			const pipeParams = open === -1 ? this.defaultParams[pipeName] : this.parsePipeParams(pipe.substr(open + 1, close), false, params);
			let callValue = value;
			if (pipeParams !== undefined) {
				callValue = { value: value, params: pipeParams };
			}
			try {
				result = pipeInstance.marshal(callValue);
			} catch (ex) {
				console.warn('cannot marshal', pipe, ex);
			}
		}
		return result;
	}

	/**
	 * Retrieve params for pipe, after recursive evaluation.
	 * @param param the param input string.
	 * @param objectItem if the current parse looks for object keys.
	 * @param params the overall replace params object.
	 * @returns array of parameters for the pipe.
	 */
	private parsePipeParams(param: string, objectItem: boolean, params: anyParam): anyObject[] {
		const escapedBrackets = this.replaceAll(
			param,
			OBJSTART,
			OBJSTART + 'o',
			VAREND,
			'o' + VAREND,
			ARRAYSTART,
			OBJSTART + 'a',
			ARRAYEND,
			'a' + VAREND
		);
		const singleParams = this.splitOuter(escapedBrackets, PARAMSEPARATOR, OBJSTART).map(p =>
			this.replaceAll(p, OBJSTART + 'a', ARRAYSTART, 'a' + VAREND, ARRAYEND, OBJSTART + 'o', OBJSTART, 'o' + VAREND, VAREND)
		);
		const resolvedParams = singleParams.map(p => this.parsePipeParam(p, objectItem, params));
		return resolvedParams;
	}

	/**
	 * Replace multiple strings in order.
	 * @param param the param input string.
	 * @param replaceArgs the replace arguments in order search, replace, search, replace...
	 * @returns replaced string.
	 */
	private replaceAll(string: string, ...replaceArgs: string[]): string {
		let result = string;
		for (let i = 0; i < replaceArgs.length - 1; i += 2) {
			result = result.split(replaceArgs[i]).join(replaceArgs[i + 1]);
		}
		return result;
	}

	/**
	 * Parse one params for pipe, and perform recursive evaluation.
	 * @param param the param input string.
	 * @param objectItem if the current parse looks for object keys.
	 * @param params the overall replace params object.
	 * @returns parameter for the pipe.
	 */
	private parsePipeParam(param: string, objectItem: boolean, params: anyParam): anyObject[] {
		param = param.trim();
		let result;
		if (startsWith(param, OBJSTART)) {
			param = param.substr(1);
			param = param.substr(0, param.length - 1);
			param = param.trim();
			const items = this.parsePipeParams(param, true, params);
			result = {};
			items.forEach(i => (result[i.key] = i.value));
		} else if (startsWith(param, ARRAYSTART)) {
			param = param.substr(1);
			param = param.substr(0, param.length - 1);
			param = param.trim();
			result = this.parsePipeParams(param, false, params);
		} else if (objectItem && OBJSEPARATOR_REGEX.test(param)) {
			const index = param.indexOf(OBJSEPARATOR);
			const key = param.substr(0, index).trim();
			const value = this.parsePipeParam(param.substr(index + 1).trim(), false, params);
			result = { key: key, value: value };
		} else {
			result = this.doReplace(param, params);
			if (NUMBER_REGEX.test(result)) {
				result = +result;
			}
		}
		return result;
	}

	/**
	 * Split an outmost string, parts within brackets are not considered.
	 * Internally used to split pipes and pipe paramters.
	 * E.g. <code>hello ${world | translate} | emphasize</code>
	 * would be split into <code>hello ${world | translate}</code>
	 * and <code>emphasize</code>
	 *
	 * @param string the string to split
	 * @param delim the delimiter (<code>|</code> for pipes, <code>,</code> for parameters)
	 * @param start the start of outmost brackets (<code>${</code> for pipes, <code>{</code> for parameters)
	 * @returns array of strings
	 */
	private splitOuter(string: string, delim: string, start: string): string[] {
		const parts = splitBracket(string, start, VAREND, [OBJSTART]);
		const result = [''];
		let varmode = false;
		parts.forEach(part => {
			if (varmode) {
				result[result.length - 1] += start + part + VAREND;
				varmode = false;
			} else {
				const tokens = part.split(delim);
				// add first part to already started pipe def
				result[result.length - 1] += tokens.shift();
				result[result.length - 1] = result[result.length - 1].trim();
				tokens.forEach(t => result.push(t));
				varmode = true;
			}
		});
		result[result.length - 1] = result[result.length - 1].trim();
		return result;
	}
}
