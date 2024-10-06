import PersonIcon from '@mui/icons-material/Person';
import GridViewIcon from '@mui/icons-material/GridView';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import GroupsIcon from '@mui/icons-material/Groups';
import { NavLink } from "react-router-dom"
import clsx from "clsx";
import styles from "./Menu.module.scss"
import { useState, useEffect } from 'react';
import { getByRoleName } from "../../services/roleService";
import { getUserByID } from "../../services/userService";
import { useNavigate } from "react-router-dom";
import { addMessageToast } from "../../store/slices/Toast";
import { removeLocalStorage } from "../../functions";
import { setUserDataLocal } from "../../store/slices/UserData";
import { verifyLogin } from "../../services/authService";
import SwitchUserModal from '../SwitchUser';
import MyProfile from '../MyProfile';
import { useDispatch, useSelector } from "react-redux";
import DnsIcon from '@mui/icons-material/Dns';
import LogoutIcon from '@mui/icons-material/Logout';
import Avatar from '@mui/material/Avatar';
import avatar from "../../assets/avatar.jpg"
import avatarAdmin from "../../assets/admin.jpg"
import { Container } from '@mui/material';
import banner from '../../assets/img/banner.png';
import RepeatIcon from '@mui/icons-material/Repeat';
import HomeIcon from '@mui/icons-material/Home';
import LockResetIcon from '@mui/icons-material/LockReset';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
function Menu() {

    const [roleList, setRoleList] = useState([]);
    const [userData1, setUserData] = useState("");
    const [openSwitchUserModal, setOpenSwitchUserModal] = useState(false);
    const [openChangeModal, setOpenChangeModal] = useState(false);
    const userData = useSelector(state => state.userDataSlice.userData)
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

    const navigate = useNavigate()
    const dispatch = useDispatch()
    const getRoleList = async (userID) => {
        try {

            const resUser = await getUserByID(userID)

            const { data: resUserData } = resUser.data
            if (resUserData) {

                dispatch(setUserDataLocal(resUserData))
                setUserData(resUserData)

                const res = await getByRoleName(resUserData?.roleName || "")
                console.log(res.data)
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

    function onOpenSwitchUser() {
        setOpenSwitchUserModal(true)
    }

    function onOpenChangePass() {
        setOpenChangeModal(true)
    }

    const handleSignOut = () => {
        removeLocalStorage()
        navigate("/login")
    }

    const linkList = [

        {
            linK: "/Users",
            name: "Người dùng",
            icon: <PersonIcon className={styles.icon} />
        },
        {
            linK: "/Groups",
            name: "Nhóm",
            icon: <GroupsIcon className={styles.icon} />
        },
        {
            linK: "/Bots",
            name: "Bots",
            icon: <DnsIcon className={styles.icon} />
        },
        {
            linK: "/BotTypes",
            name: "Loại BOT",
            icon: <PrecisionManufacturingIcon className={styles.icon} />
        },
        {
            linK: "/Spot",
            name: "Thiết lập lệnh",
            icon: <LocalMallIcon className={styles.icon} />
        },
        {
            linK: "/Strategies",
            name: "Thiết lập lệnh V3",
            icon: <MonetizationOnIcon className={styles.icon} />
        },
        {
            linK: "/Coin",
            name: "Danh sách coin",
            icon: <CurrencyExchangeIcon className={styles.icon} />
        },
        {
            linK: "/PositionV3",
            name: "Vị thế",
            icon: <ViewInArIcon className={styles.icon} />
        },
        // {
        //     linK: "/Order",
        //     name: "Order",
        //     icon: <ViewInArIcon className={styles.icon} />
        // },
    ]

    return (
        <div className='pb-20'>
            {/* <div className={styles.myProfileInfo}>
                <Avatar src={userData?.roleName !== "SuperAdmin" ? avatar : avatarAdmin} sx={{ width: 160, height: 160 }}
                />
                <p style={{
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    margin: "16px 0 0"
                }}>{userData?.userName || "User"}</p>

                <p style={{
                    fontSize: "1.1rem",
                    fontWeight: 400,
                    opacity: ".8",
                    marginTop: "6px"
                }}>{userData?.roleName}</p>
            </div> */}

            <div className="items-center flex-col w-full h-full p-[10px] bg-cover">
                {/* Background and profile */}
                <div
                    className="relative mt-1 flex h-32 w-full justify-center rounded-xl bg-cover"
                    style={{ backgroundImage: `url(${banner})` }}
                >
                    <div className="dark:!border-navy-700 absolute -bottom-12 flex h-[87px] w-[87px] items-center justify-center rounded-full border-[4px] border-white bg-pink-400">
                        <Avatar src={userData?.roleName !== "SuperAdmin" ? avatar : avatarAdmin} sx={{ width: 80, height: 80 }}
                        />
                    </div>
                </div>

                {/* Name and position */}
                <div className="mt-16 flex flex-col items-center">
                    <h4 className="text-navy-700 text-xl font-bold dark:text-white">
                        {userData?.userName || "User"}
                    </h4>
                    <h5 className="text-base font-normal text-gray-600">{userData?.roleName}</h5>
                </div>

                {/* Post followers */}
                <div className="mt-6 mb-3 flex gap-4 md:!gap-14 justify-center">
                    <div className="flex flex-col items-center justify-center">
                        <h4 className="text-navy-700 text-2xl font-bold dark:text-white">
                            17
                        </h4>
                        <p className="text-sm font-normal text-gray-600">Posts</p>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                        <h4 className="text-navy-700 text-2xl font-bold dark:text-white">
                            9.7K
                        </h4>
                        <p className="text-sm font-normal text-gray-600">Followers</p>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                        <h4 className="text-navy-700 text-2xl font-bold dark:text-white">
                            434
                        </h4>
                        <p className="text-sm font-normal text-gray-600">Following</p>
                    </div>
                </div>
            </div>


            <NavLink
                className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                to={"/"}
                key={"/"}
            >
                <HomeIcon className={styles.icon} />
                <p className={styles.sidebarItemName}>Trang chủ</p>
            </NavLink>
            {
                linkList.map(item => (
                    <div key={item.linK}>
                        {

                            roleList.includes(item.linK.replace("/", "")) && <NavLink
                                className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                                to={item.linK}>
                                {item.icon}
                                <p className={styles.sidebarItemName}>{item.name}</p>
                            </NavLink>
                        }
                    </div>
                ))
            }

            <NavLink onClick={onOpenSwitchUser}
                className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                key={"/switchuser"}
                to={"#"}
            >
                <RepeatIcon className={styles.icon} />
                <p className={styles.sidebarItemName}>Đổi tài khoản</p>
            </NavLink>

            <NavLink onClick={onOpenChangePass}
                className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                key={"/changepassword"}
                to={"#"}
            >
                <LockResetIcon className={styles.icon} />
                <p className={styles.sidebarItemName}>Thay đổi mật khẩu</p>
            </NavLink>

            <NavLink onClick={handleSignOut}
                className={({ isActive }) => clsx(styles.sidebarItem, isActive ? styles.active : undefined)}
                key={"/logout"}
                to={"/login"}
            >
                <LogoutIcon className={styles.icon} />
                <p className={styles.sidebarItemName}>Đăng xuất</p>
            </NavLink>

            {
                openSwitchUserModal && (
                    <SwitchUserModal
                        onClose={() => {
                            setOpenSwitchUserModal(false);
                        }}
                    />
                )


            }
            {
                openChangeModal && (
                    <MyProfile
                        onClose={() => {
                            setOpenChangeModal(false);
                        }}
                    />
                )
            }



            <div class="text-gray-600 body-font bg-gray-100 h-screen flex justify-center items-center h-100">
                <div class="container px-5 py-24 mx-auto">
                    <div class="flex flex-wrap -m-4 text-center">
                        <div class="p-4 sm:w-1/2 lg:w-1/3 w-full hover:scale-105 duration-500">
                            <div class=" flex items-center  justify-between p-4  rounded-lg bg-white shadow-indigo-50 shadow-md">
                                <div>
                                    <h2 class="text-gray-900 text-lg font-bold text-left">Trang chủ</h2>
                                    <h3 class="mt-2 text-xl font-bold text-yellow-500 text-left">+ 000.000 $</h3>
                                    <p class="text-sm font-semibold text-gray-400">Last Transaction</p>
                                    <NavLink
                                        to={"/"}
                                        key={"/"}
                                    >
                                        <button class="text-sm mt-6 px-4 py-2 bg-yellow-400 text-white rounded-lg  tracking-wider hover:bg-yellow-300 outline-none">Go to</button>
                                    </NavLink>

                                </div>
                                <div
                                    class="bg-gradient-to-tr from-yellow-500 to-yellow-400 w-32 h-32  rounded-full shadow-2xl shadow-yellow-400 border-white  border-dashed border-2  flex justify-center items-center ">
                                    <div>
                                        <h1 class="text-white text-2xl"> <HomeIcon className={styles.icon} /></h1>
                                    </div>
                                </div>
                            </div>

                        </div>


                        {
                            linkList.map(item => (
                                <div key={item.linK} class="p-4 sm:w-1/2 lg:w-1/3 w-full hover:scale-105 duration-500">
                                    {

                                        roleList.includes(item.linK.replace("/", "")) &&
                                        <div class=" flex items-center  justify-between p-4  rounded-lg bg-white shadow-indigo-50 shadow-md">
                                            <div>
                                                <h2 class="text-gray-900 text-lg font-bold text-left">{item.name}</h2>
                                                <h3 class="mt-2 text-xl font-bold text-yellow-500 text-left">+ 000.000 $</h3>
                                                <p class="text-sm font-semibold text-gray-400">Last Transaction</p>
                                                <NavLink
                                                    to={item.linK}>
                                                    <button class="text-sm mt-6 px-4 py-2 bg-yellow-400 text-white rounded-lg  tracking-wider hover:bg-yellow-300 outline-none">Go to</button>
                                                </NavLink>

                                            </div>
                                            <div
                                                class="bg-gradient-to-tr from-yellow-500 to-yellow-400 w-32 h-32  rounded-full shadow-2xl shadow-yellow-400 border-white  border-dashed border-2  flex justify-center items-center ">
                                                <div>
                                                    <h1 class="text-white text-2xl">  {item.icon}</h1>
                                                </div>
                                            </div>
                                        </div>

                                    }
                                </div>
                            ))
                        }








                        <div class="p-4 sm:w-1/2 lg:w-1/3 w-full hover:scale-105 duration-500">
                            <div class=" flex items-center  justify-between p-4  rounded-lg bg-white shadow-indigo-50 shadow-md">
                                <div>
                                    <h2 class="text-gray-900 text-lg font-bold">Total Ballance</h2>
                                    <h3 class="mt-2 text-xl font-bold text-orange-500 text-left">+ 150.000 ₭</h3>
                                    <p class="text-sm font-semibold text-gray-400">Last Transaction</p>
                                    <button class="text-sm mt-6 px-4 py-2 bg-orange-400  text-white rounded-lg  tracking-wider hover:bg-orange-500 outline-none">Add to cart</button>
                                </div>
                                <div
                                    class="bg-gradient-to-tr from-orange-500 to-orange-400 w-32 h-32  rounded-full shadow-2xl shadow-orange-400 border-white  border-dashed border-2  flex justify-center items-center ">
                                    <div>
                                        <h1 class="text-white text-2xl">Basic</h1>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div class="p-4 sm:w-1/2 lg:w-1/3 w-full hover:scale-105 duration-500">
                            <div class=" flex items-center  justify-between p-4  rounded-lg bg-white shadow-indigo-50 shadow-md">
                                <div>
                                    <h2 class="text-gray-900 text-lg font-bold">Total Ballance</h2>
                                    <h3 class="mt-2 text-xl font-bold text-red-500 text-left">+ 150.000 ₭</h3>
                                    <p class="text-sm font-semibold text-gray-400">Last Transaction</p>
                                    <button class="text-sm mt-6 px-4 py-2 bg-red-400  text-white rounded-lg  tracking-wider hover:bg-red-500 outline-none">Add to cart</button>
                                </div>
                                <div
                                    class="bg-gradient-to-tr from-red-500 to-red-400 w-32 h-32  rounded-full shadow-2xl shadow-red-400 border-white  border-dashed border-2  flex justify-center items-center ">
                                    <div>
                                        <h1 class="text-white text-2xl">Basic</h1>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div class="p-4 sm:w-1/2 lg:w-1/3 w-full hover:scale-105 duration-500">
                            <div class=" flex items-center  justify-between p-4  rounded-lg bg-white shadow-indigo-50 shadow-md">
                                <div>
                                    <h2 class="text-gray-900 text-lg font-bold">Total Ballance</h2>
                                    <h3 class="mt-2 text-xl font-bold text-green-500 text-left">+ 150.000 ₭</h3>
                                    <p class="text-sm font-semibold text-gray-400">Last Transaction</p>
                                    <button class="text-sm mt-6 px-4 py-2 bg-green-400  text-white rounded-lg  tracking-wider hover:bg-green-500 outline-none">Add to cart</button>
                                </div>
                                <div
                                    class="bg-gradient-to-tr from-green-500 to-green-500 w-32 h-32  rounded-full shadow-2xl shadow-green-400 border-white  border-dashed border-2  flex justify-center items-center ">
                                    <div>
                                        <h1 class="text-white text-2xl">Basic</h1>
                                    </div>
                                </div>
                            </div>

                        </div>
                        <div class="p-4 sm:w-1/2 lg:w-1/3 w-full hover:scale-105 duration-500">
                            <div class=" flex items-center  justify-between p-4  rounded-lg bg-white shadow-indigo-50 shadow-md">
                                <div>
                                    <h2 class="text-gray-900 text-lg font-bold">Total Ballance</h2>
                                    <h3 class="mt-2 text-xl font-bold text-cyan-500 text-left">+ 150.000 ₭</h3>
                                    <p class="text-sm font-semibold text-gray-400">Last Transaction</p>
                                    <button class="text-sm mt-6 px-4 py-2 bg-cyan-400  text-white rounded-lg  tracking-wider hover:bg-cyan-500 outline-none">Add to cart</button>
                                </div>
                                <div
                                    class="bg-gradient-to-tr from-cyan-500 to-cyan-400 w-32 h-32  rounded-full shadow-2xl shadow-cyan-400 border-white  border-dashed border-2  flex justify-center items-center ">
                                    <div>
                                        <h1 class="text-white text-2xl">Basic</h1>
                                    </div>
                                </div>
                            </div>

                        </div>
                        <div class="p-4 sm:w-1/2 lg:w-1/3 w-full hover:scale-105 duration-500">
                            <div class=" flex items-center  justify-between p-4  rounded-lg bg-white shadow-indigo-50 shadow-md">
                                <div>
                                    <h2 class="text-gray-900 text-lg font-bold">Total Ballance</h2>
                                    <h3 class="mt-2 text-xl font-bold text-indigo-500 text-left">+ 150.000 ₭</h3>
                                    <p class="text-sm font-semibold text-gray-400">Last Transaction</p>
                                    <button class="text-sm mt-6 px-4 py-2 bg-indigo-400 text-white rounded-lg  tracking-wider hover:bg-indigo-500 outline-none">Add to cart</button>
                                </div>
                                <div
                                    class="bg-gradient-to-tr from-indigo-500 to-indigo-400 w-32 h-32  rounded-full shadow-2xl shadow-[#304FFE] border-white  border-dashed border-2  flex justify-center items-center ">
                                    <div>
                                        <h1 class="text-white text-2xl">Basic</h1>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </div>
        </div >
    );
}

export default Menu;