/* 
 * filewriter.js - Write the message to a file. Can append or overwrite. 
 *                 Needed because node.js will open multiple file handles to 
 *                 handle aysnc writes to the same file. This is not necessary.
 * 
 * (C) 2018 TekMonks. All rights reserved.
 */

const fs = require("fs");
const Timer = require(`${CONSTANTS.LIBDIR}/Timer.js`);

class FileWriter {
    constructor(path, writeCloseTimeout, encoding, overwrite = false) {
        this.path = path;     
        this.writeCloseTimeout = writeCloseTimeout;
        this.encoding = encoding;
        this.overwrite = overwrite;
        this._resetInternalEnv();
    }

    _writeToFile(data, callback) {
        this._env.writesPending++;
        fs.writeFile(this._env.fd, data, this.encoding, e => {
            this._env.writesPending--;
            this._env.timer.reset();
            callback(e);
        });
    }

    _resetInternalEnv() {
        if (this._env) delete this._env;
        this._env = {"bufferedWrites":[], "writesPending": 0, "fd":null, "isFileToBeOpened": true};
    }
    
    // callback(err)
    writeFile(data, callback) {
        if (this._env.fd) { this._writeToFile(data, callback); return; }
    
        let env = this._env;
        env.bufferedWrites.push({data, callback}); 

        if (!env.isFileToBeOpened) return; // file is being opened, just buffer it
        env.isFileToBeOpened = false;
    
        fs.open(this.path, this.overwrite?"w":"a", (err, fd) => {
            if (err) {callback(err); env.isFileToBeOpened = true; return;}
    
            env.fd = fd; 
    
            env.timer = Timer.createTimer(this.writeCloseTimeout, _ => { 
                if (env.writesPending) env.timer.reset(); // don't close if we have pending writes
                else {
                    fs.close(env.fd, _ => {});     // error here, can't do much. file closed failed
                    this._resetInternalEnv();
                }
            });
    
            env.bufferedWrites.forEach(obj => this._writeToFile(obj.data, obj.callback));
            env.bufferedWrites = [];
        });
    }
}

exports.createFileWriter = (path, writeCloseTimeout, encoding) => {
    return new FileWriter(path, writeCloseTimeout, encoding);
}