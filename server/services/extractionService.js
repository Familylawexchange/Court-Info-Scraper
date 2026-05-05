const fs = require('node:fs');
const path = require('node:path');
const db = require('../db/database');
const searchIndex = require('./searchIndexService');
const { DATA_ROOT } = require('../config');
async function extractDocument(documentId) {
  const doc = db.get('SELECT * FROM documents WHERE id = @id', { id: documentId });
  if (!doc) throw new Error('Document not found');
  const buffer = fs.readFileSync(doc.file_path);
  const ext = path.extname(doc.original_file_name || doc.file_name || '').toLowerCase();
  let text = '';
  let method = 'unsupported';
  let status = 'failed';
  if (doc.file_type === 'text/plain' || ext === '.txt' || ext === '.csv') {
    text = buffer.toString('utf8'); method = ext === '.csv' ? 'csv text extraction' : 'txt'; status = 'complete';
  } else if (doc.file_type === 'application/pdf' || ext === '.pdf') {
    text = buffer.toString('latin1').replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, ' ').replace(/\s+/g, ' ').trim();
    method = text.length > 200 ? 'pdf text extraction (basic local parser)' : 'pdf ocr placeholder';
    status = text.length > 200 ? 'complete' : 'pending ocr';
  } else if (doc.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx') {
    text = buffer.toString('utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    method = text.length ? 'docx text extraction (basic local parser)' : 'docx extraction placeholder';
    status = text.length ? 'complete' : 'pending';
  } else if (/image\/(png|jpeg)/.test(doc.file_type || '') || ['.jpg','.jpeg','.png'].includes(ext)) {
    method = 'ocr placeholder'; status = 'pending ocr';
  }
  db.insert('extracted_text', { document_id: documentId, text, extraction_method: method, extraction_status: status, confidence_score: status === 'complete' ? 0.6 : 0 });
  db.run('UPDATE documents SET extraction_status = @status, updated_at = CURRENT_TIMESTAMP WHERE id = @id', { id: documentId, status });
  if (text && status === 'complete') {
    const dir = path.join(DATA_ROOT, 'extracted-text');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${documentId}.txt`), text);
    searchIndex.indexItem('document', documentId, searchIndex.buildText([doc.document_title, doc.case_name, doc.source_name, text]), false);
  }
  return { status, method, textLength: text.length };
}
module.exports = { extractDocument };
