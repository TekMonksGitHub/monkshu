/**
 * Handles distribued jobs, cross cluster.
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
        const {jobstamp, blackboardcontrol} = msg;
        const [jobid, _ts, _random] = jobstamp.split('+');
        if (!JOBS[jobid]) JOBS[jobid] = {};

        if (JOBS[jobid].result) blackboard.sendReply(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, blackboardcontrol, 
            {jobstamp: JOBS[jobid].jobstamp, result: JOBS[jobid].result});  // we have this job and its result
        else JOBS[jobid] = {sendresult: true, blackboardcontrol};   // we may be the ones calculating it, if we won the vote, so send it once ready
    }

    // support all forms of messaging - local or distributed clusters
    const bboptions1 = {}; bboptions1[blackboard.EXTERNAL_ONLY] = true;
    blackboard.subscribe(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, _handleJobVotingMessage, bboptions1);
    blackboard.subscribe(DISTRIBUTED_JOB_HANDLER_MSG_RESULT, _handleJobResultMessage, bboptions1);

    const bboptions2 = {}; bboptions2[blackboard.LOCAL_CLUSTER_ONLY] = true;
    blackboard.subscribe(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, _handleJobVotingMessage, bboptions2);
    blackboard.subscribe(DISTRIBUTED_JOB_HANDLER_MSG_RESULT, _handleJobResultMessage, bboptions1);
}

exports.runJob = async function(jobid, functionToRun, options=exports.LOCAL_CLUSTER) {
    const bboptions = {};
    if (options == exports.LOCAL_CLUSTER) bboptions[blackboard.LOCAL_CLUSTER_ONLY] = true;
    else bboptions[blackboard.LOCAL_CLUSTER_ONLY] = true;   // default

    const _returnPolledValue = async _ => {
        const returnValues = await blackboard.getReply(DISTRIBUTED_JOB_HANDLER_MSG_RESULT, {jobid}, 
            conf.vote_timeout, bboptions);
        let polledValue;
        for (const returnValue of returnValues) if (returnValues != null) {polledValue = returnValue; break;}
        JOBS[jobid] = {result: polledValue?.result};
        return JOBS[jobid].result;    // something went wrong
    }

    if (JOBS[jobid]) {  // we received a call to execute or vote on this job before 
        if (JOBS[jobid].result) return JOBS[jobid].result;
        else return await _returnPolledValue();
    } else {
        const tsOurs = Date.now(), randomOurs = Math.random(), 
            jobstampOurs = `${jobid}+${tsOurs}+${randomOurs}`;
        if (!JOBS[jobid]?.jobstamp)JOBS[jobid] ? JOBS[jobid].jobstamp = jobstampOurs : 
            JOBS[jobid] = {jobstamp: jobstampOurs}; // setup the job in the cache
        const replies = await blackboard.getReply(DISTRIBUTED_JOB_HANDLER_MSG_VOTE, {jobstamp: jobstampOurs}, 
            conf.vote_timeout, bboptions);  // get a vote on who will execute it

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
                (lowestTSReply == -1)) { // we could have replied outselves or getting a reply failed

            JOBS[jobid] = {processing: true};   // we are going to calculate the result by running the job
            if (!JOBS[jobid].jobstamp) JOBS[jobid].jobstamp = jobstampOurs; // stamp this job if not done so far
            JOBS[jobid].result = await functionToRun();     // calculate the result
            if (JOBS[jobid].sendresult) blackboard.sendReply( // if this is set then others want this result as well
                blackboard.sendReply(DISTRIBUTED_JOB_HANDLER_MSG_RESULT, JOBS[jobid].blackboardcontrol, 
                    {jobstamp: JOBS[jobid].jobstamp, result: JOBS[jobid].result}));
            delete JOBS[jobid].processing; delete JOBS[jobid].sendresult; return JOBS[jobid].result;
        } else return _returnPolledValue(); // voting says someone else will calculate, to return polled value
    }
}

exports.LOCAL_CLUSTER = 1;
exports.DISTRIBUED_CLUSTER = 2;
