# Shimport changelog

## 2.0.4

* Publish as ES5 so that browsers can use Shimport untranspiled ([#34](https://github.com/Rich-Harris/shimport/issues/34))

## 2.0.3

* Fall back to `eval` if `document` is undefined ([#26](https://github.com/Rich-Harris/shimport/issues/26))

## 2.0.2

* Coerce `id` to string ([#32](https://github.com/Rich-Harris/shimport/pull/32))

## 2.0.1

* Fix regex

## 2.0.0

* Switch to MIT License ([#28](https://github.com/Rich-Harris/shimport/issues/28))
* Support `import.meta.url` ([#31](https://github.com/Rich-Harris/shimport/pull/31))

## 1.0.1

* Handle `export default` followed by non-whitespace character ([#22](https://github.com/Rich-Harris/shimport/issues/22))

## 1.0.0

* Stable release

## 0.0.16

* Fix template string transformation ([#20](https://github.com/Rich-Harris/shimport/issues/20))

## 0.0.15

* Use blob URLs for stack traces ([#17](https://github.com/Rich-Harris/shimport/pull/17))
* Fix code transformation with `$` character in template strings ([#16](https://github.com/Rich-Harris/shimport/issues/16))
* Fix false positive keyword detection ([#8](https://github.com/Rich-Harris/shimport/issues/8))

## 0.0.14

* Handle anonymous `class extends` ([#13](https://github.com/Rich-Harris/shimport/issues/13))

## 0.0.13

* Handle anonymous default class/function exports ([#13](https://github.com/Rich-Harris/shimport/issues/13))

## 0.0.12

* Handle minified export-from declarations ([#12](https://github.com/Rich-Harris/shimport/pull/12))

## 0.0.11

* Handle minified bare imports
* Ignore punctuators when determining declaration names ([#3](https://github.com/Rich-Harris/shimport/issues/3))

## 0.0.10

* Another minified dynamic import case
* Use `getAttribute('data-main')` instead of `dataset.main` for older browsers
* Avoid `[].find`, so it doesn't need polyfilling

## 0.0.9

* Handle minified dynamic import

## 0.0.8

* Add VERSION export

## 0.0.7

* Handle semi-colon-separated declarations

## 0.0.6

* Handle minified declarations

## 0.0.5

* Handle empty imports/exports

## 0.0.4

* Speed

## 0.0.3

* More fixes

## 0.0.2

* Various fixes

## 0.0.1

* First (experimental) release
