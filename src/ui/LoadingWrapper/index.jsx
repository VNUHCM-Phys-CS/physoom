import { Spinner } from "@nextui-org/react"

export default function LoadingWrapper({children, isLoading}){
    return <div className="relative">
        {children}
        {isLoading&&<div className="absolute top-0 left-0 h-full w-full flex justify-center bg-neutral/50 z-10">
            <Spinner/>
        </div>}
    </div>
}