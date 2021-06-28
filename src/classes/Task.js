const axios = require('axios');
const httpsProxyAgent = require("https-proxy-agent");

const Discord = require('./Discord')

const Store = require('../models/Store')

const Product = require('./Product')

const Log = require('../../Log')

const config = require('../../config.json')

class Task {
    constructor(taskSettings) {
        this.storeUrl = taskSettings.url;
        this.firstRun = true;
        this.storeId = taskSettings._id;

        this.proxiesList = [{ url: "", unbanTime: 0, banCount: 0.5 }]
        this.proxyCount = 0
        if (config.proxiesList && config.proxiesList.length > 0) {
            this.proxiesList = this.proxiesList.concat(config.proxiesList.map(x => ({ url: x, unbanTime: 0, banCount: 0.5 })))
        }
        this.currentProxy = {}
    }

    start = async () => {
        this.task = setInterval(async () => {
            try {
                var config = {}

                do {
                    this.currentProxy = this.proxiesList[this.proxyCount];

                    if(this.currentProxy.unbanTime > 0 && this.currentProxy.unbanTime <= Date.now()){
                        this.currentProxy.unbanTime = 0;
                    }

                    this.proxyCount++;
                    if (this.proxyCount >= this.proxiesList.length) {
                        this.proxyCount = 0;
                    }

                } while(this.currentProxy.unbanTime === -1 || this.currentProxy.unbanTime > 0)
                                
                if (this.currentProxy.url != "") {
                    const agent = new httpsProxyAgent(this.currentProxy.url);

                    config = {
                        method: "GET",
                        httpsAgent: agent
                    };
                }
                
                var url = `https://${this.storeUrl}/products.json`

                const response = await axios.get(url, config)

                this.currentProxy.banCount = 0.5;

                var products = response.data.products;

                if (this.firstRun) {
                    var newProducts = []

                    products.forEach(x => {
                        var product = new Product(x.id, this.storeUrl);
                        product.updateInformation(x);

                        newProducts = [...newProducts, product];
                    });

                    await Store.updateOne({ _id: this.storeId }, {
                        products: newProducts
                    });

                    this.firstRun = false;

                    Log.Info(`Connection done with ${this.storeUrl}`);
                }
                else {
                    Store.findById(this.storeId, async (err, query) => {
                        if (err) {
                            Log.Warning('Store not found');
                        }
                        else {
                            var oldProducts = query.products;
                            var newProducts = []

                            await products.forEach(async product => {
                                var found = oldProducts.find(x => x.id === product.id);

                                if (found) {
                                    if (found.lastUpdate === product.updated_at) {
                                        return;
                                    }

                                    var oldPr = new Product(found.id, found.storeUrl, found.lastUpdate, found.handle, found.title, found.url, found.image, found.variants);
                                    var newPr = new Product(product.id, this.storeUrl)
                                    newPr.updateInformation(product);

                                    if (oldPr.needToNotifyUpdate(newPr)) {
                                        await Store.updateOne({ _id: this.storeId, "products.id": newPr.id }, { $set: { "products.$": newPr } });
                                        Discord.notifyProduct(newPr);
                                    }
                                    else {
                                        await Store.updateOne({ _id: this.storeId, "products.id": product.id }, { $set: { "products.$.lastUpdate": product.updated_at } });
                                    }
                                }
                                else {
                                    var newPr = new Product(product.id, this.storeUrl)
                                    newPr.updateInformation(product)
                                    newProducts = [...newProducts, newPr]
                                    Discord.notifyProduct(newPr)
                                }
                            });

                            if (newProducts.length > 0) {
                                await Store.updateOne({ _id: this.storeId }, { $push: { "products": { $each: [...newProducts], $position: 0 } } })
                            }
                        }
                    })
                }
            }
            catch (err) {
                if (err.response && (err.response.status === 430 || err.response.status === 429)) {
                    this.currentProxy.banCount += 0.5;
                    Log.Warning(`Ban occurred [${this.storeUrl}] - Retry after ${60 * this.currentProxy.banCount} seconds`)
                    
                    this.currentProxy.unbanTime = Date.now() + (60000 * this.currentProxy.banCount)
                }
                else if (err.response && err.response.status === 403) {
                    Log.Error(`${this.storeUrl} has an high level of protection from monitors`);
                    clearInterval(this.task)
                }
                else if (err.response && err.response.status === 502) {
                    Log.Error(`Bad gateway error, if you are using ipv6 proxy don't use it, because it's not supported`);
                    this.currentProxy.unbanTime = -1
                }
                else if (err.response && err.response.status === 502) {
                    Log.Warning(`Unknown Error from server`);
                    this.currentProxy.unbanTime = -1
                }
                else if (err.code === 'ETIMEDOUT') {
                    Log.Error(`Timeout occurred, a node js script cannot manage a lot of requests in the same time`);
                    clearInterval(this.task)
                }
                else if(err.code === 'ECONNRESET'){
                    Log.Warning(`The connection was reset`);
                }
                else {
                    console.log(err)
                }
            }

        }, config.requestTiming)
    }
}

module.exports = Task;