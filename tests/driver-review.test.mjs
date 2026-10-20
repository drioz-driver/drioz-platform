import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const code=ts.transpileModule(readFileSync(new URL('../app/driver-review-summary.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};new Function('require','module','exports',code)(createRequire(import.meta.url),mod,mod.exports);
test('admin overview surfaces pending driver identity and review action',()=>{
 const html=renderToStaticMarkup(createElement(mod.exports.default,{pending:[{user_id:'test-id',name:'Review Applicant',email:'driver@example.com'}],total:1,onReview(){}}));
 assert.match(html,/1 driver application awaiting review/);assert.match(html,/Review Applicant/);assert.match(html,/Review applications/);assert.match(html,/Pending review/);
});
