import test from 'node:test';
import assert from 'node:assert/strict';
import {documentUploadDetails,MAX_DOCUMENT_BYTES} from '../mobile/drioz-partner/src/document-upload.ts';
import {documentUploadDetails as legacy} from '../mobile/src/document-upload.ts';
for(const [name,details] of [['partner',documentUploadDetails],['legacy',legacy]] as const){
 test(name+': omitted picker MIME is recovered from extension and supported MIME gets a filename',()=>{assert.deepEqual(details({name:'licence.PDF',size:200}),{name:'licence.PDF',type:'application/pdf'});assert.deepEqual(details({mimeType:'image/jpeg',size:MAX_DOCUMENT_BYTES}),{name:'document.jpg',type:'image/jpeg'});assert.equal(details({name:'id.png',mimeType:'application/octet-stream',size:2}).type,'image/png')});
 test(name+': oversized, empty, unreadable and unsupported documents are rejected before sending',()=>{assert.throws(()=>details({name:'x.pdf',size:MAX_DOCUMENT_BYTES+1}),/4 MB/);assert.throws(()=>details({name:'x.pdf',size:0}),/empty/);assert.throws(()=>details({name:'x.heic',mimeType:'image/heic',size:100}),/HEIC/);assert.throws(()=>details({name:'x.pdf',size:NaN}),/empty/)});
}
