export default function({children,className}){
    return <div className={`relative w-full pt-[100%] ${className}`}>
    <div className="absolute top-0 left-0 w-full h-full">
      {children}
    </div>
  </div>
}