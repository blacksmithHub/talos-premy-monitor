global.config = require('./config')

const config = require('./config')

const mongoose = require('mongoose');

const Task = require('./src/classes/Task.js');
const Store = require('./src/models/Store');

(async() => {
    await mongoose.connect(global.config.mongodb_uri, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        Store.deleteMany({}, (err) => {
            if (!err) {
                Store.insertMany(config.sites, (err) => {
                    if(!err){
                        Store.find({}, (err, tasksQuery) => {
                            if(!err) {
                                for (let i = 0; i < tasksQuery.length; i++) {
                                    setTimeout(() => {
                                        new Task(tasksQuery[i]).start();
                                    }, 4000 * i)                            
                                }
                            }
                        });
                    }
        
                })
            }
        });
    }
    catch(err) {
        console.log(err)
    }
})()