// Run with: node --test tests/portfolio.test.cjs
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../v4.html'),'utf8');
const js=html.split('<script>')[1].split('</script>')[0];
const match=js.match(/function calculatePositions\(tx\)\{.*?return p\}/);
if(!match)throw Error('Position engine not found');
const calculatePositions=vm.runInNewContext(match[0]+';calculatePositions');
const tx=(side,q,price,fee=0,seq=0)=>({t:'OPEN',side,q,price,fee,seq,date:'2026-10-09'});
test('weighted cost including buy fees',()=>{const p=calculatePositions([tx('buy',100,2.5,1)]).OPEN;assert.equal(p.q,100);assert.equal(p.cost,251)});
test('partial sale preserves weighted average cost',()=>{const p=calculatePositions([tx('buy',100,2.5,1,1),tx('buy',50,3,1,2),tx('sell',10,3.2,1,3)]).OPEN;assert.ok(Math.abs(p.q-140)<1e-8);assert.ok(Math.abs(p.cost-375.2)<1e-8);assert.ok(Math.abs(p.realized-4.2)<1e-8)});
test('full exit resets cost',()=>{const p=calculatePositions([tx('buy',10,2,0,1),tx('sell',10,3,0,2)]).OPEN;assert.equal(p.q,0);assert.equal(p.cost,0);assert.equal(p.realized,10)});
test('oversell is rejected',()=>assert.throws(()=>calculatePositions([tx('sell',1,2)]),/Verkoop groter/));
test('invalid fee is rejected',()=>assert.throws(()=>calculatePositions([tx('buy',1,2,-1)]),/Ongeldige transactie/));
test('invalid price is rejected',()=>assert.throws(()=>calculatePositions([tx('buy',1,0)]),/Ongeldige transactie/));
test('transaction order is deterministic',()=>{const p=calculatePositions([tx('sell',1,3,0,2),tx('buy',1,2,0,1)]).OPEN;assert.equal(p.realized,1)});

test('chronological sorting takes priority over sequence across dates',()=>{
 const a={...tx('buy',2,2,0,99),date:'2026-10-08'};
 const b={...tx('sell',1,3,0,1),date:'2026-10-09'};
 const p=calculatePositions([b,a]).OPEN;
 assert.equal(p.q,1);assert.equal(p.realized,1);
});
test('same-day transactions sort by sequence',()=>{
 const p=calculatePositions([tx('sell',1,3,0,20),tx('buy',1,2,0,10)]).OPEN;
 assert.equal(p.q,0);assert.equal(p.realized,1);
});
