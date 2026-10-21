-- Driver money is isolated from customer money and test money from real money.
SET LOCAL search_path=drioz_staging;
ALTER TABLE gateway_orders DROP CONSTRAINT gateway_orders_purpose_check;
ALTER TABLE gateway_orders ADD CONSTRAINT gateway_orders_purpose_check CHECK(purpose IN ('topup','booking','driver_topup'));
CREATE TABLE driver_accounts(
 driver_id text NOT NULL REFERENCES drivers(user_id),mode text NOT NULL CHECK(mode IN ('test','live')),
 promo bigint NOT NULL DEFAULT 0 CHECK(promo>=0),recharge bigint NOT NULL DEFAULT 0,
 earnings bigint NOT NULL DEFAULT 0 CHECK(earnings>=0),debt bigint NOT NULL DEFAULT 0 CHECK(debt>=0),
 PRIMARY KEY(driver_id,mode)
);
CREATE TABLE driver_ledger(
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,driver_id text NOT NULL,mode text NOT NULL,
 bucket text NOT NULL CHECK(bucket IN ('promo','recharge','earnings','debt')),amount bigint NOT NULL CHECK(amount<>0),
 event_key text NOT NULL,description text NOT NULL,created_at bigint NOT NULL,
 FOREIGN KEY(driver_id,mode) REFERENCES driver_accounts(driver_id,mode),UNIQUE(driver_id,mode,event_key,bucket)
);
CREATE TABLE driver_coupons(
 driver_id text NOT NULL,mode text NOT NULL,code text NOT NULL CHECK(code='DRIOZ500'),identity_hash text NOT NULL,
 created_at bigint NOT NULL,PRIMARY KEY(driver_id,mode,code),UNIQUE(mode,code,identity_hash),
 FOREIGN KEY(driver_id,mode) REFERENCES driver_accounts(driver_id,mode)
);
CREATE TABLE driver_trip_money(
 booking_id text NOT NULL REFERENCES bookings(id),mode text NOT NULL,driver_id text NOT NULL,
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','cash','pending','available','review')),
 commission bigint NOT NULL CHECK(commission>=0),promo_used bigint NOT NULL DEFAULT 0,recharge_used bigint NOT NULL DEFAULT 0,
 debt_created bigint NOT NULL DEFAULT 0,net bigint NOT NULL CHECK(net>=0),settles_at bigint,completed_at bigint,
 PRIMARY KEY(booking_id,mode),FOREIGN KEY(driver_id,mode) REFERENCES driver_accounts(driver_id,mode)
);
CREATE TABLE driver_banks(
 driver_id text PRIMARY KEY REFERENCES drivers(user_id),holder text NOT NULL,account_number text NOT NULL,ifsc text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified')),fund_account_id text,updated_at bigint NOT NULL
);
CREATE TABLE driver_withdrawals(
 id text PRIMARY KEY,driver_id text NOT NULL,mode text NOT NULL,amount bigint NOT NULL CHECK(amount>=100),
 fund_account_id text NOT NULL,request_key text NOT NULL,provider_id text UNIQUE,
 status text NOT NULL CHECK(status IN ('processing','processed','failed','reversed')),created_at bigint NOT NULL,
 FOREIGN KEY(driver_id,mode) REFERENCES driver_accounts(driver_id,mode),UNIQUE(driver_id,mode,request_key)
);
CREATE INDEX driver_history ON driver_ledger(driver_id,mode,created_at DESC);
CREATE INDEX driver_settlement_due ON driver_trip_money(settles_at) WHERE status='pending';
CREATE INDEX driver_withdrawal_history ON driver_withdrawals(driver_id,mode,created_at DESC);
-- Invoker-only functions, private schema, fully qualified search path. No public RPC grants.
CREATE FUNCTION driver_sync_trip(trip_id text, money_mode text) RETURNS void
LANGUAGE plpgsql SET search_path=drioz_staging,pg_temp AS $$
DECLARE b bookings%ROWTYPE;t driver_trip_money%ROWTYPE;a driver_accounts%ROWTYPE;
 paid bigint;at_ms bigint:=(extract(epoch from clock_timestamp())*1000)::bigint;pp bigint;rr bigint;dd bigint;
