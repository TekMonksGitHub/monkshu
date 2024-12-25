/**
 * Handles distribued jobs, cross cluster. Each job runs once only across the cluster.
 * The result of the job function must be JSON serializable.
 * 
 * (C) 2024. TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const blackboard = require(`${CONSTANTS.LIBDIR}/blackboard.js`);
const conf = require(`${CONSTANTS.CONFDIR}/distributedjobhandler.json`); 

const DISTRIBUTED_JOB_HANDLER_MSG_VOTE = "distriburedjobmsg_vote", 
    DISTRIBUTED_JOB_HANDLER_MSG_GET_RESULT = "distributedjobmsg_get_result";

const JOBS = {}, JOB_FUNCTIONS = {}; 

/** Inits the module, called by the server runtime. */
exports.init = function() {
    // support all forms of messaging - local clusters (vertical) and distributed clusters (horizontal)
    // publishing later will decide who responds and thus, will control the cluster messaging widths
    blackboard.subscribe(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, _handleJobVotingMessage);
    blackboard.subscribe(DISTRIBUTED_JOB_HANDLER_MSG_GET_RESULT, _handleGetJobResultMessage);
}

/**
 * Runs the given job and returns the result, either locally or via local cluster members or via
 * distributed cluster members. The jobid must be unique for every job. 
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

    LOG.info(`Distribued job manager received a request to run ${functionToRun.name} as jobid ${jobid}.`);
    if (JOBS[jobid]?.result) {
        LOG.info(`Jobid ${jobid}, cached results found, returning.`);
        return JOBS[jobid].result; // if we have the result already, send it back
    }
    _initJobCacheWithThisJob(jobid);

    const bboptions = {};
    if (options == exports.LOCAL_CLUSTER) bboptions[blackboard.LOCAL_CLUSTER_ONLY] = true;
    else bboptions = undefined;   // default is across all local and distribued nodes
    if (await _voteAndDecideIfWeHaveToRunTheJob(jobid, bboptions)) {
        LOG.info(`Jobid ${jobid}, won the vote, running locally.`);
        const result = await _runJobLocallyAndBroadcastTheResult(jobid, functionToRun);
        LOG.info(`Jobid ${jobid}, returning the results via local run, due to winning the vote.`); return result;
    }
    else try {
        LOG.info(`Jobid ${jobid}, lost the vote, returning via cluster result polling.`);
        const result = await _returnPolledValue(jobid, bboptions, result_timeout); // voting says someone else will calculate, so return polled value
        LOG.info(`Jobid ${jobid}, returning the results via successful polling.`); return result;
    } catch (error) {   // polling failed
        LOG.error(`Jobid ${jobid} result polling error: ${error}, running locally and returning`);
        if (runLocallyOnErrors) {
            const result = await _runJobLocallyAndBroadcastTheResult(jobid, functionToRun);
            LOG.info(`Jobid ${jobid}, returning the results via local run, due to polling error.`); return result;
        }
    } 
}

/**
 * Registers job functions - this should be {voteTSGenerator: ... , randomTSGenerator: ...}. These are then
 * used in voting algorithms. They can override time based voting, eg use CPU based voting etc.
 * @param {any} jobsignature The jobsignature, later job ID should use jobsignature.unique_real_job_id if this is registered
 * @param {object} functions The functions for generating timestamp and random stamps for job voting, see format above
 */
exports.registerJobFunctions = function(jobsignature, functions) {JOB_FUNCTIONS[jobsignature] = functions;}

/**
 * Unregisters previously registered job functions
 * @param {any} jobsignature The jobsignature
 */
exports.unregisterJobFunctions = function(jobsignature) {delete JOB_FUNCTIONS[jobsignature];}

/** Value for indicating the jobs should run on the local vertical cluster */
exports.LOCAL_CLUSTER = 1;
/** Value for indicating the jobs should run on the distributed horizontal cluster */
exports.DISTRIBUED_CLUSTER = 2;

function _initJobCacheWithThisJob(jobid) {
    if (JOBS[jobid] && JOBS[jobid].jobstamp) return;;   // already initialized

    const jobsignature = jobid.indexOf(".") != -1 ? jobid.split(".")[0] : undefined;
    const voteTSGenerator = JOB_FUNCTIONS[jobsignature]?.voteTSGenerator || Date.now,
        randomTSGenerator = JOB_FUNCTIONS[jobsignature]?.randomTSGenerator || Math.random;
    if (!JOBS[jobid]) JOBS[jobid] = {};   // add cache entry for this job if needed
    if (!JOBS[jobid].jobstamp) JOBS[jobid].jobstamp = `${jobid}+${voteTSGenerator()}+${randomTSGenerator()}`;    // stamp
    LOG.info(`Distributed job handler initialized job ${jobid} with stamp ${JOBS[jobid].jobstamp}`);
}

