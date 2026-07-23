/**
 * build.js — 本物の page_*.html から GitHub Pages 用の静的LIFFページを生成
 * ==================================================================
 * 実行: node liff-web/build.js  （birthday-bot/ で）
 *
 * 変換:
 *   <?!= include('shared_head'); ?>  → shared_head.html を差し込み
 *   <?!= include('shared_liff'); ?>  → LIFF SDK + config.js + shared_liff_web.js
 *   <?!= paramsJson ?>               → null（draftはlocation.searchから取得）
 * 生成物は liff-web/<page>.html。config.js（LIFF_ID/GAS_URL）は別ファイルで管理。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = __dirname;
const sharedHead = fs.readFileSync(path.join(ROOT, 'shared_head.html'), 'utf8');

const liffHead =
  '<script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>' +
  '<script src="./config.js"></script>' +
  '<script src="./shared_liff_web.js"></script>';

const pages = fs.readdirSync(ROOT).filter(f => /^page_.*\.html$/.test(f) && f !== 'page_admin.html');

pages.forEach(file => {
  let html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  html = html.replace(/<\?!?=?\s*include\('shared_head'\);?\s*\?>/g, sharedHead);
  html = html.replace(/<\?!?=?\s*include\('shared_liff'\);?\s*\?>/g, liffHead);
  html = html.replace(/<\?!?=?\s*paramsJson\s*\?>/g, 'null');
  html = html.replace(/<\?=\s*liffId\s*\?>/g, '');
  const outName = file.replace(/^page_/, '').replace(/\.html$/, '') + '.html';
  fs.writeFileSync(path.join(OUT, outName), html, 'utf8');
  console.log('generated liff-web/' + outName);
});
console.log('done: ' + pages.length + ' pages (admin は別途)');
