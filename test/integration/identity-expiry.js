"use strict";

const _         = require('underscore');
const co        = require('co');
const should    = require('should');
const duniter   = require('../../index');
const bma       = require('../../app/modules/bma').BmaDependency.duniter.methods.bma;
const prover    = require('../../app/modules/prover').ProverDependency.duniter.methods;
const user      = require('./tools/user');
const constants = require('../../app/lib/constants');
const rp        = require('request-promise');
const httpTest  = require('./tools/http');
const commit    = require('./tools/commit');
const shutDownEngine = require('./tools/shutDownEngine');

const expectAnswer = httpTest.expectAnswer;
const expectError  = httpTest.expectError;

const MEMORY_MODE = true;
const commonConf = {
  ipv4: '127.0.0.1',
  currency: 'bb',
  httpLogs: true,
  forksize: 3,
  xpercent: 0.9,
  msValidity: 10000,
  idtyWindow: 1, // 1 second of duration
  sigQty: 1
};

let s1, cat, tac, tic, toc

const now = 1482300000;
const commitS1 = (opts) => commit(s1)(opts)

describe("Identities expiry", function() {

  before(function() {

    return co(function *() {

      s1 = duniter(
        '/bb11',
        MEMORY_MODE,
        _.extend({
          port: '8560',
          pair: {
            pub: 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd',
            sec: '51w4fEShBk1jCMauWu4mLpmDVfHksKmWcygpxriqCEZizbtERA6de4STKRkQBpxmMUwsKXRjSzuQ8ECwmqN1u2DP'
          }
        }, commonConf));

      cat = user('cat', { pub: 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd', sec: '51w4fEShBk1jCMauWu4mLpmDVfHksKmWcygpxriqCEZizbtERA6de4STKRkQBpxmMUwsKXRjSzuQ8ECwmqN1u2DP'}, { server: s1 });
      tac = user('tac', { pub: '2LvDg21dVXvetTD9GdkPLURavLYEqP3whauvPWX4c2qc', sec: '2HuRLWgKgED1bVio1tdpeXrf7zuUszv1yPHDsDj7kcMC4rVSN9RC58ogjtKNfTbH1eFz7rn38U1PywNs3m6Q7UxE'}, { server: s1 });
      tic = user('tic', { pub: 'DNann1Lh55eZMEDXeYt59bzHbA3NJR46DeQYCS2qQdLV', sec: '468Q1XtTq7h84NorZdWBZFJrGkB18CbmbHr9tkp9snt5GiERP7ySs3wM8myLccbAAGejgMRC9rqnXuW3iAfZACm7'}, { server: s1 });
      toc = user('toc', { pub: 'DKpQPUL4ckzXYdnDRvCRKAm1gNvSdmAXnTrJZ7LvM5Qo', sec: '64EYRvdPpTfLGGmaX5nijLXRqWXaVz8r1Z1GtaahXwVSJGQRn7tqkxLb288zwSYzELMEG5ZhXSBYSxsTsz1m9y8F'}, { server: s1 });

      yield s1.initWithDAL().then(bma).then((bmapi) => bmapi.openConnections());
      prover.hookServer(s1)
      yield cat.createIdentity();
      yield tac.createIdentity();
      yield tic.createIdentity();
      yield cat.cert(tac);
      yield tac.cert(cat);
      yield cat.join();
      yield tac.join();
      yield commitS1({
        time: now
      });
      yield toc.createIdentity();
      yield toc.join();
      yield commitS1({
        time: now + 5
      });
    });
  });

  after(() => {
    return shutDownEngine(s1)
  })

  it('should have requirements failing for tic', function() {
    // tic has been cleaned up, since its identity has expired after the root block
    return expectError(404, 'No identity matching this pubkey or uid', rp('http://127.0.0.1:8560/wot/requirements/DNann1Lh55eZMEDXeYt59bzHbA3NJR46DeQYCS2qQdLV', { json: true }));
  });

  it('should have requirements failing for toc', function() {
    return expectAnswer(rp('http://127.0.0.1:8560/wot/requirements/DKpQPUL4ckzXYdnDRvCRKAm1gNvSdmAXnTrJZ7LvM5Qo', { json: true }), (res) => {
      res.should.have.property('identities').length(1);
      res.identities[0].should.have.property('pubkey').equal('DKpQPUL4ckzXYdnDRvCRKAm1gNvSdmAXnTrJZ7LvM5Qo');
      res.identities[0].should.have.property('uid').equal('toc');
      res.identities[0].should.have.property('expired').equal(false);
    });
  });

  it('should have requirements failing for toc', () => co(function*() {
    // tic has been cleaned up after the block#2
    yield commitS1({
      time: now + 5
    });
    return expectError(404, 'No identity matching this pubkey or uid', rp('http://127.0.0.1:8560/wot/requirements/DNann1Lh55eZMEDXeYt59bzHbA3NJR46DeQYCS2qQdLV', { json: true }));
  }));
});
