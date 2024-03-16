/**
 * Ticketing subsystem.
 *  
 * (C) 2019 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

exports.Ticketing = class Ticketing {
    #current_depth = 0; #queue = []; #max_depth = 1;

    /**
     * The max depth of the queue required.
     * @param {int} max_depth The max depth for this queue
     */
    constructor(max_depth) {
        if (max_depth > 0) this.#max_depth = max_depth; }

    /**
     * Will call the function workfunction if a ticket is available
     * else will wait and execute it when a ticket is freed up (first come, first served)
     * @param {function} workfunction The work function
     * @param {string} wait_msg The message to log if waiting
     */
    async getTicket(workfunction, waitAsync, wait_msg) {
        return new Promise(async (resolve, reject) => {
            this.#queue.push({workfunction, waitAsync, resolve, reject});   // queue the item
            if (this.#current_depth < this.#max_depth) this.#releaseTicket();   // release it if we don't need to wait
            else if (wait_msg) LOG.info(wait_msg);  // else log the wait
        })   
    }

    async #releaseTicket() {
        if (this.#queue.length) {
            this.#current_depth++;  // we are executing now
            const workitem = this.#queue.shift();
            try {
                const result = workitem.waitAsync ? await workitem.workfunction() : workitem.workfunction(); 
                workitem.resolve(result);
            } catch (err) {workitem.reject(err)} 
        }
        this.#current_depth--;
        if (this.#queue.length && (this.#current_depth < this.#max_depth)) this.#releaseTicket();  // execute next item if it is waiting
    }
 }