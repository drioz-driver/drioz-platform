import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get, Post, Patch, Body, Param, Req, UseGuards, BadRequestException, ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import helmet from 'helmet';
import { randomInt, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { AuthGuard, requireRole, type Actor } from './auth.js';
import { db } from './db.js';

const trip = z.object({ cityId: z.string().min(1).max(40), pickup: z.string().trim().min(3).max(200), destination: z.string().trim().min(3).max(200), transmission: z.enum(['manual','automatic']), tripType: z.enum(['one-way','return','hourly','outstation']), scheduledAt: z.string().datetime().optional(), idempotencyKey: z.string().uuid() }).strict();
function parse<T>(schema: z.ZodType<T>, body: unknown): T { const result = schema.safeParse(body); if (!result.success) throw new BadRequestException(result.error.flatten()); return result.data; }
function uuid(value: string) { return parse(z.string().uuid(), value); }
type Request = { actor: Actor };
const pinHash = (id: string, pin: string) => createHmac('sha256', process.env.TRIP_PIN_SECRET!).update(`${id}:${pin}`).digest('hex');
async function audit(client: any, actor: Actor, id: string, action: string) {
  await client.query('INSERT INTO audit_events(actor_id,booking_id,action) VALUES($1,$2,$3)',[actor.id,id,action]);
  await client.query('INSERT INTO outbox(booking_id,topic) VALUES($1,$2)',[id,`booking.${action}`]);
}
@Controller()
class PublicController {
  @Get('health/live') live() { return { status: 'up' }; }
  @Get('health/ready') async ready() { await db.query('SELECT 1'); return { database: 'up' }; }
  @Get('cities') async cities() { return (await db.query('SELECT id,name,enabled FROM cities ORDER BY name')).rows; }
}
@Controller()
@UseGuards(AuthGuard)
class ApiController {
  @Get('me') me(@Req() req: Request) { return req.actor; }
  @Get('bookings') async list(@Req() req: Request) {
    const a = req.actor;
    const filter = a.role==='admin' ? '' : a.role==='driver' ? 'WHERE driver_id=$1' : 'WHERE customer_id=$1';
    return (await db.query(`SELECT id,city_id,pickup,destination,trip_type,status,quoted_fare_paise,created_at FROM bookings ${filter} ORDER BY created_at DESC LIMIT 100`, a.role==='admin'?[]:[a.id])).rows;
  }
  @Post('bookings') async create(@Req() req: Request, @Body() raw: unknown) {
    requireRole(req.actor,'customer');
    const b = parse(trip,raw);
    if (b.scheduledAt && Date.parse(b.scheduledAt) <= Date.now()) throw new BadRequestException('Pickup must be in the future');
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const city = (await client.query('SELECT * FROM cities WHERE id=$1 AND enabled=true FOR SHARE',[b.cityId])).rows[0];
      if (!city) throw new BadRequestException('City is not open for bookings');
      const multiplier = {'one-way':1,return:2,hourly:2,outstation:5}[b.tripType];
      // Initial configurable pricing model. Service-zone validation and final rate cards remain a launch requirement.
      const fare = city.base_fare_paise * multiplier;
      const result = await client.query(`INSERT INTO bookings(customer_id,city_id,pickup,destination,transmission,trip_type,scheduled_at,quoted_fare_paise,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(customer_id,idempotency_key) DO NOTHING RETURNING *`,[req.actor.id,b.cityId,b.pickup,b.destination,b.transmission,b.tripType,b.scheduledAt||null,fare,b.idempotencyKey]);
      let record = result.rows[0];
      if (!record) {
        record = (await client.query('SELECT * FROM bookings WHERE customer_id=$1 AND idempotency_key=$2',[req.actor.id,b.idempotencyKey])).rows[0];
        if (record.city_id!==b.cityId || record.pickup!==b.pickup || record.destination!==b.destination || record.transmission!==b.transmission || record.trip_type!==b.tripType || (record.scheduled_at?.toISOString()||null)!==(b.scheduledAt?new Date(b.scheduledAt).toISOString():null)) throw new ConflictException('Idempotency key was already used for a different booking');
      } else await audit(client,req.actor,record.id,'requested');
      await client.query('COMMIT'); return record;
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }
  @Get('drivers') async drivers(@Req() req:Request) {
    requireRole(req.actor,'admin');
    return (await db.query('SELECT d.user_id,d.city_id,d.approved,d.online,u.disabled FROM drivers d JOIN users u ON u.id=d.user_id ORDER BY d.updated_at DESC LIMIT 200')).rows;
  }
  @Get('drivers/profile') async profile(@Req() req:Request) {
    requireRole(req.actor,'driver');
    return (await db.query('SELECT city_id,approved,online FROM drivers WHERE user_id=$1',[req.actor.id])).rows[0] || null;
  }
  @Post('drivers/profile') async apply(@Req() req:Request,@Body() raw:unknown) {
    requireRole(req.actor,'driver');
    const {cityId}=parse(z.object({cityId:z.string().min(1).max(40)}).strict(),raw);
    const city=await db.query('SELECT 1 FROM cities WHERE id=$1',[cityId]);
    if(!city.rowCount)throw new BadRequestException('Unknown city');
    return (await db.query('INSERT INTO drivers(user_id,city_id) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING RETURNING city_id,approved,online',[req.actor.id,cityId])).rows[0] || {message:'Profile already exists'};
  }
  @Patch('drivers/:id/approval') async approve(@Req() req:Request,@Param('id') id:string,@Body() raw:unknown) {
    requireRole(req.actor,'admin');uuid(id);
    const {approved}=parse(z.object({approved:z.boolean()}).strict(),raw);
    const client=await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT user_id FROM drivers WHERE user_id=$1 FOR UPDATE',[id]);
      if(!approved && (await client.query("SELECT 1 FROM bookings WHERE driver_id=$1 AND status IN ('assigned','arrived','in_progress')",[id])).rowCount)throw new ConflictException('Resolve active trip before revoking approval');
      const row=(await client.query('UPDATE drivers SET approved=$1,online=CASE WHEN $1 THEN online ELSE false END,updated_at=now() WHERE user_id=$2 RETURNING user_id,approved,online',[approved,id])).rows[0];
      if(!row)throw new NotFoundException();
      await client.query('COMMIT');return row;
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
  @Patch('drivers/availability') async availability(@Req() req: Request,@Body() raw: unknown) {
    requireRole(req.actor,'driver');
    const b=parse(z.object({online:z.boolean()}).strict(),raw);
    const {rows}=await db.query('UPDATE drivers SET online=$1,updated_at=now() WHERE user_id=$2 AND approved=true RETURNING online',[b.online,req.actor.id]);
    if(!rows[0])throw new ForbiddenException('Approved driver profile required'); return rows[0];
  }
  @Post('bookings/:id/assign') async assign(@Req() req:Request,@Param('id') id:string,@Body() raw:unknown){
    requireRole(req.actor,'admin');uuid(id);
    const {driverId}=parse(z.object({driverId:z.string().uuid()}).strict(),raw);
    const client=await db.connect();
    try{
      await client.query('BEGIN');
      const driver=(await client.query('SELECT d.* FROM drivers d JOIN users u ON u.id=d.user_id WHERE d.user_id=$1 AND d.approved=true AND d.online=true AND u.disabled=false FOR UPDATE OF d',[driverId])).rows[0];
      if(!driver)throw new ConflictException('Driver unavailable');
      const busy=await client.query("SELECT 1 FROM bookings WHERE driver_id=$1 AND status IN ('assigned','arrived','in_progress')",[driverId]);
      if(busy.rowCount)throw new ConflictException('Driver already has an active trip');
      const b=(await client.query("UPDATE bookings SET driver_id=$1,status='assigned',updated_at=now() WHERE id=$2 AND status='requested' AND city_id=$3 RETURNING *",[driverId,id,driver.city_id])).rows[0];
      if(!b)throw new ConflictException('Booking cannot be assigned to this driver');
      await audit(client,req.actor,id,'assigned');await client.query('COMMIT');return b;
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
  @Post('bookings/:id/start-code') async startCode(@Req() req:Request,@Param('id') id:string){
    requireRole(req.actor,'customer');uuid(id);
    const client=await db.connect();
    try{
      await client.query('BEGIN');
      const b=(await client.query("SELECT id FROM bookings WHERE id=$1 AND customer_id=$2 AND status IN ('assigned','arrived') FOR UPDATE",[id,req.actor.id])).rows[0];
      if(!b)throw new NotFoundException();
      // Rotation does not reset the attempt budget, preventing unlimited guesses through reissue.
      const existing=(await client.query('SELECT attempts FROM trip_pins WHERE booking_id=$1',[id])).rows[0];
      if(existing?.attempts>=5)throw new ForbiddenException('Start code locked; contact support');
      const pin=String(randomInt(100000,1000000));
      await client.query("INSERT INTO trip_pins(booking_id,pin_hash,expires_at) VALUES($1,$2,now()+interval '15 minutes') ON CONFLICT(booking_id) DO UPDATE SET pin_hash=EXCLUDED.pin_hash,expires_at=EXCLUDED.expires_at",[id,pinHash(id,pin)]);
      await client.query('COMMIT');return {code:pin,expiresInSeconds:900};
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
  @Patch('bookings/:id/status') async transition(@Req() req:Request,@Param('id') id:string,@Body() raw:unknown){
    uuid(id);const a=req.actor;
    const {status,code}=parse(z.object({status:z.enum(['arrived','in_progress','completed','cancelled']),code:z.string().regex(/^\d{6}$/).optional()}).strict(),raw);
    const client=await db.connect();
    try{
      await client.query('BEGIN');
      const b=(await client.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!b)throw new NotFoundException();
      if(a.role==='customer'&&(b.customer_id!==a.id||status!=='cancelled'))throw new ForbiddenException();
      if(a.role==='driver'&&b.driver_id!==a.id)throw new ForbiddenException();
      const allowed:Record<string,string[]>={requested:['cancelled'],assigned:['arrived','cancelled'],arrived:['in_progress','cancelled'],in_progress:['completed'],completed:[],cancelled:[]};
      if(!allowed[b.status].includes(status))throw new ConflictException('Invalid trip transition');
      if(status==='in_progress'){
        const p=(await client.query('SELECT * FROM trip_pins WHERE booking_id=$1 FOR UPDATE',[id])).rows[0];
        const valid=p&&p.attempts<5&&new Date(p.expires_at).getTime()>Date.now()&&code&&timingSafeEqual(Buffer.from(p.pin_hash,'hex'),Buffer.from(pinHash(id,code),'hex'));
        if(!valid){if(p)await client.query('UPDATE trip_pins SET attempts=attempts+1 WHERE booking_id=$1',[id]);await client.query('COMMIT');throw new ForbiddenException('Invalid, expired or locked trip-start code');}
        await client.query('DELETE FROM trip_pins WHERE booking_id=$1',[id]);
      }
      const updated=(await client.query('UPDATE bookings SET status=$1,updated_at=now() WHERE id=$2 RETURNING *',[status,id])).rows[0];
      await audit(client,a,id,status);await client.query('COMMIT');return updated;
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
}
@Module({controllers:[PublicController,ApiController],providers:[AuthGuard]})
class AppModule{}
for(const key of ['DATABASE_URL','REDIS_URL','WEB_ORIGIN','OIDC_ISSUER','OIDC_AUDIENCE','OIDC_JWKS_URL','TRIP_PIN_SECRET'])if(!process.env[key])throw new Error(`${key} is required`);
if(process.env.TRIP_PIN_SECRET!.length<32)throw new Error('TRIP_PIN_SECRET must be at least 32 characters');
const app=await NestFactory.create(AppModule,{bodyParser:true});
app.use(helmet());app.enableCors({origin:process.env.WEB_ORIGIN,methods:['GET','POST','PATCH'],allowedHeaders:['Authorization','Content-Type']});
app.enableShutdownHooks();
await app.listen(Number(process.env.PORT||4000),'0.0.0.0');
