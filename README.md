# need-some-i18n.js
[![Build Status](https://travis-ci.org/need-some/need-some-i18n.js.svg?branch=master)](https://travis-ci.org/need-some/need-some-i18n.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/%40need-some%2Fi18n.svg)](https://badge.fury.io/js/%40need-some%2Fi18n)
[![need-some/i18n](https://img.shields.io/badge/need--some-i18n-ff69b4.svg)](https://www.npmjs.com/org/need-some)
[![Dependencies](https://david-dm.org/need-some/need-some-i18n.js/status.svg)](https://david-dm.org/need-some/need-some-i18n.js)

_need-some_ is a collection of small yet useful functions.
The i18n package provides string formatting extensions

## Installation
Simply install as dependency

	npm install @need-some/i18n --save

### String replacemant

The string replacer is a tool that recursively applies parameters to variables in string inputs.

	import { StringReplacer } from '../module/stringreplacer';
	const replacer = new StringReplacer();
	console.log(replacer.replace('hello')); // the most simple test outputs the input string 'hello'
	console.log(replacer.replace('hello ${var}', {var: 'world'})); // a plain parameter is replaced to 'hello world'
	console.log(replacer.replace('hello ${var} from ${who}', {var: 'world', who: 'need-some'})); // multiple parameters as well to 'hello world from need-some'

#### variable replacement

The variable replacement allows formatting and recursive calls.

Formatters need to be registered before use

	import { StringReplacer } from '../module/stringreplacer';
	import { marshal } from '@need-some/basic/converter/converters';
	const replacer = new StringReplacer();
	replacer.registerFormatter('upper', marshal(s => s.toUpperCase()));
	replacer.registerFormatter('constant', marshal(s => 'hello world'));
	replacer.registerFormatter('name', marshal(s => s.firstname + ' ' + s.lastname));

Default formatters can be registered for tested types

	replacer.registerResolver('constant', value => value === undefined);
	replacer.registerResolver('name', value => value && value.firstname);

__Note__ that the formatters need to accept values of the variable type if they are called without parenthesis, 
but an object of type {value:any, params:any[]} if called with parenthesis

	replacer.registerFormatter('concat', marshal(s => s.value + s.params[0]));

If both should be acceptable, the formatter needs to distinguish

	replacer.registerFormatter('concat', marshal(s => s.params === undefined ? s : (s.value + s.params[0])));


This way even complex object can be simply inserted

	console.log(replacer.replace('hello ${var}', {var: {firstname: 'The', lastname: 'Doctor'}}));


rule | input | parameters | output
--- | --- | --- | ---
lookup variable | `${param}` | `{param: 'booga'}` | `booga`
lookup child variable | `${param.x}` | `{param: {x: 'booga'}}` | `booga`
recursive lookup | `${${param}}` | `{ param: 'booga', booga: 'loo' }` | `loo`
recursive cyclic lookup | `${${${param}}}` | `{ param: 'booga', booga: 'param' }` | `booga`
recursive lookup of complex string | `${x${param}.${booga}}` | `{ param: 'booga', booga: 'loo', xbooga:{loo: 'loo2' }}` | `loo2`
pipe processing | `${param.x | upper}` | `{param: {x: 'booga'}}` | `BOOGA`
pipe with parameters | `${var | concat(1)}` | `{var: 'variant', two:'2'}` | `variant1`
pipe with variable parameters | `${var | concat(${two})}` | `{var: 'variant', two:'2'}` | `variant2`
pipe with parameter replacement | `${var | concat(${three|upper})}` | `{var: 'variant', three:'three'}` | `variantTHREE`
multiple pipes | `${param.x | upper | concat(${param.x})}` | `{param: {x: 'booga'}}` | `BOOGAbooga`


#### methods

##### replace

Replace a string using the given parameters.
The name can be used for a resolver or in a pipe call
 * _input_ The string that should be formatted.
 * _params_ The parameters to use in the replacement variables
 * returns a formatted string

	replace(input: string, params?: anyParam): string

##### registerFormatter

Register a formatter with a given name.
The name can be used for a resolver or in a pipe call.

__Note__ that the same marshaller can be registered using different names with different default params
 * _name_ The name to register
 * _formatter_ The formatter function
 * _defaultParams_ params that are applied, if the name is used without own parameters or in a resolver

	registerFormatter(name: string, formatter: Marshaller<anyObject, anyObject>, defaultParams?: string[]): void

##### registerResolver

Register an automated formatter for defined objects.
The resolvers are checked in the order they are registered.

__Note__ that the resolvers are only used if no pipe is given at all.
 * _name_ The registered formatter to be used as default
 * _check_ Function to check if a given object can be formatted

	registerResolver(name: string, check: (object: anyObject) => boolean): void
