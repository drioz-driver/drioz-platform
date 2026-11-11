import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {offerAlertAction,presentedOfferIds} from '../mobile/drioz-partner/src/offer-alert-policy.ts';

const base={offerId:'offer-1',foreground:false,lastAlertedOfferId:null,presentedOfferIds:[] as string[]};
const note=(data:unknown)=>({request:{content:{data}}});

test('background offer raises a local notification even though a push token is registered',()=>{
  // The policy takes no "push registered" input at all: registration can never silence the alert.
  assert.equal(offerAlertAction(base),'notify');
  assert.equal(offerAlertAction({...base,lastAlertedOfferId:'offer-0'}),'notify');
  const alerts=readFileSync(new URL('../mobile/drioz-partner/src/alerts.ts',import.meta.url),'utf8');
  assert.doesNotMatch(alerts,/PUSH_FLAG/);
});

test('foreground offer vibrates instead of stacking a banner on the popup',()=>{
  assert.equal(offerAlertAction({...base,foreground:true}),'vibrate');
});

test('skips an offer that was already alerted, is already presented, or has no id',()=>{
  for(const foreground of [true,false]){
    assert.equal(offerAlertAction({...base,foreground,lastAlertedOfferId:'offer-1'}),'skip');
    assert.equal(offerAlertAction({...base,foreground,presentedOfferIds:['offer-9','offer-1']}),'skip');
    assert.equal(offerAlertAction({...base,foreground,offerId:''}),'skip');
    assert.equal(offerAlertAction({...base,foreground,offerId:null}),'skip');
    assert.equal(offerAlertAction({...base,foreground,offerId:undefined}),'skip');
  }
});

test('an offer_wake push (no offerId) does not suppress the local alert',()=>{
  const presented=presentedOfferIds([note({type:'offer_wake'}),note({type:'offer_wake',offerId:''}),note(null),note(undefined),{},null]);
  assert.deepEqual(presented,[]);
  assert.equal(offerAlertAction({...base,presentedOfferIds:presented}),'notify');
});

test('presentedOfferIds extracts only string data.offerId values',()=>{
  assert.deepEqual(presentedOfferIds([note({type:'offer',offerId:'a'}),note({offerId:42}),note({offerId:'b'}),note({type:'trip'})]),['a','b']);
  assert.deepEqual(presentedOfferIds(null),[]);
  assert.deepEqual(presentedOfferIds(undefined),[]);
  assert.equal(offerAlertAction({...base,offerId:'a',presentedOfferIds:presentedOfferIds([note({offerId:'a'})])}),'skip');
});
