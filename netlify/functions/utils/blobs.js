const { getStore } = require('@netlify/blobs');

function getUserStore() {
  return getStore('user-data');
}

function getUploadsStore() {
  return getStore('uploads');
}

module.exports = { getUserStore, getUploadsStore };
