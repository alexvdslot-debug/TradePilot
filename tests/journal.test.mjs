import test from 'node:test';
import assert from 'node:assert/strict';
import {journalStatistics,validateJournalLinks} from '../app/journal.mjs';
const event=(id,type,quantity,price,minute,extra={})=>({id,type,symbol:'OPEN',quantity,price,currency:'USD',timestamp:`2026-10-01T14:${String(minute).padStart(2,'0')}:00Z`,...extra});
const deposit=(currency='USD')=>({id:'deposit-'+currency,type:'DEPOSIT',currency,amount:'1000',timestamp:'2026-10-01T13:00:00Z'});
const plan=(id,eventIds,status='executed')=>({id,symbol:'OPEN',status,eventIds});
test('closed linked cycle uses actual average-cost partial sales net broker fees',()=>{
 const events=[deposit(),event('buy','BUY','100','3',0,{fee:'1'}),event('partial','SELL','40','3.5',1,{fee:'1'}),event('close','SELL','60','4',2,{fee:'1'})];
 const stats=journalStatistics([plan('j',['buy','partial','close'])],events);
 assert.equal(stats.closedCount,1);assert.equal(stats.wins,1);assert.equal(stats.winRate,1);assert.equal(stats.netByCurrency.USD,'77');assert.equal(stats.trades[0].closedAt,'2026-10-01T14:02:00.000Z');
});
test('unlinked, planned, partial and reversed cycles are excluded from result statistics',()=>{
 const events=[deposit(),event('buy','BUY','2','2',0),event('sell','SELL','1','4',1)];
 const stats=journalStatistics([{id:'legacy',symbol:'OPEN',status:'reviewed'},plan('partial',['buy','sell']),plan('planned',[],'planned')],events);
 assert.equal(stats.closedCount,0);assert.equal(stats.excludedCount,3);assert.equal(stats.winRate,null);assert.equal(stats.netByCurrency.USD,'0');
 const reversed=[deposit(),event('outside','BUY','1','2',0),event('sell','SELL','1','4',1),event('later','BUY','1','2',2)];
 assert.equal(journalStatistics([plan('reversed',['sell','later'])],reversed).closedCount,0);
});
test('statistics reuse full portfolio average allocation including unlinked buy lots',()=>{
 const events=[deposit(),event('linked-buy','BUY','10','2',0,{fee:'1'}),event('other-buy','BUY','10','4',1),event('linked-sell','SELL','10','5',2,{fee:'1'})];
 assert.equal(journalStatistics([plan('j',['linked-buy','linked-sell'])],events).netByCurrency.USD,'18.5');
});
test('mixed-currency broker fees stay separate without invented FX or win classification',()=>{
 const events=[deposit(),deposit('EUR'),event('b','BUY','1','2',0,{fee:'0.1',feeCurrency:'EUR'}),event('s','SELL','1','3',1,{fee:'0.2',feeCurrency:'EUR'})];
 const stats=journalStatistics([plan('j',['b','s'])],events);
 assert.deepEqual(stats.netByCurrency,{EUR:'-0.3',USD:'1'});assert.equal(stats.mixedCurrencyCount,1);assert.equal(stats.wins,0);assert.equal(stats.winRate,null);
});
test('duplicate, shared, missing, wrong-symbol or nontrade event links are rejected',()=>{
 const events=[deposit(),event('b','BUY','1','2',0),event('s','SELL','1','3',1)];
 for(const rows of [[plan('j',['b','b'])],[plan('j',['missing'])],[plan('j',['deposit-USD'])],[{...plan('j',['b']),symbol:'AAPL'}],[plan('one',['b']),plan('two',['b'])],[{...plan('j',[]),eventIds:'b'}]])assert.throws(()=>validateJournalLinks(rows,events),/INVALID_JOURNAL_LINKS/);
 assert.doesNotThrow(()=>validateJournalLinks([{id:'legacy',symbol:'OPEN'}],events));
});
test('closed losing, breakeven and later rebuy cycles count independently',()=>{
 const events=[deposit(),event('b1','BUY','1','3',0),event('s1','SELL','1','2',1),event('b2','BUY','1','4',2),event('s2','SELL','1','4',3)];
 const stats=journalStatistics([plan('j1',['b1','s1']),plan('j2',['b2','s2'],'reviewed')],events);
 assert.equal(stats.closedCount,2);assert.equal(stats.losses,1);assert.equal(stats.breakeven,1);assert.equal(stats.netByCurrency.USD,'-1');
});
