/**
 * Handles distribued jobs, cross cluster. 
 * Each job runs once only across the cluster.
 * The result of the function must be JSON serializable.
 * 
 * (C) 2024. TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const blackboard = require(`${CONSTANTS.LIBDIR}/blackboard.js`);
const conf = require(`${CONSTANTS.CONFDIR}/distributedjobhandler.json`); 

const DISTRIBUTED_JOB_HANDLER_MSG_VOTE = "distribuedjobmsg_vote", 
    DISTRIBUTED_JOB_HANDLER_MSG_RESULT = "distribuedjobmsg_result";

const JOBS = {}; 

exports.init = function() {
    const _handleJobVotingMessage = msg => {
        const {jobstamp, blackboardcontrol} = msg;
        const [jobid, _ts, _random] = jobstamp.split('+');
        if (!JOBS[jobid]) JOBS[jobid] = {};
        if (!JOBS[jobid].jobstamp) JOBS[jobid].jobstamp = `${jobid}+${Date.now()}+${Math.random()}`
        blackboard.sendReply(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, blackboardcontrol, {jobstamp: JOBS[jobid].jobstamp});
    }

    const _handleJobResultMessage = msg => {
        const {jobid, blackboardcontrol} = msg;

        if (!JOBS[jobid]) JOBS[jobid] = {};
        if (!JOBS[jobid].jobstamp) JOBS[jobid].jobstamp = `${jobid}+${Date.now()}+${Math.random()}`
        if (JOBS[jobid].result) blackboard.sendReply(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, blackboardcontrol, 
            {jobstamp: JOBS[jobid].jobstamp, result: JOBS[jobid].result});  // we have this job and its result
        else {  // we may be the ones calculating it, if we won the vote, so send it once ready
            JOBS[jobid].sendresult = true, 
            JOBS[jobid].blackboardcontrols = (JOBS[jobid].blackboardcontrols||[]).push(blackboardcontrol)
        }
    }

    // support all forms of messaging - local or distributed clusters
    const bboptions1 = {}; bboptions1[blackboard.EXTERNAL_ONLY] = true;
    blackboard.subscribe(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, _handleJobVotingMessage, bboptions1);
    blackboard.subscribe(DISTRIBUTED_JOB_HANDLER_MSG_RESULT, _handleJobResultMessage, bboptions1);

    const bboptions2 = {}; bboptions2[blackboard.LOCAL_CLUSTER_ONLY] = true;
    blackboard.subscribe(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, _handleJobVotingMessage, bboptions2);
    blackboard.subscribe(DISTRIBUTED_JOB_HANDLER_MSG_RESULT, _handleJobResultMessage, bboptions2);
}

exports.runJob = async function(jobid, functionToRun, options=exports.LOCAL_CLUSTER, result_timeout=conf.result_timeout) {
    if (JOBS[jobid]?.result) return JOBS[jobid].result; // if we have the result already send it out

    const bboptions = {};
    if (options == exports.LOCAL_CLUSTER) bboptions[blackboard.LOCAL_CLUSTER_ONLY] = true;
    else bboptions[blackboard.LOCAL_CLUSTER_ONLY] = true;   // default

    if (!JOBS[jobid]) JOBS[jobid] = {};   // add cache entry for this job if needed
    if (!JOBS[jobid].jobstamp) JOBS[jobid].jobstamp = `${jobid}+${Date.now()}+${Math.random()}`;    // stamp
    if (await _voteAndDecideIfWeHaveToRunTheJob(jobid, bboptions)) { 
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
    } else return await _returnPolledValue(jobid, bboptions, result_timeout); // voting says someone else will calculate, so return polled value
}

exports.LOCAL_CLUSTER = 1;
exports.DISTRIBUED_CLUSTER = 2;

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

async function _returnPolledValue(jobid, bboptions, timeout) {
    const returnValues = await blackboard.getReply(DISTRIBUTED_JOB_HANDLER_MSG_RESULT, {jobid}, 
        timeout, bboptions);
    let polledValue;
    for (const returnValue of returnValues) if (returnValues != null) {polledValue = returnValue; break;}
    JOBS[jobid].result = polledValue?.result;
    return JOBS[jobid].result;    // something went wrong
}