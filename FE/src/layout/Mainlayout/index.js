import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Heading from "./components/Heading";
import SideBar from "./components/SideBar";
import styles from "./Mainlayout.module.scss"
import { Helmet } from "react-helmet";  
import HomeIcon from '@mui/icons-material/Home';
import { memo, useMemo, useEffect, useState } from "react";
import clsx from "clsx";
import { useDispatch, useSelector } from "react-redux";
import { Breadcrumbs, dividerClasses, Typography } from "@mui/material";
import { verifyLogin } from "../../services/authService";
import { getByRoleName } from "../../services/roleService";
import { getUserByID } from "../../services/userService";
import { addMessageToast } from "../../store/slices/Toast";
import { formatNumber, removeLocalStorage } from "../../functions";
import { setUserDataLocal } from "../../store/slices/UserData";
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import DnsIcon from '@mui/icons-material/Dns';
function MainLayout({ children }) {
    const [active, setActive] = useState(0)
    const Menus = [
        { name: "Home", icon: <HomeIcon></HomeIcon>, dis: "translate-x-0", linK: "/" },
        { name: "Bots", icon: <DnsIcon></DnsIcon>, dis: "translate-x-16", linK: "/Bots" },
        { name: "Config", icon: <SettingsIcon></SettingsIcon>, dis: "translate-x-32", linK: "/Strategies" },
        { name: "Position", icon: <MonetizationOnIcon></MonetizationOnIcon>, dis: "translate-x-48", linK: "/PositionV3" },
        { name: "Menu", icon: <MenuIcon></MenuIcon>, dis: "translate-x-64", linK: "/Menu" }
    ]
    const location = useLocation()

    const dispatch = useDispatch()

    const [marginLeft, setMarginLeft] = useState(window.innerWidth <= 740 ? "" : "300px");
    const [userData, setUserData] = useState("");
    const [roleList, setRoleList] = useState([]);

    const { listBreadcrumbs } = useSelector(state => state.breadcrumbsSlice)

    const getRouteName = () => (
        location.pathname.split("/")[1]
    )

    const toggleSidebar = () => {
        setMarginLeft(marginLeft ? "" : "600px")
    }

    const handleBreadcrumbs = () => {
        return <div className="flex justify-between items-center"
            style={{
                fontWeight: 470,
                marginTop: "10px",
                padding: "10px",
                background: "#FFFFFF",
                whiteSpace: 'nowrap'
            }}>
            <div>
                <Breadcrumbs
                    aria-label="breadcrumb">
                    {
                        listBreadcrumbs.map((value, index) => {
                            if (index === 0) {
                                return <Link
                                    to="/Bots"
                                    style={{ fontSize: ".9rem", opacity: .6 }}
                                    key={index}
                                >
                                    <div style={{
                                        display: "flex"
                                    }}>
                                        <HomeIcon style={{
                                            marginRight: "5px",
                                            marginTop: "-2px"
                                        }}></HomeIcon> Main
                                    </div>

                                </Link>
                            }
                            else if (index === listBreadcrumbs.length - 1) {
                                return <div className="flex justify-between items-center">
                                    <div>
                                        <Typography
                                            color="text.primary"
                                            style={{
                                                color: "black",
                                                opacity: ".8",

                                            }}
                                            key={index}
                                        >{value}</Typography>
                                    </div>

                                </div>
                            }
                            else {
                                return <Link
                                    to={`/${value}`}
                                    style={{ opacity: .6 }}
                                    key={index}
                                >
                                    {value}
                                </Link>
                            }
                        })
                    }

                </Breadcrumbs>
            </div>

            <div>
                {
                    routeName === "Strategies" &&
                    <span className="font-sans text-lg font-bold" style={{ color: `var(--textMoney)` }}>{formatNumber(Number.parseFloat((+totalFuture || 0)))} $</span>
                }
            </div>
        </div>
    }

    const navigate = useNavigate()

    const handleVerifyLogin = async () => {
        try {
            const res = await verifyLogin()
            const userData = res.data.data
            getRoleList(userData._id)
        } catch (error) {
            removeLocalStorage()
            navigate("/login")
        }
    }

    const getRoleList = async (userID) => {
        try {

            const resUser = await getUserByID(userID)

            const { data: resUserData } = resUser.data
            if (resUserData) {

                dispatch(setUserDataLocal(resUserData))
                setUserData(resUserData)

                const res = await getByRoleName(resUserData?.roleName || "")
                const { data: resData } = res.data

                setRoleList(resData.roleList || [])
            }

        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get Role User Error",
            }))
            removeLocalStorage()
            navigate("/login")
        }
    }

    useEffect(() => {
        handleVerifyLogin()
    }, []);

    useEffect(() => {
        window.innerWidth <= 740 && setMarginLeft("")
        window.scrollTo(0, 0)
    }, [location]);

    const routeName = useMemo(() => {
        return location.pathname.split("/")[1]
    }, [location])

    const totalFuture = useSelector(state => state.totalFutureSlice.total)

    return (
        <div className={styles.mainlayout}
            style={{
                "--marginLeft": marginLeft
            }}
        >
            {/* <Helmet title={`${getRouteName() || "Dashboard"} | WinBot`} /> */}
            {/* hearde */}
            <div className={styles.heading}>
                <Heading
                    toggleSidebar={toggleSidebar}
                    userData={userData}
                />
            </div>
            {/* end hearder */}
            <div
                className={styles.body}
                onClick={() => {
                    window.innerWidth <= 740 && setMarginLeft("")
                }}>
                {/* <SideBar
                    openSidebar={marginLeft}
                    roleList={roleList}
                /> */}
                {/* main */}
                <div className={styles.content}>
                    <div className={styles.contentMain}>
                        <div className={styles.title}>
                            {
                                <div className={`${location.pathname !== "/" && location.pathname !== "menu" ? "pt-0" : ""} d-flex `} role="presentation"  >
                                    {location.pathname !== "/" && location.pathname.toLowerCase() !== "/menu" && (
                                        handleBreadcrumbs()

                                    )}

                                </div>

                            }
                        </div>
                        <div style={{
                            backgroundColor: "white",
                            padding: "12px",
                            borderRadius: "5px",
                            boxShadow: "0px 0 30px rgba(1, 41, 112, 0.1)",
                            minHeight: "90vh",

                        }}>
                            <Outlet />
                        </div>
                    </div>
                    <div className={styles.footer}>

                    </div>
                </div>
                {/* end main */}

            </div>

            <div className={styles.footerLink}>
                <div className='w-100 h-100 bg-red mt-10'>
                    <div className="bg-slate-500 max-h-[4.4rem] px-6 rounded-t-xl" style={{ background: `var(--headerColor)` }}>
                        <ul className="flex relative ">
                            <span
                                className={`duration-500 ${Menus[active].dis} border-4 border-white h-16 w-16 absolute
                                  -top-5 rounded-full text-center
                                  pt-3`} style={{ background: `var(--activeFooter)` }}>
                                <span className="text-xl duration-500 -mt-6 text-white">{Menus[active].icon}</span>
                                <span
                                    className="w-3.5 h-3.5 bg-transparent absolute top-4 -left-[18px] 
                                                 rounded-tr-[11px] shadow-myShadow1"
                                ></span>
                                <span
                                    className="w-3.5 h-3.5 bg-transparent absolute top-4 -right-[18px] 
                                             rounded-tl-[11px] shadow-myShadow2"
                                ></span>
                            </span>
                            {Menus.map((menu, i) => (
                                <li key={i} className="w-16">
                                    <NavLink
                                        //className="flex flex-col text-center pt-6"
                                        className={({ isActive }) => clsx("flex flex-col text-center pt-6")}

                                        onClick={() => setActive(i)}
                                        to={menu.linK}
                                        key={menu.linK}
                                    >
                                        <span
                                            className={`text-xl cursor-pointer duration-500 text-white
                                                        ${i === active && "-mt-6 text-white"}`}
                                        >
                                            {menu.icon}
                                        </span>

                                        <span className={`${active === i
                                            ? "translate-y-4 duration-700 opacity-100 text-white"
                                            : "opacity-0 translate-y-10 text-white"
                                            } `}>
                                            {menu.name}
                                        </span>
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

        </div>
    );
}

export default memo(MainLayout);