BEGIN
 SELECT * INTO b FROM bookings WHERE id=trip_id FOR UPDATE;
 SELECT * INTO t FROM driver_trip_money WHERE booking_id=trip_id AND mode=money_mode FOR UPDATE;
 IF NOT FOUND OR b.status<>'completed' THEN RETURN; END IF;
 SELECT * INTO a FROM driver_accounts WHERE driver_id=t.driver_id AND mode=money_mode FOR UPDATE;
 IF t.status='reserved' THEN
  t.commission:=GREATEST(0,b.fare-b.partner_fare);t.net:=b.partner_fare;
  UPDATE driver_trip_money SET commission=t.commission,net=t.net WHERE booking_id=trip_id AND mode=money_mode;
  pp:=LEAST(a.promo,t.commission);rr:=t.commission-pp;dd:=0;
  UPDATE driver_accounts SET promo=promo-pp,recharge=recharge-rr,debt=debt+dd WHERE driver_id=t.driver_id AND mode=money_mode;
  INSERT INTO driver_ledger(driver_id,mode,bucket,amount,event_key,description,created_at)
   SELECT t.driver_id,money_mode,bucket,amount,'commission:'||trip_id,'Commission on completed ride',at_ms
   FROM (VALUES('promo',-pp),('recharge',-rr),('debt',dd)) AS x(bucket,amount) WHERE amount<>0;
  UPDATE driver_trip_money SET status='cash',promo_used=pp,recharge_used=rr,debt_created=dd,completed_at=at_ms WHERE booking_id=trip_id AND mode=money_mode;
  SELECT * INTO t FROM driver_trip_money WHERE booking_id=trip_id AND mode=money_mode;
 END IF;
 SELECT COALESCE(sum(amount),0) INTO paid FROM gateway_payments WHERE booking_id=trip_id AND mode=money_mode;
 IF paid>=b.fare AND t.status='cash' THEN
  -- An already manually paid legacy payout must never be paid a second time.
  IF EXISTS(SELECT 1 FROM payouts WHERE booking_id=trip_id AND status='paid') THEN
   UPDATE driver_trip_money SET status='review' WHERE booking_id=trip_id AND mode=money_mode;RETURN;
  END IF;
  UPDATE driver_accounts SET promo=promo+t.promo_used,recharge=recharge+t.recharge_used,debt=debt-t.debt_created WHERE driver_id=t.driver_id AND mode=money_mode;
  INSERT INTO driver_ledger(driver_id,mode,bucket,amount,event_key,description,created_at)
   SELECT t.driver_id,money_mode,bucket,amount,'online-offset:'||trip_id,'Commission taken from online fare; balance restored',at_ms
   FROM (VALUES('promo',t.promo_used),('recharge',t.recharge_used),('debt',-t.debt_created)) AS x(bucket,amount) WHERE amount<>0;
  UPDATE driver_trip_money SET status='pending',settles_at=at_ms+14400000 WHERE booking_id=trip_id AND mode=money_mode;
 END IF;
END $$;
CREATE FUNCTION driver_booking_changed() RETURNS trigger LANGUAGE plpgsql SET search_path=drioz_staging,pg_temp AS $$
DECLARE t record;
BEGIN
 IF NEW.status='completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
  FOR t IN SELECT mode FROM driver_trip_money WHERE booking_id=NEW.id LOOP PERFORM driver_sync_trip(NEW.id,t.mode);END LOOP;
 ELSIF NEW.status IN ('cancelled','requested') AND OLD.status IS DISTINCT FROM NEW.status THEN
  DELETE FROM driver_trip_money WHERE booking_id=NEW.id AND status='reserved';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER driver_completion AFTER UPDATE OF status ON bookings FOR EACH ROW EXECUTE FUNCTION driver_booking_changed();
CREATE FUNCTION driver_payment_changed() RETURNS trigger LANGUAGE plpgsql SET search_path=drioz_staging,pg_temp AS $$
BEGIN PERFORM driver_sync_trip(NEW.booking_id,NEW.mode);RETURN NEW;END $$;
CREATE TRIGGER driver_online_payment AFTER INSERT ON gateway_payments FOR EACH ROW EXECUTE FUNCTION driver_payment_changed();
CREATE FUNCTION driver_release_earnings() RETURNS integer LANGUAGE plpgsql SET search_path=drioz_staging,pg_temp AS $$
DECLARE t record;n integer:=0;at_ms bigint:=(extract(epoch from clock_timestamp())*1000)::bigint;
BEGIN
 FOR t IN SELECT * FROM driver_trip_money WHERE status='pending' AND settles_at<=at_ms ORDER BY settles_at FOR UPDATE SKIP LOCKED LOOP
  -- Refunds pause release. Gateway refunds/chargebacks must be reviewed by finance.
  IF t.mode='live' AND EXISTS(SELECT 1 FROM payments WHERE booking_id=t.booking_id AND status='refunded') THEN
   UPDATE driver_trip_money SET status='review' WHERE booking_id=t.booking_id AND mode=t.mode;CONTINUE;
  END IF;
  UPDATE driver_accounts SET earnings=earnings+t.net WHERE driver_id=t.driver_id AND mode=t.mode;
  IF t.net>0 THEN INSERT INTO driver_ledger(driver_id,mode,bucket,amount,event_key,description,created_at)
   VALUES(t.driver_id,t.mode,'earnings',t.net,'earnings:'||t.booking_id,'Online ride earnings released',at_ms);END IF;
  UPDATE driver_trip_money SET status='available' WHERE booking_id=t.booking_id AND mode=t.mode;
  UPDATE payouts SET status='wallet_managed' WHERE booking_id=t.booking_id AND status='pending';n:=n+1;
 END LOOP;RETURN n;
END $$;
ALTER TABLE driver_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_trip_money ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_withdrawals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON driver_accounts,driver_ledger,driver_coupons,driver_trip_money,driver_banks,driver_withdrawals FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION driver_sync_trip(text,text),driver_booking_changed(),driver_payment_changed(),driver_release_earnings() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION driver_refund_review() RETURNS trigger LANGUAGE plpgsql SET search_path=drioz_staging,pg_temp AS $$
BEGIN
 IF NEW.status='refunded' THEN UPDATE driver_trip_money SET status='review' WHERE booking_id=NEW.booking_id AND mode='live' AND status IN ('pending','available');END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER driver_refund_hold AFTER INSERT ON payments FOR EACH ROW EXECUTE FUNCTION driver_refund_review();
REVOKE ALL ON FUNCTION driver_refund_review() FROM PUBLIC,anon,authenticated;
