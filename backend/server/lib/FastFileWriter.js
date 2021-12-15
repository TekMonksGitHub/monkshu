/** 
 * Write the message to a file. Can append or overwrite. 
 * Needed because node.js will open multiple file handles to 
 * handle aysnc writes to the same file. This is not necessary.
 * Can also handle queued writes for in sync writing to the file.
 * 
 * (C) 2018 TekMonks. All rights reserved.
 */

const fs = require("fs");
const Timer = require(`${CONSTANTS.LIBDIR}/Timer.js`);

class FastFileWriter {
    constructor(path, writeCloseTimeout, encoding, overwrite = false) {
        this.path = path;     
        this.writeCloseTimeout = writeCloseTimeout;
        this.encoding = encoding;
        this.overwrite = overwrite;
        this._resetInternalEnv();
        this.writeQueue = [];
        this.pendingWrites = false;
    }

    close(callback) {
        if (this._env.fd) fs.close(this._env.fd, callback); else callback();
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

    queuedWrite(data, callback) {
        const queuedWriteInternal = writeObject => {
            this.pendingWrites = true;
            this.writeFile(writeObject.data, err => {
                this.pendingWrites = false; writeObject.callback(err);
                if (this.writeQueue.length) queuedWriteInternal(this.writeQueue.shift());
            });
        }
    
        this.writeQueue.push({data, callback}); if (this.writeQueue.length == 1 && (!this.pendingWrites)) queuedWriteInternal(this.writeQueue.shift());
    }

    areTherePendingWrites() {return this.pendingWrites||this.writeQueue.length;}
    
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
    return new FastFileWriter(path, writeCloseTimeout, encoding);
}