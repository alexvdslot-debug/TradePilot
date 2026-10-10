const MINUTE_LIMIT=8,DAY_LIMIT=800;
const local=new Map();
// One row per provider; both budget checks and increments occur in the same write.
export const PROVIDER_QUOTA_SQL=`INSERT INTO provider_quota
 (provider,minute_window,minute_count,day_window,day_count)
 VALUES (?1,?2,1,?3,1)
 ON CONFLICT(provider) DO UPDATE SET
 minute_window=excluded.minute_window,
 minute_count=CASE WHEN provider_quota.minute_window=excluded.minute_window THEN provider_quota.minute_count+1 ELSE 1 END,
 day_window=excluded.day_window,
 background_minute_count=CASE WHEN provider_quota.minute_window=excluded.minute_window THEN provider_quota.background_minute_count ELSE 0 END,
 background_day_count=CASE WHEN provider_quota.day_window=excluded.day_window THEN provider_quota.background_day_count ELSE 0 END,
 day_count=CASE WHEN provider_quota.day_window=excluded.day_window THEN provider_quota.day_count+1 ELSE 1 END
 WHERE provider_quota.minute_window<=excluded.minute_window
 AND provider_quota.day_window<=excluded.day_window
 AND (provider_quota.minute_window<>excluded.minute_window OR provider_quota.minute_count<?4)
 AND (provider_quota.day_window<>excluded.day_window OR provider_quota.day_count<?5)
 RETURNING minute_count,day_count`;

// Background calls share the global write, but reserve at least 4/minute and
// 200/day for interactive callers and cannot themselves exceed 300/day.
export const BACKGROUND_PROVIDER_QUOTA_SQL=`INSERT INTO provider_quota
(provider,minute_window,minute_count,day_window,day_count,background_minute_count,background_day_count)
VALUES (?1,?2,1,?3,1,1,1)
ON CONFLICT(provider) DO UPDATE SET
minute_window=excluded.minute_window,
minute_count=CASE WHEN provider_quota.minute_window=excluded.minute_window THEN provider_quota.minute_count+1 ELSE 1 END,
day_window=excluded.day_window,
day_count=CASE WHEN provider_quota.day_window=excluded.day_window THEN provider_quota.day_count+1 ELSE 1 END,
background_minute_count=CASE WHEN provider_quota.minute_window=excluded.minute_window THEN provider_quota.background_minute_count+1 ELSE 1 END,
background_day_count=CASE WHEN provider_quota.day_window=excluded.day_window THEN provider_quota.background_day_count+1 ELSE 1 END
WHERE provider_quota.minute_window<=excluded.minute_window AND provider_quota.day_window<=excluded.day_window
AND (provider_quota.minute_window<>excluded.minute_window OR provider_quota.minute_count<4)
AND (provider_quota.day_window<>excluded.day_window OR provider_quota.day_count<600)
AND (provider_quota.minute_window<>excluded.minute_window OR provider_quota.background_minute_count<4)
AND (provider_quota.day_window<>excluded.day_window OR provider_quota.background_day_count<300)
RETURNING minute_count,day_count`;

/** Consume immediately before one actual Twelve Data fetch, never on cached responses. */
export async function consumeProviderQuota(env,{now=Date.now(),background=false}={}){
 if(!Number.isSafeInteger(now)||now<0)return {allowed:false,code:'PROVIDER_QUOTA_UNAVAILABLE',status:503};
 const minute=Math.floor(now/60000),day=Math.floor(now/86400000),provider='twelve-data';
 const denied={allowed:false,code:'PROVIDER_QUOTA',status:429,retryAfter:Math.max(1,Math.ceil(((minute+1)*60000-now)/1000))};
 if(background&&env.MARKET_QUOTA_DB===undefined)return {allowed:false,code:'PROVIDER_QUOTA_UNAVAILABLE',status:503};
 if(env.MARKET_QUOTA_DB===undefined){
  const previous=local.get(provider);
  if(previous&&(minute<previous.minute||day<previous.day))return denied;
  const minuteCount=previous?.minute===minute?previous.minuteCount:0;
  const dayCount=previous?.day===day?previous.dayCount:0;
  if(minuteCount>=MINUTE_LIMIT||dayCount>=DAY_LIMIT)return denied;
  const row={minute,day,minuteCount:minuteCount+1,dayCount:dayCount+1};local.set(provider,row);
  return {allowed:true,mode:'local',minuteCount:row.minuteCount,dayCount:row.dayCount};
 }
 try{
  const statement=env.MARKET_QUOTA_DB.prepare(background?BACKGROUND_PROVIDER_QUOTA_SQL:PROVIDER_QUOTA_SQL);const row=await statement.bind(...(background?[provider,minute,day]:[provider,minute,day,MINUTE_LIMIT,DAY_LIMIT])).first();
  if(row===null)return denied;
  if(!row||!Number.isSafeInteger(row.minute_count)||row.minute_count<1||row.minute_count>MINUTE_LIMIT||!Number.isSafeInteger(row.day_count)||row.day_count<1||row.day_count>DAY_LIMIT)throw Error('INVALID_QUOTA_RESULT');
  return {allowed:true,mode:'shared',minuteCount:row.minute_count,dayCount:row.day_count};
 }catch{return {allowed:false,code:'PROVIDER_QUOTA_UNAVAILABLE',status:503}}
}
