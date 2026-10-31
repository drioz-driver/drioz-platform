'use client';
/** DRIOZ steering-wheel motion system for the web (mirrors mobile/packages/core/src/Steering.tsx). */
import type {CSSProperties} from 'react';

export function SteeringWheel({size=48,color='var(--brand)',rim=color,hub='var(--night)',className='',style}:{size?:number;color?:string;rim?:string;hub?:string;className?:string;style?:CSSProperties}){
 return <svg className={'wheel '+className} style={style} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
  <circle cx="50" cy="50" r="43" stroke={rim} strokeWidth="10" fill="none"/>
  <path d="M7.4 56 A43 43 0 0 0 92.6 56" stroke={color} strokeWidth="10" fill="none"/>
  <path d="M8 54 Q50 38 92 54 A43 43 0 0 1 8 54 Z" fill={color}/>
  <g fill={hub}><path d="M22 62 Q34 58 41 66 Q44 76 38 86 Q26 80 22 62 Z"/><path d="M78 62 Q66 58 59 66 Q56 76 62 86 Q74 80 78 62 Z"/></g>
  <circle cx="50" cy="53" r="7" fill={hub}/>
 </svg>;
}

/** Wheel that steers left and right above a moving road. */
export function SteeringLoader({label,size=64,dark=false}:{label?:string;size?:number;dark?:boolean}){
 return <div className={'steer-loader'+(dark?' dark':'')} role="status" aria-label={label||'Loading'}>
  <SteeringWheel size={size} className="steer" rim={dark?'#e9f2ee':'var(--ink)'} hub={dark?'var(--night)':'var(--surface)'}/>
  <div className="road" style={{width:size*1.6}}><i/></div>
  {label&&<span>{label}</span>}
 </div>;
}

/** Signature band of rolling steering wheels. */
export function SteeringStrip({height=48,urgent=false,className=''}:{height?:number;urgent?:boolean;className?:string}){
 const wheel=Math.round(height*.62);
 return <div className={'steer-strip'+(urgent?' urgent':'')+' '+className} style={{height,['--w' as string]:wheel+'px',['--gap' as string]:Math.round(height*.55)+'px'}} aria-hidden="true">
  <div className="track">{Array.from({length:28},(_,i)=><SteeringWheel key={i} size={wheel} className={'roll'+(i%3===1?' lead':'')} color={urgent?'var(--danger)':'var(--brand)'} rim={i%3===1?'#e9f2ee':urgent?'var(--danger)':'var(--brand)'} hub="var(--night)"/>)}</div>
 </div>;
}

/** Radar rings around a steering wheel — "finding your partner". */
export function SearchingWheel({size=64}:{size?:number}){
 return <div className="searching" style={{width:size*2.2,height:size*1.8}} aria-hidden="true"><i/><i/><i/><SteeringWheel size={size} className="steer" rim="#e9f2ee" hub="var(--night)"/></div>;
}

/** Countdown ring drained with a CSS animation whose duration is the time left. */
export function CountdownWheel({size=140,total,remaining,seconds}:{size?:number;total:number;remaining:number;seconds:number}){
 const stroke=8,r=(size-stroke)/2,c=2*Math.PI*r,urgent=seconds<=8;
 return <div className={'countdown'+(urgent?' urgent':'')} style={{width:size,height:size}}>
  <svg className="ring-svg" width={size} height={size}><circle cx={size/2} cy={size/2} r={r} className="track" strokeWidth={stroke} fill="none"/>
   <circle cx={size/2} cy={size/2} r={r} className="ring" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c}
    style={{strokeDashoffset:c*(1-remaining/total),['--c' as string]:c,animationDuration:remaining+'ms'}}/></svg>
  <SteeringWheel size={size*.56} className={urgent?'steer fast':'steer'} rim="#e9f2ee" hub="var(--night-2)"/>
  <b>{seconds}s</b>
 </div>;
}
