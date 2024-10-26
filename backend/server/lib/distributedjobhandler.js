/**
 * Handles distribued jobs, cross cluster. Each job runs once only across the cluster.
 * The result of the job function must be JSON serializable.
 * 
 * (C) 2024. TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const blackboard = require(`${CONSTANTS.LIBDIR}/blackboard.js`);
const conf = require(`${CONSTANTS.CONFDIR}/distributedjobhandler.json`); 

const DISTRIBUTED_JOB_HANDLER_MSG_VOTE = "distribuedjobmsg_vote", 
    DISTRIBUTED_JOB_HANDLER_MSG_RESULT = "distribuedjobmsg_result";

const JOBS = {}; 

/** Inits the module, called by the server runtime. */
exports.init = function() {
    // support all forms of messaging - local clusters (vertical) and distributed clusters (horizontal)
    // publishing later will decide who responds and thus, will control the cluster messaging widths
    blackboard.subscribe(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, _handleJobVotingMessage);
    blackboard.subscribe(DISTRIBUTED_JOB_HANDLER_MSG_RESULT, _handleJobResultMessage);
}

/**
 * Runs the given job and returns the result, either locally or via local cluster members or via
 * distributed cluster members.
 * @param {any} jobid Job ID, can be string, number etc. Should be unique.
 * @param {function} functionToRun Function object to run to calculate the result. The result must be serializable.
 * @param {number} options Optional: Whether to run on local cluster or distributed across nodes. 
 *                                   One of exports.LOCAL_CLUSTER or exports.DISTRIBUED_CLUSTER. 
 *                                   Default is exports.LOCAL_CLUSTER.
 * @param {boolean} runLocallyOnErrors Optional: Whether to run locally on timeout error, or not. Default is false.
 * @param {number} result_timeout Optional: The time to wait for the cluster to respond with the result.
 * @returns The result or null on errors.
 */
exports.runJob = async function(jobid, functionToRun, options=exports.LOCAL_CLUSTER, 
        runLocallyOnErrors=false, result_timeout=conf.result_timeout) {

    if (JOBS[jobid]?.result) return JOBS[jobid].result; // if we have the result already, send it back
    _initJobCacheWithThisJob(jobid);

    const bboptions = {};
    if (options == exports.LOCAL_CLUSTER) bboptions[blackboard.LOCAL_CLUSTER_ONLY] = true;
    else bboptions = undefined;   // default is across all local and distribued nodes
    if (await _voteAndDecideIfWeHaveToRunTheJob(jobid, bboptions)) 
        return await _runJobLocallyAndBroadcastTheResult(jobid, functionToRun);
    else try {
        return await _returnPolledValue(jobid, bboptions, result_timeout); // voting says someone else will calculate, so return polled value
    } catch (error) {   // polling failed
        if (runLocallyOnErrors) return await _runJobLocallyAndBroadcastTheResult(jobid, functionToRun);
    }
}

/** Value for indicating the jobs should run on the local vertical cluster */
exports.LOCAL_CLUSTER = 1;
/** Value for indicating the jobs should run on the distributed horizontal cluster */
exports.DISTRIBUED_CLUSTER = 2;

function _initJobCacheWithThisJob(jobid) {
    if (!JOBS[jobid]) JOBS[jobid] = {};   // add cache entry for this job if needed
    if (!JOBS[jobid].jobstamp) JOBS[jobid].jobstamp = `${jobid}+${Date.now()}+${Math.random()}`;    // stamp
}

async function _voteAndDecideIfWeHaveToRunTheJob(jobid, bboptions) {
    const replies = await blackboard.getReply(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, {jobstamp:  JOBS[jobid].jobstamp}, 
        conf.vote_timeout, bboptions);  // get a vote on who will execute it

    const [_jobid, tsOurs, randomOurs] = JOBS[jobid].jobstamp.split('+');
    let lowestTSReply = -1, lowestRandomReply = -1; for (const reply of replies) {  // find the lowest timestamp and randoms
        const [jobidReply, tsReply_raw, randomReply_raw] = reply.jobstamp.split("+");
        const tsReply = parseInt(tsReply_raw), randomReply = parseFloat(randomReply_raw);
        if (jobidReply != jobid) continue;  // bad reply
        if (lowestTSReply == -1) lowestTSReply = tsReply;
        else if (tsReply < lowestTSReply) lowestTSReply = tsReply;
        if (lowestRandomReply == -1) lowestRandomReply = randomReply;
        else if (randomReply < lowestRandomReply) lowestRandomReply = randomReply;
    }

    if ((lowestTSReply > tsOurs) || (lowestTSReply == tsOurs && lowestRandomReply >= randomOurs) || 
        (lowestTSReply == -1)) return true; else return false;
}

async function _runJobLocallyAndBroadcastTheResult(jobid, functionToRun) {
    JOBS[jobid].result = await functionToRun();     // calculate the result
    if (JOBS[jobid].sendresult) {   // send results if others are waiting for us to calculate them
        for (const blackboardcontrol of JOBS[jobid].blackboardcontrols) {
            blackboard.sendReply( // if this is set then others want this result as well
                DISTRIBUTED_JOB_HANDLER_MSG_RESULT, blackboardcontrol, 
                    {jobstamp: JOBS[jobid].jobstamp, result: JOBS[jobid].result});
        }
        delete JOBS[jobid].sendresult; delete JOBS[jobid].blackboardcontrols;   // we sent all the results
    }
    return JOBS[jobid].result;
}

async function _returnPolledValue(jobid, bboptions, timeout) {
    const returnValues = await blackboard.getReply(DISTRIBUTED_JOB_HANDLER_MSG_RESULT, {jobid}, 
        timeout, bboptions);
    let polledValue;
    for (const returnValue of returnValues) if (returnValues != null) {polledValue = returnValue; break;}   // the first non-null reply is treated as authoritative
    if (!polledValue) throw "Polled results failed";
    else {JOBS[jobid].result = polledValue.result; return JOBS[jobid].result;}
}

const _handleJobVotingMessage = msg => {
    const {jobstamp, blackboardcontrol} = msg, [jobid, _ts, _random] = jobstamp.split('+');
    _initJobCacheWithThisJob(jobid);    // we can get voting message before local code calls us to even execute the job
    
    blackboard.sendReply(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, blackboardcontrol, {jobstamp: JOBS[jobid].jobstamp});
}

const _handleJobResultMessage = msg => {
    const {jobid, blackboardcontrol} = msg;
    _initJobCacheWithThisJob(jobid);        // we can get send result message before local code calls us to even execute the job

    if (JOBS[jobid].result) blackboard.sendReply(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, blackboardcontrol, 
        {jobstamp: JOBS[jobid].jobstamp, result: JOBS[jobid].result});  // we have this job and its result
    else {  // we may be the ones calculating it, if we won the vote, so send it once ready
        JOBS[jobid].sendresult = true; if (!JOBS[jobid].blackboardcontrols) JOBS[jobid].blackboardcontrols = [];
        JOBS[jobid].blackboardcontrols.push(blackboardcontrol);
    }
}