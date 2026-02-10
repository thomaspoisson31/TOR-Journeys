const busboy = require('busboy');

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = [];

    // Normalize headers to lowercase because busboy expects 'content-type'
    const headers = {};
    for (const key in event.headers) {
      headers[key.toLowerCase()] = event.headers[key];
    }

    const bb = busboy({ headers });

    bb.on('file', (name, file, info) => {
      const { filename, encoding, mimeType } = info;
      const chunks = [];
      file.on('data', (data) => chunks.push(data));
      file.on('end', () => {
        files.push({
          fieldname: name,
          filename,
          encoding,
          mimeType,
          content: Buffer.concat(chunks)
        });
      });
    });

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('close', () => {
      resolve({ fields, files });
    });

    bb.on('error', (err) => {
      reject(err);
    });

    if (event.isBase64Encoded) {
      bb.write(Buffer.from(event.body, 'base64'));
    } else {
      bb.write(event.body);
    }
    bb.end();
  });
}

module.exports = { parseMultipart };
