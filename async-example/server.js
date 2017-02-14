const anagram = require('anagram');
const child_process = require('child_process');
const fs = require('fs');
const http = require('http');
const querystring = require('querystring');
const url = require('url');

const hostname = '127.0.0.1';
const port = 2525;

function serveFile(filePath, contentType, response) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(500);
      response.end(`Server error: ${error.code}`);
    } else {
      response.writeHead(200, { 'Content-Type': contentType });
      response.end(content, 'utf-8');
    }
  });
}

function serveHtmlFile(filePath, response) {
  return serveFile(filePath, 'text/html', response);
}

function serveJsFile(filePath, response) {
  return serveFile(filePath, 'text/javascript', response);
}

function serveCssFile(filePath, response) {
  return serveFile(filePath, 'text/css', response);
}

function lookupWord(word) {
  return new Promise((resolve) => {
    child_process.execFile(
      'grep',
      ['-Fqx', word, '/usr/share/dict/words'],
      (error) => {
        resolve({
          'word': word,
          'isAWord': !error
        });
      });
  });
}

function serveAnagramLookup(urlObject, response) {
  const query = querystring.parse(urlObject.query);
  const word = query['word'];
  lookupWord(word)
      .then((results) => {
        response.writeHead(200, {'Content-Type': 'application/json'})
        response.write(JSON.stringify(results));
        response.end('\n');
      });
}

/**
 * Initialize the server.
 * @return {!Promise<void>} that resolves when the server is listening.
 */
function initializeServer(hostname, port) {
  const server =
    http.createServer(
        (req, res) => {
          const urlObject = url.parse(req.url);
          const pathname = urlObject.pathname
          if (pathname.match(/^\/(index\.html)?$/)) {
            serveHtmlFile('index.html', res);
          } else if (pathname == '/main.js') {
            serveJsFile('main.js', res);
          } else if (pathname == '/style.css') {
            serveCssFile('style.css', res);
          } else if (pathname == '/lookup') {
            serveAnagramLookup(urlObject, res);
          } else {
            res.writeHead(404, 'File not found.');
            res.end();
          }
        });
  return new Promise((resolve) => {
    server.listen(port, hostname, resolve);
  });
}


initializeServer(hostname, port)
  .then(() => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });
// vim: ts=2 sw=2 et :
