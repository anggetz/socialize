import { Menu } from "@/components/menu";
import { Outlet } from "react-router-dom";

export default function Root() {
    return (
        <>
            <Menu />
            <div className="w-full p-5">                
                <Outlet />
            </div>
            
        </>
    )
}