const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    url: String,
    keywords: [],
    products: [{}],
});

const Store = mongoose.model('Store', Schema);
module.exports = Store;