import { pit, fpit } from '@need-some/test';
import { marshal } from '@need-some/basic/converter/converters';
import { StringReplacer } from '../module/stringreplacer';

describe('StringReplacer', () => {
	const params = [
		{ input: 'testit', params: undefined, expected: 'testit' },
		{ input: 'test string with ${param}', params: { param: 'booga' }, expected: 'test string with booga' },
		{ input: 'test string with dollar $', params: undefined, expected: 'test string with dollar $' },
		{ input: 'test string with colon :', params: undefined, expected: 'test string with colon :' },
		{ input: 'test string with escaped dollar ${$}', params: undefined, expected: 'test string with escaped dollar $' },
		{
			input: 'test string with escaped var sequence ${$}{var}',
			params: undefined,
			expected: 'test string with escaped var sequence ${var}'
		},
		{ input: 'test string with escaped colon ${:}', params: undefined, expected: 'test string with escaped colon :' },
		{ input: 'test string with nested ${${param}}', params: { param: 'booga', booga: 'loo' }, expected: 'test string with nested loo' },
		{
			input: 'test string with recursive ${${${param}}}',
			params: { param: 'booga', booga: 'param' },
			expected: 'test string with recursive booga'
		},
		{
			input: 'test string with concat ${${param}${booga}}',
			params: { param: 'booga', booga: 'loo', boogaloo: 'loo2' },
			expected: 'test string with concat loo2'
		},
		{
			input: 'test string with combined ${x${param}.${booga}}',
			params: { param: 'booga', booga: 'loo', xbooga: { loo: 'loo2' } },
			expected: 'test string with combined loo2'
		},
		{ input: 'test string with ${param.x}', params: { param: { x: 'booga' } }, expected: 'test string with booga' },
		{ input: 'test string with ${param.x }', params: { param: { x: 'booga' } }, expected: 'test string with booga' },
		{ input: 'test pipe ${param.x | upper}', params: { param: { x: 'booga' } }, expected: 'test pipe BOOGA' },
		{ input: 'test pipe ${param.u | upper}', params: { param: { x: 'booga' } }, expected: 'test pipe ' },
		{ input: 'test pipe ${param.x | capital(2)}', params: { param: { x: 'booga' } }, expected: 'test pipe BOoga' },
		{ input: 'test pipe ${param.x | capital(a)}', params: { param: { x: 'booga' } }, expected: 'test pipe booga' },
		{ input: 'test pipe ${param.x | capital(2}', params: { param: { x: 'booga' } }, expected: 'test pipe BOoga' },
		{ input: 'test pipe ${param.x | unknown}', params: { param: { x: 'booga' } }, expected: 'test pipe booga' },
		{ input: 'test pipe ${param.u | orElse(${param.x})}', params: { param: { x: 'booga' } }, expected: 'test pipe booga' },
		{ input: 'test pipe ${param.u | orElse(${param.x | upper})}', params: { param: { x: 'booga' } }, expected: 'test pipe BOOGA' },
		{ input: 'test pipe ${param.u | unknown(${param.x})}', params: { param: { x: 'booga' } }, expected: 'test pipe ' },
		{ input: 'test pipe ${param.u | capital(2}', params: { param: { x: 'booga' } }, expected: 'test pipe ' },
		{ input: 'test name ${param | name}', params: { param: { firstname: 'Thor', lastname: 'Jones' } }, expected: 'test name Thor Jones' },
		{
			input: 'test name ${param | name (normal)}',
			params: { param: { firstname: 'Thor', lastname: 'Jones' } },
			expected: 'test name Thor Jones'
		},
		{
			input: 'test name ${param | name (sort, short)}',
			params: { param: { firstname: 'Thor', lastname: 'Jones' } },
			expected: 'test name Jones, T.'
		},
		{
			input: 'test name ${param | name(${mode})}',
			params: { param: { firstname: 'Thor', lastname: 'Jones' }, mode: 'sort' },
			expected: 'test name Jones, Thor'
		},
		{
			input: 'test name ${param | name(${ mode })}',
			params: { param: { firstname: 'Thor', lastname: 'Jones' }, mode: 'sort' },
			expected: 'test name Jones, Thor'
		},
		{
			input: 'test name ${param | name(${mode}, ${mode2})}',
			params: { param: { firstname: 'Thor', lastname: 'Jones' }, mode: 'sort', mode2: 'short' },
			expected: 'test name Jones, T.'
		},
		{
			input: 'test name ${param | name(${mode}, ${mode0})}',
			params: { param: { firstname: 'Thor', lastname: 'Jones' }, mode: 'sort' },
			expected: 'test name Jones, Thor'
		},
		{
			input: 'test name ${param | name(${mode}) | capital(${cap})}',
			params: { param: { firstname: 'Thor', lastname: 'Jones' }, mode: 'sort', cap: 5 },
			expected: 'test name JONES, Thor'
		},
		{
			input: 'test name ${param | sortedName }',
			params: { param: { firstname: 'Thor', lastname: 'Jones' } },
			expected: 'test name Jones, Thor'
		},
		{
			input: 'test name ${param | sortedName(override)}',
			params: { param: { firstname: 'Thor', lastname: 'Jones' } },
			expected: 'test name Thor Jones'
		},
		{
			input: 'test name ${param | sortedName | upper}',
			params: { param: { firstname: 'Thor', lastname: 'Jones' } },
			expected: 'test name JONES, THOR'
		},
		{
			input: 'test name ${param | sortedName(override) | upper}',
			params: { param: { firstname: 'Thor', lastname: 'Jones' } },
			expected: 'test name THOR JONES'
		},
		{ input: 'test name ${param}', params: { param: { firstname: 'Thor', lastname: 'Jones' } }, expected: 'test name Thor Jones' },
		{
			input: 'complex pipe result ${notthere | orElse(${param}) | name}',
			params: { param: { firstname: 'The', lastname: 'Duke' } },
			expected: 'complex pipe result The Duke'
		},
		{
			input: 'complex params ${notthere | orElse({firstname: The, lastname: ${param}} | name}',
			params: { param: 'Duke' },
			expected: 'complex params The Duke'
		}
	];
	pit(p => `should replace '${p.input}' with '${p.expected}'`, params, param => {
		(<any>console).warnBak = (<any>console).warn;
		(<any>console).warn = function() {};

		const sut = new StringReplacer();
		sut.registerFormatter('upper', marshal(s => s.toUpperCase()));
		sut.registerFormatter('capital', marshal(s => s.value.substr(0, s.params[0]).toUpperCase() + s.value.substr(s.params[0])));
		const nameFormatter = s => {
			if (s.value === undefined) {
				return s.firstname + ' ' + s.lastname;
			} else {
				let f = s.value.firstname;
				const l = s.value.lastname;
				if (s.params && (s.params[0] === 'short' || s.params[1] === 'short')) {
					f = f.substr(0, 1) + '.';
				}
				if (s.params && (s.params[0] === 'sort' || s.params[1] === 'sort')) {
					return l + ', ' + f;
				} else {
					return f + ' ' + l;
				}
			}
		};
		sut.registerFormatter('name', marshal(nameFormatter));
		sut.registerFormatter('orElse', marshal(v => (v.value !== undefined ? v.value : v.params[0])));
		sut.registerFormatter('sortedName', marshal(nameFormatter), ['sort']);
		sut.registerResolver('name', value => value !== undefined && (<any>value).firstname !== undefined);
		const result = sut.replace(param.input, param.params);
		expect(result).toBe(param.expected);
		(<any>console).warn = (<any>console).warnBak;
	});

	describe('private', () => {
		describe('parsePipeParams', () => {
			const params = [
				{ title: 'empty', input: '', expected: [''] },
				{ title: 'simple string', input: 'simple', expected: ['simple'] },
				{ title: 'positive number', input: '5.2', expected: [5.2] },
				{ title: 'negative number', input: '-5.2', expected: [-5.2] },
				{ title: 'multiple parameters', input: 'simple, -5.2', expected: ['simple', -5.2] },
				{ title: 'empty parameter', input: 'simple, , -5.2', expected: ['simple', '', -5.2] },
				{ title: 'recursive call', input: '${rec1}', expected: ['##rec1##'] },
				{
					title: 'recursive call with complex arg',
					input: '${rec1 | pipe(${deeper|pipe({a:b, c:[d]})})}',
					expected: ['##rec1 | pipe(${deeper|pipe({a:b, c:[d]})})##']
				},
				{ title: 'object parameter', input: '{a:simple,b:, c:-5.2}', expected: [{ a: 'simple', b: '', c: -5.2 }] },
				{ title: 'object parameter with whitespace', input: '{ a : simple }', expected: [{ a: 'simple' }] },
				{ title: 'unclosed object parameter', input: '{a:simple,b:, c:-5.2', expected: [{ a: 'simple', b: '', c: -5.2 }] },
				{ title: 'array parameter', input: '[simple,, -5.2]', expected: [['simple', '', -5.2]] },
				{ title: 'unclosed array parameter', input: '[simple,, -5.2', expected: [['simple', '', -5.2]] },
				{ title: 'mixed parameter', input: 'simple,{b:, c:-5.2},[d,e]', expected: ['simple', { b: '', c: -5.2 }, ['d', 'e']] },
				{ title: 'nested object parameter', input: '{a:simple,b:{c:[0, 1, -5.2]}}', expected: [{ a: 'simple', b: { c: [0, 1, -5.2] } }] }
			];
			pit('should return ${title}', params, param => {
				const sut = new StringReplacer();
				(<any>sut).resolveVar = a => '##' + a + '##';
				const result = (<any>sut).parsePipeParams(param.input, {});
				expect(result).toEqual(param.expected);
			});
		});
	});
});
