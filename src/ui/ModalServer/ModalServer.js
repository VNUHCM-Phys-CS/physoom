'use client'
 
import { useRouter } from 'next/navigation';


export default function ModalServer({children,title,actionComponent}) {
    const router = useRouter();
    return (<>
    <input type="checkbox" className="modal-toggle" checked readOnly/>
      <div className="modal" role="dialog">
        <div className="modal-box">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => {
          router.back()
        }}>✕</button>
          {title&&<h3 className="font-bold text-lg">{title}</h3>}
          {children}
          {actionComponent&&<div className="modal-action">
            {actionComponent}
          </div>}
        </div>
      </div>
      </>)
  }