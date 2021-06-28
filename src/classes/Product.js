class Product {
    constructor(id, storeUrl, lastUpdate = "", handle = "", title = "", url = "", image = "", variants = []) {
        this.id = id;
        this.storeUrl = storeUrl;
        this.lastUpdate = lastUpdate;
        this.handle = handle;
        this.title = title;
        this.url = url;
        this.image = image;
        this.variants = variants;
        this.status = [];
    }

    updateInformation = (info) => {
        this.lastUpdate = info.updated_at;
        this.handle = info.handle;
        this.image = info.images.length > 0 ? info.images[0].src : "";

        this.title = info.title;
        this.url = `https://${this.storeUrl}/products/${this.handle}`;

        this.status = info.tags.filter(x => x.startsWith("status:")).map(x => x.split(':')[1])

        this.variants = [];
        info.variants.forEach(x => {
            this.variants = [...this.variants, {
                id: x.id,
                title: x.title,
                price: x.price,
                available: x.available
            }]
        });
    }

    needToNotifyUpdate = (product) => {
        var needToNotifyUpdate = this.id != product.id
                                || this.storeUrl != product.storeUrl
                                || this.handle != product.handle
                                || this.url != product.url
                                || this.title != product.title
                                || this.variants.length != product.variants.length;
        if(needToNotifyUpdate){
            return true;
        }

        for (let i = 0; i < this.variants.length; i++) {
            var oldV = this.variants[i]
            var newV = product.variants[i]

            if(oldV.id != newV.id
                || oldV.title != newV.title
                || oldV.price != newV.price
                || oldV.available != newV.available){
                    needToNotifyUpdate = true;
                    break;
                }                
        }
        
        return needToNotifyUpdate;
    }
}

module.exports = Product;