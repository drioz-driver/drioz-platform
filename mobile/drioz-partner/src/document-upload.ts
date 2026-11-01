export const MAX_DOCUMENT_BYTES=4*1024*1024;
export const DOCUMENT_SIZE_MESSAGE='Choose a PDF, JPEG or PNG no larger than 4 MB. Compress the file or scan at a lower resolution and retry.';
export function documentUploadDetails(file:{name?:string;mimeType?:string;size?:number}){
 if(file.size!==undefined&&(!Number.isFinite(file.size)||file.size<=0))throw Error('The selected file is empty or unreadable. Choose another file.');
 if(file.size!==undefined&&file.size>MAX_DOCUMENT_BYTES)throw Error(DOCUMENT_SIZE_MESSAGE);
 const type=(file.mimeType||'').toLowerCase().split(';')[0];
 const name=file.name?.trim()||'';
 const byExtension=/\.pdf$/i.test(name)?'application/pdf':/\.jpe?g$/i.test(name)?'image/jpeg':/\.png$/i.test(name)?'image/png':'';
 const mime=type==='image/jpg'?'image/jpeg':type==='application/octet-stream'||!type?byExtension:type;
 if(!['application/pdf','image/jpeg','image/png'].includes(mime))throw Error('Choose a PDF, JPEG or PNG. Convert HEIC or other formats before uploading.');
 return {name:name||('document.'+(mime==='application/pdf'?'pdf':mime==='image/png'?'png':'jpg')),type:mime};
}