async function _voteAndDecideIfWeHaveToRunTheJob(jobid, bboptions) {
    const replies = await blackboard.getReply(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, {jobstamp:  JOBS[jobid].jobstamp}, 
        conf.vote_timeout, bboptions);  // get a vote on who will execute it

    const [_jobid, tsOurs, randomOurs] = JOBS[jobid].jobstamp.split('+');
    let lowestTSReply = -1, lowestTSsRandomReply = -1; for (const reply of replies) {  // find the lowest timestamp and randoms
        const [jobidReply, tsReply_raw, randomReply_raw] = reply.jobstamp.split("+");
        const tsReply = parseInt(tsReply_raw), randomReply = parseFloat(randomReply_raw);
        if (jobidReply != jobid) continue;  // bad reply

        if ((lowestTSReply == -1) || (tsReply < lowestTSReply)) {
            lowestTSReply = tsReply;
            lowestTSsRandomReply = randomReply;   
        }
    }

    LOG.info(`Our TS = ${tsOurs}, lowest TS = ${lowestTSReply}, our random = ${randomOurs} and lowest TS' random ${lowestTSsRandomReply}`);
    if ((lowestTSReply > tsOurs) || (lowestTSReply == tsOurs && lowestTSsRandomReply >= randomOurs) || 
        (lowestTSReply == -1)) return true; else return false;
}

async function _runJobLocallyAndBroadcastTheResult(jobid, functionToRun) {
    JOBS[jobid].result = await functionToRun();     // calculate the result
    if (JOBS[jobid].broadcastresult) {   // broadcast the results if others are waiting for us to calculate them
        for (const blackboardcontrol of JOBS[jobid].blackboardcontrols) {
            blackboard.sendReply( // if this is set then others want this result as well
                DISTRIBUTED_JOB_HANDLER_MSG_GET_RESULT, blackboardcontrol, 
                    {jobstamp: JOBS[jobid].jobstamp, result: JOBS[jobid].result});
        }
        delete JOBS[jobid].broadcastresult; delete JOBS[jobid].blackboardcontrols;   // we sent all the results
    }
    return JOBS[jobid].result;
}

async function _returnPolledValue(jobid, bboptions, timeout) {
    LOG.info(`Distribued job manager starting polling for results for jobid ${jobid} with timeout of ${timeout} ms.`);
    const bboptionsFirstReply = {...bboptions}; bboptionsFirstReply[blackboard.FIRST_REPLY_ONLY] = true;
    const returnValues = await blackboard.getReply(DISTRIBUTED_JOB_HANDLER_MSG_GET_RESULT, {jobid}, 
        timeout, bboptionsFirstReply);

    let polledValue;
    for (const returnValue of returnValues) if (returnValues != null) {polledValue = returnValue; break;}   // the first non-null reply is treated as authoritative
    
    if (!polledValue) throw `Polling for results failed for jobid ${jobid}`;
    else {JOBS[jobid].result = polledValue.result; return JOBS[jobid].result;}
}

const _handleJobVotingMessage = msg => {
    const {jobstamp, blackboardcontrol} = msg, [jobid, _ts, _random] = jobstamp.split('+');
    _initJobCacheWithThisJob(jobid);    // we can get voting message before local code calls us to even execute the job
    
    blackboard.sendReply(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, blackboardcontrol, {jobstamp: JOBS[jobid].jobstamp});
}

const _handleGetJobResultMessage = msg => {
    const {jobid, blackboardcontrol} = msg;
    _initJobCacheWithThisJob(jobid);        // we can get send result message before local code calls us to even execute the job

    if (JOBS[jobid].result) blackboard.sendReply(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, blackboardcontrol, 
        {jobstamp: JOBS[jobid].jobstamp, result: JOBS[jobid].result});  // we have this job and its result
    else {  // we may be the ones calculating it, if we won the vote, so send it once ready
        JOBS[jobid].broadcastresult = true; if (!JOBS[jobid].blackboardcontrols) JOBS[jobid].blackboardcontrols = [];
        JOBS[jobid].blackboardcontrols.push(blackboardcontrol);
    }
}