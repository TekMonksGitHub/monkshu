/** 
 * Executes commands in a serial queue. Useful when 
 * something should be run, but not immediately. Eases
 * the strain on the system, specially under high loads
 * as the queue is serial not parallel (for async tasks 
 * which are non-sequential just use async/await or promises).
 * 
 * (C) 2021, 2022. TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const queue = []; 
const DEFAULT_QUEUE_CHECK_INTERVAL = 500;
let conf; try {conf = require(`${CONSTANTS.CONFDIR}/queueexecutor.json`)} catch (err) {conf = {enabled: true}};

let queueInitialized = false;   // to support server independent apps

/**
 * Run the given function as a queued task.
 * @param {function} functionToCall The function to call.
 * @param {array} params The parameters to the function. 
 * @param {boolean} isAsync Optional: Is it an async function, default is no.
 * @param {number} delay Optional: The delay after execution of the previous
 *                       task before executing this function. Default is 0.
 * @param {function} callback An optional callback to call once the task 
 *                            has been executed. If isAsync is true and a callback
 *                            is not provided, then a promise is returned which is 
 *                            resolved when the queueExecutor finally executes the task.
 * @return  If the function to call is async and a callback is not provided, then the
 *          promise which resolves when it has been exectued, else nothing.
 */
exports.add = (functionToCall, params=[], isAsync=false, delay=0, callback) => {
    if (!queueInitialized) exports.init();   // to support server independent apps
    let promiseResolver, promiseToReturn; if (isAsync && !callback) promiseToReturn = new Promise(resolve=>promiseResolver = resolve);
    if (conf.enabled) queue.unshift({functionToCall, params, isAsync, delay, callback, promiseResolver});
    else throw (`Server's queue executor is disabled, and add task to the queue was called for function ${functionToCall.toString()}. Please enable it in conf/queueexecutor.json file and restart.`); 
    if (promiseToReturn) return promiseToReturn;
}

/** Starts the queue loop. */
exports.init = _ => {if (conf.enabled) _queueExecutionFunction(); queueInitialized = true;}  // starts the queue processing loop

/** @returns The current queue depth, that is jobs waiting to execute. */
exports.getQueueDepth = _ => queue.length;

function _queueExecutionFunction() {
    if (!queue.length) {_runQueueLoop(); return;}  // no tasks
    
    const workItem = queue.pop(); 
    setTimeout(async _=> {
        let functionReturnedValue;
        if (workItem.isAsync) functionReturnedValue = await workItem.functionToCall(...workItem.params);
        else functionReturnedValue = workItem.functionToCall(...workItem.params);
        if (workItem.callback) workItem.callback(functionReturnedValue); 
        if (workItem.promiseResolver) workItem.promiseResolver(functionReturnedValue);
        _queueExecutionFunction();  // run the next item now
    }, workItem.delay);
}

const _runQueueLoop = _ => setTimeout(_queueExecutionFunction, conf.queue_check_interval||DEFAULT_QUEUE_CHECK_INTERVAL);