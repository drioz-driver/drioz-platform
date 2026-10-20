import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { databaseAdapter, parameterize } from '../lib/postgres.ts';
import { postgresOptions } from '../lib/postgres-options.mjs';
import { operations } from '../lib/operations.ts';

test('PostgreSQL adapter preserves booking contracts and atomic batch rollback', async () => {
  const pg = new PGlite();
  try {
    await pg.exec('BEGIN;' + readFileSync(new URL('../db/postgres-staging.sql', import.meta.url), 'utf8') + ';COMMIT;SET search_path=drioz_staging;');
    const queries:string[]=[];
    const query = async (sql:string, args:any[]) => {
      queries.push(sql);
      const result = await pg.query(sql,args);
      return { rows:result.rows, rowCount:result.affectedRows ?? result.rows.length };
    };
    const db = databaseAdapter(query, work => pg.transaction(async tx => work(async (sql,args) => {
      const result = await tx.query(sql,args);
      return { rows:result.rows, rowCount:result.affectedRows ?? result.rows.length };
    })));
    const ops = operations(db,null,'owner@example.com','test-only-trip-secret-at-least-thirty-two-chars');
    const owner = await ops.actor({id:'owner',email:'owner@example.com',name:'Owner'});
    const customer = await ops.actor({id:'customer',email:'customer@example.com',name:'Customer'});
    await ops.seed();
    await ops.limit(customer);
    await ops.limit(customer);
    await ops.handle(owner,'cities','POST',{id:'hyderabad',enabled:true,base:24900,hourly:14900,night:5000,taxBps:500,commissionBps:2000,zones:[{lat:17.44,lng:78.39,radiusKm:50}]});
        const anonymous={id:'estimate:anonymous',email:'',name:'Guest',role:'customer',disabled:0};
    await ops.limit(anonymous);
    const guestEstimate=await ops.handle(anonymous,'estimate','POST',{cityId:'hyderabad',pickup:'Madhapur',destination:'Airport',pickupPoint:{lat:17.44,lng:78.39},destinationPoint:{lat:17.24,lng:78.43},tripType:'one-way',transmission:'manual',scheduledAt:null});
    assert.ok(guestEstimate.total>0);
    assert.equal(await db.prepare("SELECT * FROM users WHERE id='estimate:anonymous'").first(),null);
const quote = await ops.handle(customer,'quote','POST',{cityId:'hyderabad',pickup:'Madhapur',destination:'Airport',pickupPoint:{lat:17.44,lng:78.39},destinationPoint:{lat:17.24,lng:78.43},tripType:'one-way',transmission:'manual',scheduledAt:null});
    const key = crypto.randomUUID();
    const booking = await ops.handle(customer,'bookings','POST',{quoteId:quote.id,key});
    assert.equal(booking.customer_id,customer.id);
    assert.equal((await ops.handle(customer,'bookings','POST',{quoteId:quote.id,key})).id,booking.id);
    queries.length=0;
    assert.equal((await ops.actor({id:'customer',email:'customer@example.com',name:'Customer'})).id,customer.id);
    assert.equal((await ops.handle(customer,'snapshot','GET',null)).bookings.length,1);
    assert.ok(queries.every(sql=>sql.startsWith('SELECT')), 'polling must not seed cities or rewrite profiles');
    await assert.rejects(db.batch([
      db.prepare("INSERT INTO users(id,email,name,created_at) VALUES('rollback','rollback@example.com','Rollback',1)"),
      db.prepare("INSERT INTO users(id,email,name,created_at) VALUES('owner','duplicate@example.com','Duplicate',1)"),
    ]));
    assert.equal(await db.prepare("SELECT * FROM users WHERE id='rollback'").first(),null);
    assert.equal(parameterize("SELECT '?' AS literal, ? AS value"),"SELECT '?' AS literal, $1 AS value");
  } finally { await pg.close(); }
});

test('database TLS keeps certificate verification and includes the official Supabase CA',()=>{const options=postgresOptions('postgresql://example:example@pooler.supabase.com/postgres?sslmode=no-verify');assert.equal(options.ssl.rejectUnauthorized,true);assert.equal(new URL(options.connectionString).searchParams.has('sslmode'),false);assert.ok(options.ssl.ca.some(c=>c.includes('BEGIN CERTIFICATE')))});
