"use strict";

const _         = require('underscore');
const co        = require('co');
const should    = require('should');
const duniter   = require('../../index');
const bma       = require('../../app/lib/streams/bma');
const user      = require('./tools/user');
const constants = require('../../app/lib/constants');
const rp        = require('request-promise');
const httpTest  = require('./tools/http');
const commit    = require('./tools/commit');

const expectAnswer   = httpTest.expectAnswer;

const MEMORY_MODE = true;
const commonConf = {
  ipv4: '127.0.0.1',
  currency: 'bb',
  httpLogs: true,
  forksize: 3,
  xpercent: 0.9,
  msValidity: 10000,
  idtyWindow: 1, // 1 second of duration
  parcatipate: false, // TODO: to remove when startGeneration will be an explicit call
  sigQty: 1
};

const s1 = duniter({
  memory: MEMORY_MODE,
  name: 'bb11'
}, _.extend({
  port: '8560',
  pair: {
    pub: 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd',
    sec: '51w4fEShBk1jCMauWu4mLpmDVfHksKmWcygpxriqCEZizbtERA6de4STKRkQBpxmMUwsKXRjSzuQ8ECwmqN1u2DP'
  }
}, commonConf));

const cat = user('cat', { pub: 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd', sec: '51w4fEShBk1jCMauWu4mLpmDVfHksKmWcygpxriqCEZizbtERA6de4STKRkQBpxmMUwsKXRjSzuQ8ECwmqN1u2DP'}, { server: s1 });
const tac = user('tac', { pub: '2LvDg21dVXvetTD9GdkPLURavLYEqP3whauvPWX4c2qc', sec: '2HuRLWgKgED1bVio1tdpeXrf7zuUszv1yPHDsDj7kcMC4rVSN9RC58ogjtKNfTbH1eFz7rn38U1PywNs3m6Q7UxE'}, { server: s1 });
const tic = user('tic', { pub: 'DNann1Lh55eZMEDXeYt59bzHbA3NJR46DeQYCS2qQdLV', sec: '468Q1XtTq7h84NorZdWBZFJrGkB18CbmbHr9tkp9snt5GiERP7ySs3wM8myLccbAAGejgMRC9rqnXuW3iAfZACm7'}, { server: s1 });
const toc = user('toc', { pub: 'DKpQPUL4ckzXYdnDRvCRKAm1gNvSdmAXnTrJZ7LvM5Qo', sec: '64EYRvdPpTfLGGmaX5nijLXRqWXaVz8r1Z1GtaahXwVSJGQRn7tqkxLb288zwSYzELMEG5ZhXSBYSxsTsz1m9y8F'}, { server: s1 });

describe("Identities expiry", function() {

  before(function() {

    const commitS1 = commit(s1);

    return co(function *() {

      const now = Math.round(new Date().getTime() / 1000);
      yield s1.initWithDAL().then(bma).then((bmapi) => bmapi.openConnections());
      yield cat.selfCert();
      yield tac.selfCert();
      yield tic.selfCert();
      yield cat.cert(tac);
      yield tac.cert(cat);
      yield cat.join();
      yield tac.join();
      yield commitS1();
      yield toc.selfCert();
      yield toc.join();
      yield commitS1({
        time: now + 10
      });
      yield commitS1({
        time: now + 10
      });
    });
  });

  it('should have requirements failing for tic', function() {
    return expectAnswer(rp('http://127.0.0.1:8560/wot/requirements/DNann1Lh55eZMEDXeYt59bzHbA3NJR46DeQYCS2qQdLV', { json: true }), (res) => {
      res.should.have.property('identities').length(1);
      res.identities[0].should.have.property('pubkey').equal('DNann1Lh55eZMEDXeYt59bzHbA3NJR46DeQYCS2qQdLV');
      res.identities[0].should.have.property('uid').equal('tic');
      res.identities[0].should.have.property('expired').equal(true);
    });
  });

  it('should have requirements failing for toc', function() {
    return expectAnswer(rp('http://127.0.0.1:8560/wot/requirements/DKpQPUL4ckzXYdnDRvCRKAm1gNvSdmAXnTrJZ7LvM5Qo', { json: true }), (res) => {
      res.should.have.property('identities').length(1);
      res.identities[0].should.have.property('pubkey').equal('DKpQPUL4ckzXYdnDRvCRKAm1gNvSdmAXnTrJZ7LvM5Qo');
      res.identities[0].should.have.property('uid').equal('toc');
      res.identities[0].should.have.property('expired').equal(true);
    });
  });
});
