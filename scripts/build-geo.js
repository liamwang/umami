/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const tar = require('tar');

if (process.env.VERCEL) {
  console.log('Vercel environment detected. Skipping geo setup.');
  process.exit(0);
}

const db = 'GeoLite2-City';

let url = `https://raw.githubusercontent.com/GitSquared/node-geolite2-redist/master/redist/${db}.tar.gz`;

if (process.env.MAXMIND_LICENSE_KEY) {
  url =
    `https://download.maxmind.com/app/geoip_download` +
    `?edition_id=${db}&license_key=${process.env.MAXMIND_LICENSE_KEY}&suffix=tar.gz`;
}

const dest = path.resolve(__dirname, '../geo');
if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest);
}

const zipfile = path.join(dest, `${db}.tar.gz`);
const filename = path.join(dest, `${db}.mmdb`);

const download = url =>
  new Promise(resolve => {
    https.get(url, res => {
      resolve(res.pipe(zlib.createGunzip({})).pipe(tar.t()));
    });
  });

const extract = stream =>
  new Promise((resolve, reject) => {
    stream.on('entry', entry => {
      if (entry.path.endsWith('.mmdb')) {
        entry.pipe(fs.createWriteStream(filename));
        console.log('Saved geo database:', filename);
      }
    });
    stream.on('error', e => {
      reject(e);
    });
    stream.on('finish', () => {
      resolve();
    });
  });

if (fs.existsSync(path.join(dest, `${db}.mmdb`))) {
  console.log('Geo database file already exists. Skipping geo setup.');
} else if (fs.existsSync(zipfile)) {
  console.log('Geo database zip file already exists. Skipping download.');
  extract(fs.createReadStream(zipfile).pipe(zlib.createGunzip({})).pipe(tar.t()));
} else {
  download(url).then(res => extract(res));
}
