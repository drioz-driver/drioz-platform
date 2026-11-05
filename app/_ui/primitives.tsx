'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {CircleAlert,Inbox,X,type LucideIcon} from 'lucide-react';
import {errorMessage,label,statusTone} from './client';
import {SteeringWheel} from './steering';

export function Field({title,children,hint}:{title:string;children:ReactNode;hint?:string}){
 return <label className="field"><span>{title}</span>{children}{hint&&<small className="helper" style={{display:'block',marginTop:6}}>{hint}</small>}</label>;
}

export function Badge({value,tone}:{value:string;tone?:string}){
 const text=label(value);
 return <span className={'badge '+(tone??statusTone(text))}>{text}</span>;
}

export function Empty({title,text,icon:Icon=Inbox,children}:{title:string;text:string;icon?:LucideIcon;children?:ReactNode}){
 return <div className="empty"><span className="tile-icon"><Icon size={24}/></span><h3>{title}</h3><p>{text}</p>{children&&<div style={{marginTop:18}}>{children}</div>}</div>;
}

export function Metric({icon:Icon,title,value,note,feature=false}:{icon:LucideIcon;title:string;value:ReactNode;note?:ReactNode;feature?:boolean}){
 return <div className={'metric'+(feature?' feature':'')}><span className="metric-icon"><Icon size={19}/></span><span>{title}</span><strong>{value}</strong>{note&&<small>{note}</small>}</div>;
}

/** Async form with busy state, inline result message and optional reset. */
export function Form({onSubmit,children,button='Save',disabled=false,reset=false,className,buttonClass='primary'}:{onSubmit:(f:FormData)=>Promise<unknown>;children:ReactNode;button?:ReactNode;disabled?:boolean;reset?:boolean;className?:string;buttonClass?:string}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false);
 return <form className={className} onSubmit={async e=>{e.preventDefault();if(busy)return;const form=e.currentTarget;const f=new FormData(form);setBusy(true);setMessage('');setFailed(false);try{const result:any=await onSubmit(f);setMessage(result?.message||'Saved successfully.');if(reset)form.reset()}catch(err){setFailed(true);setMessage(errorMessage(err,'Unable to save'))}finally{setBusy(false)}}}>
  {children}
  <button className={buttonClass} disabled={busy||disabled}>{busy?<><SteeringWheel size={18} className="spin" color="currentColor" rim="currentColor" hub="transparent"/>Saving…</>:button}</button>
  {message&&<p role={failed?'alert':'status'} className={'form-message'+(failed?' err':'')}>{message}</p>}
 </form>;
}

export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',key);const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{window.removeEventListener('keydown',key);document.body.style.overflow=overflow}},[onClose]);
 return <div className="modal-backdrop" onClick={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}><button className="close ghost" aria-label="Close" onClick={onClose}><X size={18}/></button>{children}</section></div>;
}

export function Callout({children,tone='warn',icon:Icon=CircleAlert}:{children:ReactNode;tone?:'warn'|'info';icon?:LucideIcon}){
 return <div className={'callout'+(tone==='info'?' info':'')}><Icon size={18}/><div>{children}</div></div>;
}
